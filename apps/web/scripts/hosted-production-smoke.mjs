import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import dotenv from 'dotenv';
import { chromium } from '@playwright/test';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const tmpRoot = path.join(repoRoot, 'tmp', 'hosted-production-smoke');

function loadEnv() {
  for (const candidate of [
    path.join(appDir, '.env.local'),
    path.join(appDir, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ]) {
    dotenv.config({ path: candidate, override: false });
  }
}

function parseArgs(argv) {
  const args = { preflightOnly: false, screenshots: false, artifactDir: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--preflight-only') args.preflightOnly = true;
    else if (arg === '--screenshots') args.screenshots = true;
    else if (arg === '--artifact-dir') {
      args.artifactDir = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith('--artifact-dir=')) {
      args.artifactDir = arg.slice('--artifact-dir='.length);
    }
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:hosted-smoke [--preflight-only]');
  console.log('');
  console.log('Required for full smoke:');
  console.log('  TALLY_HOSTED_PROJECT_ID');
  console.log('  TALLY_HOSTED_MCP_ACCESS_TOKEN with mcp:tasks scope');
  console.log('');
  console.log('Optional:');
  console.log('  TALLY_HOSTED_APP_URL defaults to https://usetally.xyz');
  console.log('  TALLY_HOSTED_EVENTS_URL defaults to https://events.usetally.xyz/v1/track');
  console.log('  TALLY_HOSTED_EVENT_NAME defaults to tally_hosted_smoke');
  console.log('--preflight-only checks hosted public endpoints without emitting/querying events.');
  console.log('--screenshots captures hosted home and privacy screenshots.');
  console.log('--artifact-dir <dir> writes summary.json and screenshots to a specific directory.');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function assertHttp(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok && !options.allowedStatuses?.includes(response.status)) {
    const body = await response.text().catch(() => '');
    throw new Error(`${options.label ?? url} expected ok, got ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

async function callMcpTool({ appUrl, accessToken, name, args }) {
  const client = new McpClient({ name: 'tally-hosted-production-smoke', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL('/api/mcp', appUrl), {
    requestInit: {
      headers: { authorization: `Bearer ${accessToken}` },
    },
  });

  await client.connect(transport);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
  }
}

async function waitForMcpEvent(params) {
  const deadline = Date.now() + 90_000;
  let lastPayload = null;

  while (Date.now() < deadline) {
    const result = await callMcpTool({
      appUrl: params.appUrl,
      accessToken: params.accessToken,
      name: 'get_live_events',
      args: { projectId: params.projectId, limit: 20 },
    });
    lastPayload = result.structuredContent ?? {};
    const events = Array.isArray(lastPayload.events) ? lastPayload.events : [];
    if (events.some((event) => event.eventType === params.eventName || event.event_type === params.eventName)) {
      return lastPayload;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  throw new Error(`Timed out waiting for ${params.eventName}. Last MCP payload: ${JSON.stringify(lastPayload)}`);
}

async function captureScreenshots({ artifactDir, appUrl }) {
  const screenshotsDir = path.join(artifactDir, 'screenshots');
  ensureDir(screenshotsDir);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${appUrl}/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotsDir, 'home.png'), fullPage: true });
    await page.goto(`${appUrl}/privacy`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotsDir, 'privacy.png'), fullPage: true });
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

  const appUrl = (process.env.TALLY_HOSTED_APP_URL ?? 'https://usetally.xyz').replace(/\/+$/, '');
  const eventsUrl = process.env.TALLY_HOSTED_EVENTS_URL ?? 'https://events.usetally.xyz/v1/track';
  const eventName = process.env.TALLY_HOSTED_EVENT_NAME ?? 'tally_hosted_smoke';
  const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toLowerCase();
  const artifactDir = path.resolve(args.artifactDir ?? path.join(tmpRoot, runId));
  ensureDir(artifactDir);

  const summary = {
    ok: false,
    runId,
    artifactDir,
    appUrl,
    eventsUrl,
    preflightOnly: args.preflightOnly,
    screenshots: args.screenshots,
    stages: [],
  };

  async function stage(name, fn) {
    const startedAt = Date.now();
    try {
      const details = await fn();
      summary.stages.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(details ? { details } : {}) });
      writeJson(path.join(artifactDir, 'summary.json'), summary);
      return details;
    } catch (error) {
      summary.stages.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      writeJson(path.join(artifactDir, 'summary.json'), summary);
      throw error;
    }
  }

  try {
    await stage('public-endpoints', async () => {
      await assertHttp(`${appUrl}/`, { label: 'home' });
      await assertHttp(`${appUrl}/privacy`, { label: 'privacy' });
      await assertHttp(`${appUrl}/.well-known/oauth-protected-resource`, { label: 'mcp resource metadata' });
      await assertHttp(eventsUrl, { method: 'OPTIONS', label: 'events CORS preflight', allowedStatuses: [204] });
    });

    if (args.screenshots) {
      await stage('capture-public-screenshots', async () => {
        await captureScreenshots({ artifactDir, appUrl });
        return {
          screenshots: [
            path.join(artifactDir, 'screenshots', 'home.png'),
            path.join(artifactDir, 'screenshots', 'privacy.png'),
          ],
        };
      });
    }

    if (!args.preflightOnly) {
      let projectId;
      let accessToken;
      await stage('hosted-credentials', async () => {
        projectId = requireEnv('TALLY_HOSTED_PROJECT_ID');
        accessToken = requireEnv('TALLY_HOSTED_MCP_ACCESS_TOKEN');
        return { projectId: 'configured', accessToken: 'configured' };
      });
      const sessionId = `hosted-smoke-${crypto.randomUUID()}`;
      const timestamp = new Date().toISOString();

      await stage('emit-production-event', async () => {
        const response = await assertHttp(eventsUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            events: [
              {
                project_id: projectId,
                session_id: sessionId,
                event_type: eventName,
                timestamp,
                url: `${appUrl}/__hosted_smoke`,
                path: '/__hosted_smoke',
                environment: 'production',
                properties: { harness: 'hosted-production-smoke' },
              },
            ],
          }),
          label: 'events ingestion',
        });
        return { status: response.status, eventName };
      });

      await stage('verify-mcp-live-event', async () => {
        const payload = await waitForMcpEvent({ appUrl, accessToken, projectId, eventName });
        return { eventName, eventCount: Array.isArray(payload.events) ? payload.events.length : 0 };
      });
    }

    summary.ok = true;
  } catch (error) {
    summary.ok = false;
    summary.error = error instanceof Error ? error.message : String(error);
  }

  writeJson(path.join(artifactDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
}

main();
