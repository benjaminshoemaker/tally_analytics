import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';
import { chromium } from '@playwright/test';

import { seedScenario } from './seed-e2e-scenario.mjs';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const tmpRoot = path.join(repoRoot, 'tmp', 'mcp-self-test');
const fixturesDir = path.join(tmpRoot, 'fixtures');
const targetDir = path.join(tmpRoot, 'target-app');
const codexOutputPath = path.join(tmpRoot, 'codex-last-message.txt');
const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

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
  const args = { fromSandbox: false, keep: false, help: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--from-sandbox') args.fromSandbox = true;
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:mcp-self-test [--from-sandbox] [--keep]');
  console.log('');
  console.log('Runs the local MCP onboarding self-test against a disposable Next.js app.');
  console.log('Default target app source is a local fixture; --from-sandbox clones the sandbox GitHub repo.');
}

function log(message) {
  console.error(`[mcp-self-test] ${message}`);
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
  fs.mkdirSync(tmpRoot, { recursive: true });
  fs.mkdirSync(fixturesDir, { recursive: true });
  fs.mkdirSync(path.join(fixturesDir, 'mcp-self-test'), { recursive: true });
  fs.writeFileSync(path.join(fixturesDir, 'mcp-self-test', 'events.jsonl'), '');
}

function writeFile(relativePath, content) {
  const filePath = path.join(targetDir, relativePath);
  assertDescendant(filePath, targetDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function prepareLocalTargetApp() {
  fs.mkdirSync(targetDir, { recursive: true });
  writeFile('README.md', '# MCP Self-Test Target\n\nDisposable Next.js App Router app.\n');
  writeFile(
    'package.json',
    `${JSON.stringify(
      {
        private: true,
        scripts: { dev: 'next dev', build: 'next build' },
        dependencies: { next: '14.2.20', react: '18.3.1', 'react-dom': '18.3.1' },
        devDependencies: {
          typescript: '^5.7.2',
          '@types/react': '^18.3.12',
          '@types/node': '^20.17.6',
        },
      },
      null,
      2
    )}\n`
  );
  writeFile(
    'app/layout.tsx',
    [
      'export default function RootLayout({ children }: { children: React.ReactNode }) {',
      '  return <html lang="en"><body>{children}</body></html>;',
      '}',
      '',
    ].join('\n')
  );
  writeFile('app/page.tsx', 'export default function Page() {\n  return <main>MCP self-test target</main>;\n}\n');
  writeFile(
    'tsconfig.json',
    `${JSON.stringify({ compilerOptions: { jsx: 'preserve', strict: true } }, null, 2)}\n`
  );

  run('git', ['init'], { cwd: targetDir });
  run('git', ['add', '.'], { cwd: targetDir });
  run(
    'git',
    [
      '-c',
      'user.name=MCP Self Test',
      '-c',
      'user.email=mcp-self-test@example.com',
      'commit',
      '-m',
      'initial fixture',
    ],
    { cwd: targetDir }
  );
}

function prepareSandboxTargetApp() {
  run('gh', ['repo', 'clone', 'fast-pr-analytics-sandbox/fpa-fixture-next-app-router', targetDir], {
    cwd: tmpRoot,
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function rewriteSdkDependencyToLocalPackage() {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = readJson(packageJsonPath);
  packageJson.dependencies = packageJson.dependencies ?? {};
  packageJson.dependencies['@tally-analytics/sdk'] = `file:${path.relative(targetDir, path.join(repoRoot, 'packages', 'sdk'))}`;
  writeJson(packageJsonPath, packageJson);
}

function targetPrompt() {
  return [
    'Use the MCP server named `tally-local` to add Tally analytics to this Next.js app.',
    'Call `prepare_nextjs_install_patch` with only the minimum local repo context it needs: package.json, tsconfig.json, and app/layout.tsx.',
    'Apply the returned unified diff with `git apply --check` before `git apply`.',
    'Do not install a GitHub App, do not use a browser, and do not invent a different integration if the patch fails.',
    'After applying the patch, stop and report the project id and dashboard URL.',
  ].join(' ');
}

function assertTargetPatched() {
  const packageJson = readJson(path.join(targetDir, 'package.json'));
  if (typeof packageJson.dependencies?.['@tally-analytics/sdk'] !== 'string') {
    throw new Error('Target package.json does not include @tally-analytics/sdk');
  }
  if (!fs.existsSync(path.join(targetDir, 'components', 'tally-analytics.tsx'))) {
    throw new Error('Target app is missing components/tally-analytics.tsx');
  }
  const layout = fs.readFileSync(path.join(targetDir, 'app', 'layout.tsx'), 'utf8');
  if (!layout.includes('TallyAnalytics')) throw new Error('Target layout does not mount TallyAnalytics');
}

function assertLocalSdkDependency() {
  const packageJson = readJson(path.join(targetDir, 'package.json'));
  const dependency = packageJson.dependencies?.['@tally-analytics/sdk'];
  if (typeof dependency !== 'string' || !dependency.startsWith('file:')) {
    throw new Error(`Target SDK dependency is not local file: dependency: ${dependency}`);
  }
}

async function findMcpProjectId(databaseUrl, userId) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT id FROM projects WHERE user_id = $1 AND source = 'mcp_codex' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    const id = result.rows[0]?.id;
    if (typeof id !== 'string') throw new Error('No MCP project was created for the E2E user');
    return id;
  } finally {
    await client.end();
  }
}

async function captureExistingOAuthClients(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query('SELECT client_id FROM oauth_clients');
    return new Set(result.rows.map((row) => row.client_id));
  } finally {
    await client.end();
  }
}

async function cleanupDatabase(databaseUrl, userId, existingClientIds) {
  if (!userId) return;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM oauth_refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM oauth_access_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM oauth_authorization_codes WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM regenerate_requests WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM projects WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM github_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

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

async function assertLiveFeedShowsEvent({ projectId, userId }) {
  const loginResponse = await fetch('http://localhost:3000/api/auth/e2e-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!loginResponse.ok) throw new Error(`E2E dashboard login failed: ${loginResponse.status}`);

  const cookie = loginResponse.headers.get('set-cookie');
  if (!cookie) throw new Error('E2E dashboard login did not set a cookie');

  const liveResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/analytics/live?limit=5`, {
    headers: { cookie },
  });
  if (!liveResponse.ok) throw new Error(`Live feed API failed: ${liveResponse.status}`);

  const json = await liveResponse.json();
  const events = Array.isArray(json.events) ? json.events : [];
  if (!events.some((event) => event.eventType === 'page_view')) {
    throw new Error(`Live feed did not include a page_view event: ${JSON.stringify(json)}`);
  }
}

async function driveTargetBrowser() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  } finally {
    await browser.close();
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
    userId: null,
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
      run('pnpm', ['--version'], { capture: true });
      run('codex', ['--version'], { capture: true });
      if (!fs.existsSync(path.join(repoRoot, 'node_modules'))) run('pnpm', ['install']);
      await Promise.all([assertPortFree(3000), assertPortFree(3001), assertPortFree(3002)]);

      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      run('pnpm', ['--filter', 'web', 'db:push']);
      context.existingOAuthClientIds = await captureExistingOAuthClients(databaseUrl);
      run('pnpm', ['--filter', 'sdk', 'build']);
    });

    await stage('prepare-target', async () => {
      resetWorkspace();
      if (args.fromSandbox) prepareSandboxTargetApp();
      else prepareLocalTargetApp();
    });

    await stage('seed-user', async () => {
      const result = await seedScenario('empty-new-user', {
        databaseUrl,
        fixturesDir,
      });
      context.userId = result.scenario.user.id;
      fs.writeFileSync(path.join(fixturesDir, 'mcp-self-test', 'events.jsonl'), '');
    });

    await stage('start-services', async () => {
      const env = {
        DATABASE_URL: databaseUrl,
        E2E_TEST_MODE: '1',
        E2E_MCP_AUTH_USER_ID: context.userId,
        E2E_EVENTS_FIXTURE_SCENARIO: 'mcp-self-test',
        E2E_ANALYTICS_FIXTURE_DIR: fixturesDir,
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      };

      context.processes.push(
        spawnProcess('web', 'pnpm', ['--filter', 'web', 'dev:e2e'], { env }),
        spawnProcess('events', 'pnpm', ['--filter', 'events', 'exec', 'next', 'dev', '-p', '3001'], { env })
      );

      await Promise.all([
        waitForHttp('http://localhost:3000/api/mcp'),
        waitForHttp('http://localhost:3001/v1/track'),
      ]);
    });

    await stage('codex-mcp-login', async () => {
      spawnSync('codex', ['mcp', 'logout', 'tally-local'], { stdio: 'ignore' });
      spawnSync('codex', ['mcp', 'remove', 'tally-local'], { stdio: 'ignore' });
      run('codex', ['mcp', 'add', 'tally-local', '--url', 'http://localhost:3000/api/mcp']);
      run('codex', ['mcp', 'login', 'tally-local', '--scopes', 'mcp:install']);
    });

    await stage('codex-apply-patch', async () => {
      assertDescendant(targetDir, tmpRoot);
      run(
        'codex',
        [
          'exec',
          '--cd',
          targetDir,
          '--skip-git-repo-check',
          '-s',
          'danger-full-access',
          '--output-last-message',
          codexOutputPath,
          targetPrompt(),
        ],
        { cwd: targetDir }
      );
      assertTargetPatched();
    });

    await stage('install-and-build-target', async () => {
      rewriteSdkDependencyToLocalPackage();
      assertLocalSdkDependency();
      run('pnpm', ['install', '--ignore-workspace'], { cwd: targetDir });
      run('pnpm', ['--ignore-workspace', 'run', 'build'], { cwd: targetDir });
    });

    const projectId = await stage('find-mcp-project', async () => {
      return findMcpProjectId(databaseUrl, context.userId);
    });

    await stage('emit-target-event', async () => {
      context.processes.push(
        spawnProcess('target', 'pnpm', ['--ignore-workspace', 'exec', 'next', 'dev', '-p', '3002'], {
          cwd: targetDir,
          env: {
            NEXT_PUBLIC_TALLY_EVENTS_URL: 'http://localhost:3001/v1/track',
          },
        })
      );
      await waitForHttp('http://localhost:3002/');
      await driveTargetBrowser();
    });

    await stage('assert-dashboard-event', async () => {
      await assertLiveFeedShowsEvent({ projectId, userId: context.userId });
    });

    summary.ok = true;
  } catch {
    summary.ok = false;
  } finally {
    try {
      await stage('teardown', async () => {
        for (const processInfo of context.processes.reverse()) {
          await waitForProcessExit(processInfo);
        }

        spawnSync('codex', ['mcp', 'logout', 'tally-local'], { stdio: 'ignore' });
        spawnSync('codex', ['mcp', 'remove', 'tally-local'], { stdio: 'ignore' });

        await cleanupDatabase(databaseUrl, context.userId, context.existingOAuthClientIds);

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
