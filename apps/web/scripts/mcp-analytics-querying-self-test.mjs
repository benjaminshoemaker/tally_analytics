import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { seedScenario } from './seed-e2e-scenario.mjs';

const { Client: PgClient } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const tmpRoot = path.join(repoRoot, 'tmp', 'mcp-analytics-querying-self-test');
const fixturesDir = path.join(tmpRoot, 'fixtures');
const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/postgres';
const mcpResourceUrl = 'http://localhost:3000/api/mcp';
const mcpScope = 'mcp:install';

const scenarioIds = [
  'mcp-active-with-signup-events',
  'mcp-active-with-events',
  'mcp-active-no-events',
  'mcp-multiple-projects',
];

const analyticsTools = [
  'list_projects',
  'resolve_project',
  'get_project_overview',
  'get_live_events',
  'get_sessions_summary',
  'get_top_pages',
  'get_top_referrers',
  'list_events',
  'get_event_schema',
  'get_paths_to_event',
  'suggest_next_events',
];

function loadEnv() {
  for (const candidate of [
    path.join(appDir, '.env.local'),
    path.join(appDir, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ]) {
    if (fs.existsSync(candidate)) dotenv.config({ path: candidate });
  }
}

function parseArgs(argv) {
  const args = { keep: false, help: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying [--keep]');
  console.log('');
  console.log('Runs the local MCP analytics querying self-test against seeded E2E scenarios.');
}

function log(message) {
  console.error(`[mcp-analytics-querying] ${message}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'pipe',
  });

  if (!options.capture) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if ((result.status ?? 1) !== 0) {
    const stdout = result.stdout ? `\nstdout:\n${result.stdout}` : '';
    const stderr = result.stderr ? `\nstderr:\n${result.stderr}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${stdout}${stderr}`);
  }

  return result.stdout ?? '';
}

function spawnProcess(name, command, args, options = {}) {
  log(`starting ${name}`);
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));

  return { name, child };
}

async function waitForProcessExit(processInfo) {
  const { child } = processInfo;
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is already in use`)));
    server.once('listening', () => {
      server.close(() => resolve());
    });
    server.listen(port, '127.0.0.1');
  });
}

async function waitForHttp(url, options = {}) {
  const deadline = Date.now() + (options.timeoutMs ?? 60_000);
  let lastError = '';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: options.method ?? 'GET' });
      if (response.status < 500) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function assertDescendant(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) return;
  throw new Error(`Unsafe path outside ${parentPath}: ${childPath}`);
}

function resetWorkspace() {
  assertDescendant(tmpRoot, path.join(repoRoot, 'tmp'));
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(fixturesDir, { recursive: true });
}

function hashOAuthSecret(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function captureExistingOAuthClients(databaseUrl) {
  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query('SELECT client_id FROM oauth_clients');
    return new Set(result.rows.map((row) => row.client_id));
  } finally {
    await client.end();
  }
}

