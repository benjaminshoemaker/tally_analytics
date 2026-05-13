import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';
import { chromium } from '@playwright/test';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { seedScenario } from './seed-e2e-scenario.mjs';

const { Client: PgClient } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const tmpRoot = path.join(repoRoot, 'tmp', 'mcp-pending-tasks-self-test');
const fixturesDir = path.join(tmpRoot, 'fixtures');
const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/postgres';
const appUrl = 'http://localhost:3000';
const mcpResourceUrl = `${appUrl}/api/mcp`;
const taskScope = 'mcp:tasks';
const installScope = 'mcp:install';

const scenarioIds = [
  'dashboard-task-question-answered',
  'dashboard-task-question-partial',
  'dashboard-task-question-cannot-answer',
  'dashboard-task-question-unsupported',
  'dashboard-task-duplicate-existing',
  'dashboard-task-agent-implemented-awaiting-deploy',
  'dashboard-task-production-verified',
  'dashboard-task-production-missing-property',
  'mcp-pending-analytics-task',
  'mcp-pending-analytics-task-ambiguous-project',
];

const requiredTaskTools = [
  'list_pending_analytics_tasks',
  'get_analytics_task_context',
  'report_analytics_task_status',
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
    if (arg === '--keep') args.keep = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:mcp-pending-tasks [--keep]');
  console.log('');
  console.log('Runs the dashboard pending-task flow harness through browser UI and MCP task tools.');
}

function redactSecrets(value) {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\b[A-Fa-f0-9]{64}\b/g, '[redacted-hash]');
}

function log(message) {
  process.stderr.write(`[mcp-pending-tasks] ${redactSecrets(message)}\n`);
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
    if (result.stdout) process.stderr.write(redactSecrets(result.stdout));
    if (result.stderr) process.stderr.write(redactSecrets(result.stderr));
  }

  if ((result.status ?? 1) !== 0) {
    const stdout = result.stdout ? `\nstdout:\n${redactSecrets(result.stdout)}` : '';
    const stderr = result.stderr ? `\nstderr:\n${redactSecrets(result.stderr)}` : '';
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

  child.stdout.on('data', (chunk) => process.stderr.write(`[${name}] ${redactSecrets(chunk.toString())}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${redactSecrets(chunk.toString())}`));

  return { name, child };
}

async function waitForProcessExit(processInfo) {
  if (!processInfo) return;
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
    server.once('listening', () => server.close(() => resolve()));
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

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function assertLocalDatabase(databaseUrl) {
  if (isLocalDatabaseUrl(databaseUrl)) return;
  if (process.env.E2E_ALLOW_REMOTE_SEED === '1') return;
  throw new Error(`Refusing to use a non-local database: ${databaseUrl}`);
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

async function createLocalOAuthAccessToken(databaseUrl, userId, scope) {
  const clientId = `mcp_pending_task_self_test_${crypto.randomBytes(6).toString('hex')}`;
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
        'MCP Pending Task Self-Test',
        ['http://localhost:3000/mcp-pending-task-self-test/callback'],
        ['authorization_code', 'refresh_token'],
        ['code'],
        scope,
        now.toISOString(),
        now.toISOString(),
      ],
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
        scope,
        mcpResourceUrl,
        expiresAt.toISOString(),
        now.toISOString(),
      ],
    );
    await client.query('COMMIT');
    return accessToken;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function cleanupDatabase(databaseUrl, scenarios, existingClientIds) {
  if (scenarios.length === 0) return;
  const userIds = scenarios.map((scenario) => scenario.user.id);
  const projectIds = scenarios.flatMap((scenario) => scenario.projects.map((project) => project.id));

  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM oauth_refresh_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM oauth_access_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query('DELETE FROM oauth_authorization_codes WHERE user_id = ANY($1::uuid[])', [userIds]);
    await client.query(
      'DELETE FROM analytics_task_status_events WHERE user_id = ANY($1::uuid[]) OR project_id = ANY($2::varchar[])',
      [userIds, projectIds],
    );
    await client.query(
      'DELETE FROM analytics_tasks WHERE user_id = ANY($1::uuid[]) OR project_id = ANY($2::varchar[])',
      [userIds, projectIds],
    );
    await client.query(
      'DELETE FROM regenerate_requests WHERE user_id = ANY($1::uuid[]) OR project_id = ANY($2::varchar[])',
      [userIds, projectIds],
    );
    await client.query('DELETE FROM projects WHERE user_id = ANY($1::uuid[]) OR id = ANY($2::varchar[])', [
      userIds,
      projectIds,
    ]);
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
  const client = new McpClient({ name: 'mcp-pending-tasks-self-test', version: '0.1.0' });
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
  const payload = structured(result);
  if (payload.status !== expectedStatus) {
    throw new Error(`${label} expected ${expectedStatus}, received ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assertTaskToolRegistered(tools, toolName) {
  const tool = tools.find((candidate) => candidate.name === toolName);
  if (!tool) throw new Error(`Missing MCP analytics task tool: ${toolName}`);
  return tool;
}

async function withDashboardPage(params) {
  const context = await params.browser.newContext({ baseURL: appUrl, viewport: { width: 1365, height: 900 } });
  try {
    const loginResponse = await context.request.post(`${appUrl}/api/auth/e2e-login`, {
      data: { userId: params.userId },
    });
    if (!loginResponse.ok()) {
      throw new Error(`Dashboard login failed: ${loginResponse.status()}`);
    }

    const page = await context.newPage();
    await page.goto(`/projects/${params.projectId}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Ask Tally');
    return await params.run(page);
  } finally {
    await context.close();
  }
}

async function askDashboardQuestion(page, question) {
  const panel = page.locator('section', {
    has: page.getByRole('heading', { name: 'Ask Tally' }),
  }).first();
  await panel.getByTestId('ask-tally-input').fill(question);
  await panel.getByRole('button', { name: 'Ask', exact: true }).click();
}

async function assertVisibleText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible' });
}

