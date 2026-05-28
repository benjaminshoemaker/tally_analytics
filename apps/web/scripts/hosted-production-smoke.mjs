import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import dotenv from 'dotenv';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');

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
  const args = { preflightOnly: false, help: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--preflight-only') args.preflightOnly = true;
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

  const summary = { ok: false, stages: [] };

  async function stage(name, fn) {
    const startedAt = Date.now();
    try {
      const details = await fn();
      summary.stages.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(details ? { details } : {}) });
      return details;
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
    await stage('public-endpoints', async () => {
      await assertHttp(`${appUrl}/`, { label: 'home' });
      await assertHttp(`${appUrl}/privacy`, { label: 'privacy' });
      await assertHttp(`${appUrl}/.well-known/oauth-protected-resource`, { label: 'mcp resource metadata' });
      await assertHttp(eventsUrl, { method: 'OPTIONS', label: 'events CORS preflight', allowedStatuses: [204] });
    });

    if (!args.preflightOnly) {
      const projectId = requireEnv('TALLY_HOSTED_PROJECT_ID');
      const accessToken = requireEnv('TALLY_HOSTED_MCP_ACCESS_TOKEN');
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
  } catch {
    summary.ok = false;
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
}

main();