async function createLocalOAuthAccessToken(databaseUrl, userId) {
  const clientId = `mcp_analytics_self_test_${crypto.randomBytes(8).toString('hex')}`;
  const accessToken = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO oauth_clients (
          client_id,
          client_name,
          redirect_uris,
          grant_types,
          response_types,
          scope,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        clientId,
        'MCP Analytics Querying Self-Test',
        ['http://localhost:3000/mcp-analytics-querying-self-test/callback'],
        ['authorization_code', 'refresh_token'],
        ['code'],
        mcpScope,
        now.toISOString(),
        now.toISOString(),
      ]
    );
    await client.query(
      `
        INSERT INTO oauth_access_tokens (
          token_hash,
          client_id,
          user_id,
          scope,
          resource,
          expires_at,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        hashOAuthSecret(accessToken),
        clientId,
        userId,
        mcpScope,
        mcpResourceUrl,
        expiresAt.toISOString(),
        now.toISOString(),
      ]
    );
    await client.query('COMMIT');
    return { clientId, accessToken };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function cleanupDatabase(databaseUrl, seededScenarios, existingClientIds) {
  if (seededScenarios.length === 0) return;

  const userIds = seededScenarios.map((scenario) => scenario.user.id);
  const projectIds = seededScenarios.flatMap((scenario) => scenario.projects.map((project) => project.id));
  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM oauth_refresh_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM oauth_access_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM oauth_authorization_codes WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM regenerate_requests WHERE user_id = ANY($1::uuid[]) OR project_id = ANY($2::varchar[])', [userIds, projectIds]);
    await client.query('DELETE FROM projects WHERE user_id = ANY($1::uuid[]) OR id = ANY($2::varchar[])', [userIds, projectIds]);
    await client.query('DELETE FROM github_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);

    if (existingClientIds) {
      const keep = Array.from(existingClientIds);
      if (keep.length > 0) {
        await client.query('DELETE FROM oauth_clients WHERE NOT (client_id = ANY($1::varchar[]))', [keep]);
      } else {
        await client.query('DELETE FROM oauth_clients');
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function withMcpClient(accessToken, fn) {
  const client = new McpClient({ name: 'mcp-analytics-querying-self-test', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(mcpResourceUrl), {
    requestInit: {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  });

  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

function structured(result) {
  return result.structuredContent ?? {};
}

function assertStatus(result, expectedStatus, label) {
  const content = structured(result);
  if (content.status !== expectedStatus) {
    throw new Error(`${label} expected ${expectedStatus}, received ${JSON.stringify(content)}`);
  }
  return content;
}

function assertIncludesTool(tools, name) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing MCP analytics tool: ${name}`);
  if (tool.annotations?.readOnlyHint !== true || tool.annotations?.openWorldHint !== false) {
    throw new Error(`Tool ${name} is missing read-only annotations`);
  }
  return tool;
}

function repoContextForSignupScenario() {
  return {
    repo: {
      name: 'mcp-signup-demo',
      gitRemote: 'git@github.com:fast-pr-sandbox/mcp-signup-demo.git',
      workspaceRoot: '.',
      appRoot: '.',
      packageManager: 'pnpm',
    },
  };
}

function broadAmbiguousRepoContext() {
  return {
    repo: {
      name: 'ambiguous-demo',
      workspaceRoot: '.',
      appRoot: '.',
      packageManager: 'pnpm',
    },
  };
}