async function assertHiddenHeading(page, heading) {
  const locator = page.getByRole('heading', { name: heading });
  const count = await locator.count();
  if (count === 0) return;
  if (await locator.first().isVisible()) {
    throw new Error(`Heading should not be visible: ${heading}`);
  }
}

function scenarioFixturePath(scenarioId) {
  return path.join(fixturesDir, scenarioId, 'events.json');
}

function appendScenarioFixtureEvent(scenarioId, event) {
  const fixturePath = scenarioFixturePath(scenarioId);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Missing scenario fixture: ${fixturePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.events)) {
    throw new Error(`Invalid fixture payload for ${scenarioId}`);
  }

  parsed.events.push(event);
  fs.writeFileSync(fixturePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
}

function scenarioProjectId(scenario) {
  const project = scenario.projects[0];
  if (!project) throw new Error(`Scenario ${scenario.id} is missing a project`);
  return project.id;
}

function tokenFor(context, scenarioId, scopeKey) {
  const token = context.tokens.get(`${scenarioId}:${scopeKey}`);
  if (!token) throw new Error(`Missing token for ${scenarioId}:${scopeKey}`);
  return token;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  loadEnv();
  const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
  const summary = { ok: false, flow: 'dashboard_pending_tasks', stages: [] };
  const context = {
    databaseUrl,
    scenarios: new Map(),
    tokens: new Map(),
    existingOAuthClientIds: null,
    processes: [],
    browser: null,
    keep: args.keep,
  };

  async function stage(name, fn) {
    const startedAt = Date.now();
    log(`stage: ${name}`);
    try {
      const details = await fn();
      summary.stages.push({
        name,
        status: 'passed',
        durationMs: Date.now() - startedAt,
        ...(details ? { details } : {}),
      });
      return details;
    } catch (error) {
      summary.stages.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: redactSecrets(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  }

  try {
    await stage('preflight', async () => {
      assertLocalDatabase(databaseUrl);
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

    await stage('seed-state', async () => {
      for (const scenarioId of scenarioIds) {
        const result = await seedScenario(scenarioId, { databaseUrl, fixturesDir });
        context.scenarios.set(scenarioId, result.scenario);
        const tasksToken = await createLocalOAuthAccessToken(databaseUrl, result.scenario.user.id, taskScope);
        const installToken = await createLocalOAuthAccessToken(databaseUrl, result.scenario.user.id, installScope);
        context.tokens.set(`${scenarioId}:tasks`, tasksToken);
        context.tokens.set(`${scenarioId}:install`, installToken);
      }
      return { scenariosSeeded: scenarioIds.length };
    });

    await stage('start-services', async () => {
      const env = {
        DATABASE_URL: databaseUrl,
        E2E_TEST_MODE: '1',
        E2E_ANALYTICS_FIXTURE_DIR: fixturesDir,
        NEXT_PUBLIC_APP_URL: appUrl,
      };
      context.processes.push(spawnProcess('web', 'pnpm', ['--filter', 'web', 'dev:e2e'], { env }));
      await waitForHttp(mcpResourceUrl);
    });

    await stage('start-browser', async () => {
      context.browser = await chromium.launch();
    });

    await stage('dashboard-answered', async () => {
      const scenario = context.scenarios.get('dashboard-task-question-answered');
      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId: scenarioProjectId(scenario),
        run: async (page) => {
          await askDashboardQuestion(page, 'How many users visited pricing this week?');
          await assertVisibleText(page, 'Pricing page visits are available for the selected');
          await assertVisibleText(page, 'Pricing page views');
          await assertHiddenHeading(page, 'Proposed task');
        },
      });
    });

    await stage('dashboard-confirm-task', async () => {
      const scenario = context.scenarios.get('dashboard-task-question-partial');
      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId: scenarioProjectId(scenario),
        run: async (page) => {
          await askDashboardQuestion(page, 'How many users finished onboarding after visiting pricing?');
          await assertVisibleText(page, 'Pricing visits are visible, but onboarding completion is not fully instrumented yet.');
          await page.getByRole('heading', { name: 'Proposed task' }).waitFor({ state: 'visible' });
          await page.getByTestId('add-task-to-queue').click();
          await assertVisibleText(page, 'Track onboarding completion');
          await page.getByRole('button', { name: 'Delete' }).first().click();
          await assertVisibleText(page, 'No tasks yet.');
        },
      });
    });

    await stage('dashboard-cannot-answer', async () => {
      const scenario = context.scenarios.get('dashboard-task-question-cannot-answer');
      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId: scenarioProjectId(scenario),
        run: async (page) => {
          await askDashboardQuestion(page, 'How many people clicked the upgrade CTA?');
          await assertVisibleText(page, 'Upgrade CTA click tracking has not been observed for this project yet.');
          await page.getByRole('heading', { name: 'Proposed task' }).waitFor({ state: 'visible' });
          await page.getByTestId('dismiss-task-draft').click();
          await assertHiddenHeading(page, 'Proposed task');
        },
      });
    });

    await stage('dashboard-unsupported', async () => {
      const scenario = context.scenarios.get('dashboard-task-question-unsupported');
      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId: scenarioProjectId(scenario),
        run: async (page) => {
          await askDashboardQuestion(page, 'Track everything users do in the app');
          await assertVisibleText(page, 'broader than the current dashboard task flow supports');
          await assertHiddenHeading(page, 'Proposed task');
        },
      });
    });

    await stage('dashboard-duplicate-existing', async () => {
      const scenario = context.scenarios.get('dashboard-task-duplicate-existing');
      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId: scenarioProjectId(scenario),
        run: async (page) => {
          await askDashboardQuestion(page, 'How many users finished onboarding after visiting pricing?');
          await assertVisibleText(page, 'Pricing visits are visible, but onboarding completion is not fully instrumented yet.');
          await assertVisibleText(page, 'Track onboarding completion');
          await assertHiddenHeading(page, 'Proposed task');
        },
      });
    });

    await stage('mcp-tools-list', async () => {
      const accessToken = tokenFor(context, 'mcp-pending-analytics-task', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const result = await client.listTools();
        for (const name of requiredTaskTools) assertTaskToolRegistered(result.tools, name);
      });
    });

    await stage('mcp-task-context', async () => {
      const accessToken = tokenFor(context, 'mcp-pending-analytics-task', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const list = assertStatus(
          await client.callTool({
            name: 'list_pending_analytics_tasks',
            arguments: { projectId: 'proj_mcp_task' },
          }),
          'ready',
          'list_pending_analytics_tasks',
        );
        const rows = Array.isArray(list.tasks) ? list.tasks : [];
        const statuses = new Set(rows.map((row) => row.status));
        if (!statuses.has('pending') || !statuses.has('in_progress')) {
          throw new Error(`Expected pending and in_progress tasks: ${JSON.stringify(list)}`);
        }

        const contextResult = assertStatus(
          await client.callTool({
            name: 'get_analytics_task_context',
            arguments: { taskId: 'task_mcp_pending', projectId: 'proj_mcp_task' },
          }),
          'ready',
          'get_analytics_task_context',
        );

        if (contextResult.context?.taskId !== 'task_mcp_pending') {
          throw new Error(`Unexpected task context payload: ${JSON.stringify(contextResult)}`);
        }
      });
    });

    await stage('agent-status-idempotency', async () => {
      const accessToken = tokenFor(context, 'mcp-pending-analytics-task', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const first = assertStatus(
          await client.callTool({
            name: 'report_analytics_task_status',
            arguments: {
              taskId: 'task_mcp_pending',
              projectId: 'proj_mcp_task',
              status: 'in_progress',
              changedFiles: ['apps/web/components/tally-analytics.tsx'],
            },
          }),
          'ready',
          'report_analytics_task_status first',
        );
        if (first.transition !== 'transitioned') {
          throw new Error(`Expected transitioned result: ${JSON.stringify(first)}`);
        }

        const second = assertStatus(
          await client.callTool({
            name: 'report_analytics_task_status',
            arguments: {
              taskId: 'task_mcp_pending',
              projectId: 'proj_mcp_task',
              status: 'in_progress',
              changedFiles: ['apps/web/components/tally-analytics.tsx'],
            },
          }),
          'ready',
          'report_analytics_task_status second',
        );
        if (second.transition !== 'idempotent') {
          throw new Error(`Expected idempotent transition: ${JSON.stringify(second)}`);
        }
      });
    });

    await stage('test-event-non-verification', async () => {
      const accessToken = tokenFor(context, 'dashboard-task-agent-implemented-awaiting-deploy', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const result = assertStatus(
          await client.callTool({
            name: 'report_analytics_task_status',
            arguments: {
              taskId: 'task_test_event',
              projectId: 'proj_dtask_await',
              status: 'implemented_locally',
              localEventEvidence: [{ eventName: 'upgrade_cta_clicked', properties: { surface: 'hero' } }],
            },
          }),
          'ready',
          'test-only verification',
        );

        if (result.verification !== 'awaiting_deploy' || result.task?.status !== 'awaiting_deploy') {
          throw new Error(`Expected awaiting_deploy for test-only event: ${JSON.stringify(result)}`);
        }
      });
    });

    await stage('dashboard-awaiting-deploy-ui', async () => {
      const scenario = context.scenarios.get('dashboard-task-agent-implemented-awaiting-deploy');
      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId: scenarioProjectId(scenario),
        run: async (page) => {
          await assertVisibleText(page, 'Awaiting deploy');
          await assertVisibleText(page, 'Waiting for matching production telemetry.');
        },
      });
    });

    await stage('dashboard-production-event-relay', async () => {
      const scenarioId = 'dashboard-task-agent-implemented-awaiting-deploy';
      const scenario = context.scenarios.get(scenarioId);
      const projectId = scenarioProjectId(scenario);
      const eventTimestamp = new Date(Date.now() + 60_000).toISOString();

      appendScenarioFixtureEvent(scenarioId, {
        project_id: projectId,
        session_id: 'sess_dtask_await_relay_001',
        event_type: 'upgrade_cta_clicked',
        timestamp: eventTimestamp,
        url: 'https://awaiting-demo.test/pricing',
        path: '/pricing',
        referrer: '',
        visitor_id: 'visitor_dtask_await_relay_001',
        is_returning: 1,
        environment: 'production',
        event_properties: {
          surface: 'hero',
          plan: 'pro',
        },
      });

      await withDashboardPage({
        browser: context.browser,
        userId: scenario.user.id,
        projectId,
        run: async (page) => {
          await assertVisibleText(page, 'Verified');
          await assertVisibleText(page, 'Verified from production telemetry.');
        },
      });

      return {
        injectedScenario: scenarioId,
        injectedTimestamp: eventTimestamp,
      };
    });

    await stage('production-verification', async () => {
      const accessToken = tokenFor(context, 'dashboard-task-production-verified', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const result = assertStatus(
          await client.callTool({
            name: 'report_analytics_task_status',
            arguments: {
              taskId: 'task_prod_verify',
              projectId: 'proj_dtask_ver',
              status: 'implemented_locally',
              implementationFingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            },
          }),
          'ready',
          'production verification',
        );

        if (result.verification !== 'verified' || result.task?.status !== 'verified') {
          throw new Error(`Expected verified task after production event: ${JSON.stringify(result)}`);
        }
      });
    });

    await stage('missing-property-non-verification', async () => {
      const accessToken = tokenFor(context, 'dashboard-task-production-missing-property', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const report = assertStatus(
          await client.callTool({
            name: 'report_analytics_task_status',
            arguments: {
              taskId: 'task_missing_prop',
              projectId: 'proj_dtask_prop',
              status: 'implemented_locally',
            },
          }),
          'ready',
          'missing-property verification',
        );
        if (report.verification !== 'awaiting_deploy' || report.task?.status !== 'awaiting_deploy') {
          throw new Error(`Expected awaiting_deploy for missing required properties: ${JSON.stringify(report)}`);
        }

        const contextPayload = assertStatus(
          await client.callTool({
            name: 'get_analytics_task_context',
            arguments: { taskId: 'task_missing_prop', projectId: 'proj_dtask_prop' },
          }),
          'ready',
          'get missing-property context',
        );

        const lastError = String(contextPayload.context?.productionVerification?.lastError ?? '');
        if (!lastError.includes('Missing required production event properties')) {
          throw new Error(`Expected missing-property verification summary: ${JSON.stringify(contextPayload)}`);
        }
      });
    });

    await stage('mcp-ambiguity', async () => {
      const accessToken = tokenFor(context, 'mcp-pending-analytics-task-ambiguous-project', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        const result = assertStatus(
          await client.callTool({
            name: 'list_pending_analytics_tasks',
            arguments: {
              repo: {
                name: 'Ambiguous Pending Demo',
                appRoot: '.',
              },
            },
          }),
          'needs_project_selection',
          'ambiguous project selection',
        );
        const candidates = Array.isArray(result.candidates) ? result.candidates : [];
        if (candidates.length < 2) {
          throw new Error(`Expected multiple project candidates: ${JSON.stringify(result)}`);
        }
      });
    });

    await stage('foreign-task', async () => {
      const accessToken = tokenFor(context, 'mcp-pending-analytics-task', 'tasks');
      await withMcpClient(accessToken, async (client) => {
        assertStatus(
          await client.callTool({
            name: 'report_analytics_task_status',
            arguments: {
              taskId: 'task_foreign_404',
              projectId: 'proj_mcp_task',
              status: 'failed',
              errorSummary: 'Build failed in foreign repository context.',
            },
          }),
          'task_not_found',
          'foreign task guard',
        );
      });
    });

    await stage('insufficient-scope', async () => {
      const accessToken = tokenFor(context, 'mcp-pending-analytics-task', 'install');
      await withMcpClient(accessToken, async (client) => {
        const checks = [
          [
            'list_pending_analytics_tasks',
            { projectId: 'proj_mcp_task' },
          ],
          [
            'get_analytics_task_context',
            { taskId: 'task_mcp_pending', projectId: 'proj_mcp_task' },
          ],
          [
            'report_analytics_task_status',
            { taskId: 'task_mcp_pending', projectId: 'proj_mcp_task', status: 'in_progress' },
          ],
        ];

        for (const [name, argumentsInput] of checks) {
          const result = assertStatus(
            await client.callTool({ name, arguments: argumentsInput }),
            'insufficient_scope',
            `${name} insufficient-scope`,
          );
          const summaryText = String(result.summary ?? '');
          if (!summaryText.includes('mcp:tasks')) {
            throw new Error(`Insufficient-scope summary missing required scope: ${JSON.stringify(result)}`);
          }
        }
      });
    });

    summary.ok = true;
  } catch {
    summary.ok = false;
  } finally {
    try {
      await stage('teardown', async () => {
        if (context.browser) await context.browser.close();
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
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