async function countProjects(databaseUrl, userId) {
  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query('SELECT count(*)::int AS count FROM projects WHERE user_id = $1', [userId]);
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  loadEnv();
  const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
  const summary = { ok: false, stages: [] };
  const context = {
    databaseUrl,
    scenarios: new Map(),
    tokens: new Map(),
    existingOAuthClientIds: null,
    processes: [],
    keep: args.keep,
  };

  async function stage(name, fn) {
    const startedAt = Date.now();
    log(`stage: ${name}`);
    try {
      const result = await fn();
      summary.stages.push({ name, status: 'passed', durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      summary.stages.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  try {
    await stage('preflight', async () => {
      if (databaseUrl !== defaultDatabaseUrl) {
        throw new Error(`DATABASE_URL must be ${defaultDatabaseUrl} for this local self-test.`);
      }
      run('pnpm', ['--version'], { capture: true });
      await assertPortFree(3000);

      const client = new PgClient({ connectionString: databaseUrl });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      run('pnpm', ['--filter', 'web', 'db:push']);
      context.existingOAuthClientIds = await captureExistingOAuthClients(databaseUrl);
      resetWorkspace();
    });

    await stage('seed-local-state', async () => {
      for (const scenarioId of scenarioIds) {
        const result = await seedScenario(scenarioId, { databaseUrl, fixturesDir });
        context.scenarios.set(scenarioId, result.scenario);
        const token = await createLocalOAuthAccessToken(databaseUrl, result.scenario.user.id);
        context.tokens.set(scenarioId, token.accessToken);
      }
    });

    await stage('start-services', async () => {
      const env = {
        DATABASE_URL: databaseUrl,
        E2E_TEST_MODE: '1',
        E2E_ANALYTICS_FIXTURE_DIR: fixturesDir,
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      };
      context.processes.push(spawnProcess('web', 'pnpm', ['--filter', 'web', 'dev:e2e'], { env }));
      await waitForHttp(mcpResourceUrl);
    });

    await stage('tools-list', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const result = await client.listTools();
        for (const name of analyticsTools) assertIncludesTool(result.tools, name);
      });
    });

    await stage('usage-summary', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const resolved = assertStatus(
          await client.callTool({ name: 'resolve_project', arguments: repoContextForSignupScenario() }),
          'ok',
          'resolve_project'
        );
        if (resolved.project?.id !== 'proj_mcp_signup') {
          throw new Error(`Unexpected resolved project: ${JSON.stringify(resolved)}`);
        }

        const overview = assertStatus(
          await client.callTool({
            name: 'get_project_overview',
            arguments: { projectId: 'proj_mcp_signup', period: '30d' },
          }),
          'ok',
          'get_project_overview'
        );
        if (!overview.dashboardUrls?.overview || !overview.provenance?.dataWindow) {
          throw new Error(`Overview result is missing dashboard URLs or data window: ${JSON.stringify(overview)}`);
        }
      });
    });

    await stage('data-arrival', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const live = assertStatus(
          await client.callTool({
            name: 'get_live_events',
            arguments: { projectId: 'proj_mcp_signup', limit: 5 },
          }),
          'ok',
          'get_live_events'
        );
        if (!Array.isArray(live.events) || live.events.length === 0) {
          throw new Error(`Live events did not include events: ${JSON.stringify(live)}`);
        }
      });
    });

    await stage('event-discovery-schema', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const events = assertStatus(
          await client.callTool({
            name: 'list_events',
            arguments: { projectId: 'proj_mcp_signup', period: '30d' },
          }),
          'ok',
          'list_events'
        );
        if (!events.events?.some((event) => event.eventName === 'signup_completed')) {
          throw new Error(`signup_completed was not discovered: ${JSON.stringify(events)}`);
        }

        const schema = assertStatus(
          await client.callTool({
            name: 'get_event_schema',
            arguments: { projectId: 'proj_mcp_signup', period: '30d', eventName: 'signup_completed' },
          }),
          'ok',
          'get_event_schema'
        );
        if (!schema.event?.properties?.some((property) => property.name === 'signupMethod')) {
          throw new Error(`signup_completed schema is missing signupMethod: ${JSON.stringify(schema)}`);
        }
      });
    });

    await stage('signup-path', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const paths = assertStatus(
          await client.callTool({
            name: 'get_paths_to_event',
            arguments: {
              projectId: 'proj_mcp_signup',
              period: '30d',
              targetEvent: 'signup_completed',
              maxSteps: 5,
              limit: 10,
            },
          }),
          'ok',
          'get_paths_to_event'
        );
        if (!Array.isArray(paths.paths) || paths.paths.length === 0 || !paths.dashboardUrls?.overview) {
          throw new Error(`Signup path result is missing paths or dashboard URLs: ${JSON.stringify(paths)}`);
        }
      });
    });

    await stage('missing-signup-recommendation', async () => {
      const accessToken = context.tokens.get('mcp-active-with-events');
      await withMcpClient(accessToken, async (client) => {
        const recommendations = assertStatus(
          await client.callTool({
            name: 'suggest_next_events',
            arguments: {
              projectId: 'proj_mcp_events',
              period: '30d',
              goal: 'Understand signup funnel dropoff',
            },
          }),
          'partial_data',
          'suggest_next_events'
        );
        if (
          recommendations.createsPendingTasks !== false ||
          !recommendations.recommendations?.some((event) => event.eventName === 'signup_completed')
        ) {
          throw new Error(`Signup recommendations were incomplete: ${JSON.stringify(recommendations)}`);
        }
      });
    });

    await stage('no-events', async () => {
      const accessToken = context.tokens.get('mcp-active-no-events');
      await withMcpClient(accessToken, async (client) => {
        const overview = assertStatus(
          await client.callTool({
            name: 'get_project_overview',
            arguments: { projectId: 'proj_mcp_empty', period: '30d' },
          }),
          'no_events',
          'empty overview'
        );
        if (!overview.dashboardUrls?.project) {
          throw new Error(`No-events overview is missing dashboard URLs: ${JSON.stringify(overview)}`);
        }
      });
    });

    await stage('ownership-guard', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const result = assertStatus(
          await client.callTool({
            name: 'get_project_overview',
            arguments: { projectId: 'proj_mcp_events', period: '30d' },
          }),
          'project_not_found',
          'foreign project overview'
        );
        if (!result.summary) throw new Error(`Ownership guard returned no summary: ${JSON.stringify(result)}`);
      });
    });

    await stage('resolve-ambiguity', async () => {
      const scenario = context.scenarios.get('mcp-multiple-projects');
      const beforeCount = await countProjects(databaseUrl, scenario.user.id);
      const accessToken = context.tokens.get('mcp-multiple-projects');
      await withMcpClient(accessToken, async (client) => {
        assertStatus(
          await client.callTool({ name: 'resolve_project', arguments: broadAmbiguousRepoContext() }),
          'multiple_matches',
          'ambiguous resolve_project'
        );
      });
      const afterCount = await countProjects(databaseUrl, scenario.user.id);
      if (afterCount !== beforeCount) {
        throw new Error(`resolve_project changed project count from ${beforeCount} to ${afterCount}`);
      }
    });

    await stage('invalid-inputs', async () => {
      const accessToken = context.tokens.get('mcp-active-with-signup-events');
      await withMcpClient(accessToken, async (client) => {
        const checks = [
          ['get_project_overview', { projectId: 'proj_mcp_signup', period: '14d' }, 'invalid_period'],
          ['get_live_events', { projectId: 'proj_mcp_signup', limit: 'many' }, 'invalid_limit'],
          ['get_live_events', { projectId: 'proj_mcp_signup', since: 'not-a-date' }, 'invalid_since'],
          ['suggest_next_events', { projectId: 'proj_mcp_signup', period: '30d', goal: '' }, 'invalid_goal'],
          ['get_event_schema', { projectId: 'proj_mcp_signup', period: '30d', eventName: '' }, 'invalid_event_name'],
          [
            'get_paths_to_event',
            { projectId: 'proj_mcp_signup', period: '30d', targetEvent: 'signup_completed', maxSteps: 99 },
            'invalid_steps',
          ],
          ['resolve_project', { repo: { name: 'repo', workspaceRoot: '.', appRoot: '../outside' } }, 'invalid_repo_context'],
        ];

        for (const [name, args, expectedStatus] of checks) {
          assertStatus(
            await client.callTool({ name, arguments: args }),
            expectedStatus,
            `${name} invalid input`
          );
        }
      });
    });

    summary.ok = true;
  } catch {
    summary.ok = false;
  } finally {
    try {
      await stage('cleanup', async () => {
        for (const processInfo of context.processes.reverse()) {
          await waitForProcessExit(processInfo);
        }

        await cleanupDatabase(databaseUrl, Array.from(context.scenarios.values()), context.existingOAuthClientIds);

        if (!context.keep) {
          assertDescendant(tmpRoot, path.join(repoRoot, 'tmp'));
          fs.rmSync(tmpRoot, { recursive: true, force: true });
        }
      });
    } catch {
      summary.ok = false;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
