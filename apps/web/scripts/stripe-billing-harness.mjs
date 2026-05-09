import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import pg from 'pg';
import Stripe from 'stripe';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const tmpRoot = path.join(repoRoot, 'tmp', 'stripe-billing-verification');
const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/postgres';
const stripeApiVersion = '2025-12-15.clover';

const stripeIdPattern = /\b(?:sk|pk|rk|whsec|cs|cus|sub|evt|in|pi|seti|pm|price|prod|bps|bpc)_[A-Za-z0-9_]+/g;
const emailPattern = /e2e\+stripe-[A-Za-z0-9._-]+@example\.com/g;

export function redactSecrets(value) {
  return String(value)
    .replace(stripeIdPattern, (match) => `${match.slice(0, match.indexOf('_') + 1)}redacted_${match.slice(-4)}`)
    .replace(emailPattern, 'e2e+stripe-redacted@example.com');
}

function redactObject(value) {
  if (Array.isArray(value)) return value.map(redactObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactObject(entry)]));
  }
  if (typeof value === 'string') return redactSecrets(value);
  return value;
}

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
  const args = { provider: 'local', keep: false, screenshots: false, help: false, port: 3000 };
  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--screenshots') args.screenshots = true;
    else if (arg === '--provider=real' || arg === '--real') args.provider = 'real';
    else if (arg === '--provider=local' || arg === '--provider=deterministic') args.provider = 'local';
    else if (arg.startsWith('--port=')) args.port = Number(arg.slice('--port='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['local', 'real'].includes(args.provider)) throw new Error(`Invalid provider: ${args.provider}`);
  if (!Number.isInteger(args.port) || args.port < 1024 || args.port > 65535) throw new Error(`Invalid port: ${args.port}`);
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:stripe-billing [--provider=real] [--keep] [--screenshots] [--port=3000]');
  console.log('');
  console.log('Default provider is local deterministic mode with an E2E-only fake Stripe client.');
  console.log('--provider=real uses Stripe test mode, Stripe CLI listen, hosted Checkout, and local DB state.');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(redactObject(value), null, 2)}\n`);
}

function appendLog(filePath, chunk) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, redactSecrets(chunk));
}

function log(message) {
  process.stderr.write(`[stripe-billing] ${redactSecrets(message)}\n`);
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

  if ((result.status ?? 1) !== 0 && !options.allowFailure) {
    const stdout = result.stdout ? `\nstdout:\n${redactSecrets(result.stdout)}` : '';
    const stderr = result.stderr ? `\nstderr:\n${redactSecrets(result.stderr)}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${stdout}${stderr}`);
  }

  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status ?? 1 };
}

function spawnProcess(name, command, args, options = {}) {
  log(`starting ${name}`);
  const logPath = options.logPath;
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const processInfo = { name, child, active: true };

  function handleChunk(streamName, chunk) {
    if (!processInfo.active) return;
    const raw = chunk.toString();
    options.onRawData?.(raw);
    const line = `[${name}:${streamName}] ${raw}`;
    if (logPath) appendLog(logPath, line);
    process.stderr.write(redactSecrets(line));
  }

  child.stdout.on('data', (chunk) => handleChunk('stdout', chunk));
  child.stderr.on('data', (chunk) => handleChunk('stderr', chunk));

  return processInfo;
}

async function stopProcess(processInfo) {
  if (!processInfo) return;
  const { child } = processInfo;
  processInfo.active = false;
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
  throw new Error(`Refusing to use a non-local database for billing verification: ${new URL(databaseUrl).host}`);
}

async function withDb(databaseUrl, fn) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function cleanupLocalRows(databaseUrl, context) {
  const userIds = Array.from(context.userIds);
  const projectIds = Array.from(context.projectIds);
  if (userIds.length === 0 && projectIds.length === 0) return;

  await withDb(databaseUrl, async (client) => {
    await client.query('BEGIN');
    try {
      await client.query('DELETE FROM regenerate_requests WHERE user_id = ANY($1::uuid[]) OR project_id = ANY($2::varchar[])', [
        userIds,
        projectIds,
      ]);
      await client.query('DELETE FROM projects WHERE user_id = ANY($1::uuid[]) OR id = ANY($2::varchar[])', [userIds, projectIds]);
      await client.query('DELETE FROM github_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM users WHERE id = ANY($1::uuid[]) OR email LIKE $2', [userIds, `e2e+stripe-${context.runId}%`]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

async function createBillingUser(databaseUrl, context, params = {}) {
  const userId = crypto.randomUUID();
  const email = `e2e+stripe-${context.runId}-${params.label ?? 'user'}@example.com`;
  const now = new Date().toISOString();
  const projectId = params.withProject ? `proj_sbv_${context.runId.slice(0, 8)}` : null;

  await withDb(databaseUrl, async (client) => {
    await client.query(
      `
        INSERT INTO users (
          id,
          email,
          plan,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_subscription_status,
          stripe_price_id,
          stripe_current_period_end,
          stripe_cancel_at_period_end,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        userId,
        email,
        params.plan ?? 'free',
        params.stripeCustomerId ?? null,
        params.stripeSubscriptionId ?? null,
        params.stripeSubscriptionStatus ?? null,
        params.stripePriceId ?? null,
        params.stripeCurrentPeriodEnd ?? null,
        params.stripeCancelAtPeriodEnd ?? null,
        now,
        now,
      ]
    );

    if (projectId) {
      await client.query(
        `
          INSERT INTO projects (
            id,
            user_id,
            source,
            display_name,
            mcp_fingerprint,
            status,
            detected_analytics,
            events_this_month,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'mcp_codex', $3, $4, 'active', $5, $6::bigint, $7, $8)
        `,
        [
          projectId,
          userId,
          'Stripe Billing Fixture',
          crypto.createHash('sha256').update(projectId).digest('hex'),
          ['tally'],
          String(params.eventsThisMonth ?? 80_000),
          now,
          now,
        ]
      );
    }
  });

  context.userIds.add(userId);
  if (projectId) context.projectIds.add(projectId);
  return { id: userId, email, projectId };
}

async function getBillingUser(databaseUrl, userId) {
  return withDb(databaseUrl, async (client) => {
    const result = await client.query(
      `
        SELECT
          id,
          email,
          plan,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_subscription_status,
          stripe_price_id,
          stripe_current_period_end,
          stripe_cancel_at_period_end,
          stripe_last_webhook_event_id,
          stripe_last_webhook_event_created
        FROM users
        WHERE id = $1
      `,
      [userId]
    );
    return result.rows[0] ?? null;
  });
}

async function waitForUser(databaseUrl, userId, predicate, description, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastUser = null;
  while (Date.now() < deadline) {
    lastUser = await getBillingUser(databaseUrl, userId);
    if (lastUser && predicate(lastUser)) return lastUser;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for ${description}. Last row: ${JSON.stringify(redactObject(lastUser))}`);
}

async function loginContext(browser, baseUrl, userId) {
  const context = await browser.newContext();
  const response = await context.request.post(`${baseUrl}/api/auth/e2e-login`, {
    data: { userId },
  });
  if (!response.ok()) throw new Error(`E2E login failed for ${userId}: ${response.status()}`);
  return context;
}

function assertStatus(response, expected, label) {
  if (response.status() !== expected) {
    throw new Error(`${label} expected ${expected}, got ${response.status()}`);
  }
}

function getCheckoutSessionIdFromLocation(location) {
  if (!location) throw new Error('Missing checkout redirect location');
  const parsed = new URL(location, 'http://localhost:3000');
  const id = parsed.searchParams.get('checkout_session_id');
  if (!id) throw new Error(`Redirect location missing checkout_session_id: ${redactSecrets(location)}`);
  return id;
}

function createWebhookPayload(params) {
  return JSON.stringify({
    id: params.eventId,
    object: 'event',
    api_version: stripeApiVersion,
    created: params.created,
    livemode: false,
    pending_webhooks: 1,
    type: params.eventType,
    data: { object: params.data },
  });
}

function signWebhook(payload, secret) {
  const stripe = new Stripe('sk_test_e2e_signature', { apiVersion: stripeApiVersion });
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  });
}

async function sendSignedWebhook(baseUrl, secret, params) {
  const payload = createWebhookPayload(params);
  const signature = signWebhook(payload, secret);
  const response = await fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  });
  return response;
}

async function runDbPush() {
  run('pnpm', ['--filter', 'web', 'db:push']);
}

function baseWebEnv(params) {
  return {
    DATABASE_URL: params.databaseUrl,
    E2E_TEST_MODE: '1',
    NEXT_PUBLIC_APP_URL: params.baseUrl,
    NEXT_PUBLIC_EVENTS_URL: process.env.NEXT_PUBLIC_EVENTS_URL ?? 'http://127.0.0.1:3001',
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? 'e2e',
    FROM_EMAIL: process.env.FROM_EMAIL ?? 'e2e@example.com',
    WATCHPACK_POLLING: 'true',
  };
}

function resetNextDevCache() {
  fs.rmSync(path.join(appDir, '.next'), { recursive: true, force: true });
}

function startWeb(context, env) {
  resetNextDevCache();
  const processInfo = spawnProcess('web', 'pnpm', ['--filter', 'web', 'exec', 'next', 'dev', '-p', String(context.port)], {
    env,
    logPath: path.join(context.artifactDir, 'web.log'),
  });
  context.processes.push(processInfo);
  return processInfo;
}

async function assertProjectQuota(context, browserContext, projectId, expectedLimit) {
  const response = await browserContext.request.get(`${context.baseUrl}/api/projects/${projectId}`);
  if (!response.ok()) throw new Error(`Project detail API failed: ${response.status()}`);
  const json = await response.json();
  if (json.quotaLimit !== expectedLimit) {
    throw new Error(`Expected quota limit ${expectedLimit}, got ${JSON.stringify(json)}`);
  }
}

async function runDeterministicTier(context) {
  const webhookSecret = 'whsec_e2e_stripe_billing';
  const pricePro = 'price_e2e_pro';
  const priceTeam = 'price_e2e_team';

  const webEnv = {
    ...baseWebEnv(context),
    E2E_STRIPE_FAKE: '1',
    STRIPE_SECRET_KEY: 'sk_test_e2e_fake',
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_PRICE_PRO: pricePro,
    STRIPE_PRICE_TEAM: priceTeam,
    STRIPE_BILLING_PORTAL_CONFIG_ID: 'bpc_e2e_fake',
  };

  runDbPush();
  await assertPortFree(context.port);
  startWeb(context, webEnv);
  await waitForHttp(`${context.baseUrl}/login`);

  const browser = await chromium.launch();
  context.browser = browser;

  const freeUser = await createBillingUser(context.databaseUrl, context, { label: 'free', withProject: true });
  const paidUser = await createBillingUser(context.databaseUrl, context, {
    label: 'paid',
    plan: 'pro',
    stripeCustomerId: `cus_e2e_active_${context.runId}`,
    stripeSubscriptionId: `sub_e2e_active_${context.runId}`,
    stripeSubscriptionStatus: 'active',
    stripePriceId: pricePro,
  });
  const noCustomerUser = await createBillingUser(context.databaseUrl, context, { label: 'nocustomer' });
  const otherUser = await createBillingUser(context.databaseUrl, context, { label: 'other' });
  const webhookUser = await createBillingUser(context.databaseUrl, context, {
    label: 'webhook',
    stripeCustomerId: `cus_e2e_webhook_${context.runId}`,
  });

  const freeContext = await loginContext(browser, context.baseUrl, freeUser.id);
  const freePage = await freeContext.newPage();
  await freePage.goto(`${context.baseUrl}/pricing`, { waitUntil: 'networkidle' });
  await freePage.getByRole('button', { name: 'Upgrade to Pro' }).waitFor({ state: 'visible' });
  await maybeCaptureScreenshot(context, 'local-pricing', freePage);

  const invalidCheckout = await freeContext.request.post(`${context.baseUrl}/api/stripe/checkout`, {
    form: { plan: 'free' },
    maxRedirects: 0,
  });
  assertStatus(invalidCheckout, 400, 'invalid checkout');

  const checkout = await freeContext.request.post(`${context.baseUrl}/api/stripe/checkout`, {
    form: { plan: 'pro' },
    maxRedirects: 0,
  });
  assertStatus(checkout, 303, 'free checkout');
  const checkoutSessionId = getCheckoutSessionIdFromLocation(checkout.headers().location);

  await waitForUser(context.databaseUrl, freeUser.id, (user) => typeof user.stripe_customer_id === 'string', 'checkout customer creation');

  const reconcile = await freeContext.request.post(`${context.baseUrl}/api/stripe/reconcile`, {
    data: { checkout_session_id: checkoutSessionId },
  });
  assertStatus(reconcile, 200, 'reconcile');
  const reconcileJson = await reconcile.json();
  if (reconcileJson.plan !== 'pro') throw new Error(`Expected reconcile plan pro, got ${JSON.stringify(reconcileJson)}`);

  await freePage.goto(`${context.baseUrl}/settings`, { waitUntil: 'networkidle' });
  await freePage.getByText('Pro').first().waitFor({ state: 'visible' });
  await freePage.getByText('Active').first().waitFor({ state: 'visible' });
  await maybeCaptureScreenshot(context, 'local-settings', freePage);
  if (freeUser.projectId) await assertProjectQuota(context, freeContext, freeUser.projectId, 100_000);

  const otherContext = await loginContext(browser, context.baseUrl, otherUser.id);
  const otherCheckout = await otherContext.request.post(`${context.baseUrl}/api/stripe/checkout`, {
    form: { plan: 'team' },
    maxRedirects: 0,
  });
  assertStatus(otherCheckout, 303, 'other checkout');
  const otherCheckoutSessionId = getCheckoutSessionIdFromLocation(otherCheckout.headers().location);
  const forbiddenReconcile = await freeContext.request.post(`${context.baseUrl}/api/stripe/reconcile`, {
    data: { checkout_session_id: otherCheckoutSessionId },
  });
  assertStatus(forbiddenReconcile, 403, 'foreign reconcile');

  const paidContext = await loginContext(browser, context.baseUrl, paidUser.id);
  const duplicateCheckout = await paidContext.request.post(`${context.baseUrl}/api/stripe/checkout`, {
    form: { plan: 'team' },
    maxRedirects: 0,
  });
  assertStatus(duplicateCheckout, 409, 'duplicate checkout');
  const duplicateJson = await duplicateCheckout.json();
  if (typeof duplicateJson.manageUrl !== 'string' || !duplicateJson.manageUrl.includes('billing.stripe.test')) {
    throw new Error(`Duplicate checkout did not return management URL: ${JSON.stringify(duplicateJson)}`);
  }

  const noCustomerContext = await loginContext(browser, context.baseUrl, noCustomerUser.id);
  const noCustomerPortal = await noCustomerContext.request.post(`${context.baseUrl}/api/stripe/portal`, { maxRedirects: 0 });
  assertStatus(noCustomerPortal, 400, 'portal without customer');

  const portal = await paidContext.request.post(`${context.baseUrl}/api/stripe/portal`, { maxRedirects: 0 });
  assertStatus(portal, 303, 'paid portal');
  if (!portal.headers().location?.includes('billing.stripe.test')) {
    throw new Error(`Portal did not redirect to billing management: ${portal.headers().location}`);
  }

  const missingSignature = await fetch(`${context.baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'evt_missing_signature' }),
  });
  if (missingSignature.status !== 400) throw new Error(`Missing signature expected 400, got ${missingSignature.status}`);

  const invalidSignature = await fetch(`${context.baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'invalid' },
    body: JSON.stringify({ id: 'evt_invalid_signature' }),
  });
  if (invalidSignature.status !== 400) throw new Error(`Invalid signature expected 400, got ${invalidSignature.status}`);

  const now = Math.floor(Date.now() / 1000);
  const subscriptionUpdated = {
    eventId: `evt_e2e_update_${context.runId}`,
    eventType: 'customer.subscription.updated',
    created: now,
    data: {
      id: `sub_e2e_webhook_${context.runId}`,
      object: 'subscription',
      customer: `cus_e2e_webhook_${context.runId}`,
      status: 'active',
      current_period_end: now + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: pricePro } }] },
    },
  };
  let webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, subscriptionUpdated);
  if (!webhookResponse.ok) throw new Error(`subscription.updated webhook failed: ${webhookResponse.status}`);
  await waitForUser(context.databaseUrl, webhookUser.id, (user) => user.plan === 'pro' && user.stripe_subscription_status === 'active', 'subscription.updated plan');

  webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, subscriptionUpdated);
  const duplicateBody = await webhookResponse.json();
  if (!duplicateBody.ignored) throw new Error(`Duplicate webhook was not ignored: ${JSON.stringify(duplicateBody)}`);

  webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, {
    ...subscriptionUpdated,
    eventId: `evt_e2e_unknown_price_${context.runId}`,
    created: now + 1,
    data: {
      ...subscriptionUpdated.data,
      items: { data: [{ price: { id: 'price_e2e_unknown' } }] },
    },
  });
  if (!webhookResponse.ok) throw new Error(`unknown price webhook failed: ${webhookResponse.status}`);
  await waitForUser(context.databaseUrl, webhookUser.id, (user) => user.plan === 'pro' && user.stripe_price_id === 'price_e2e_unknown', 'unknown price safety');

  webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, {
    eventId: `evt_e2e_invoice_paid_${context.runId}`,
    eventType: 'invoice.paid',
    created: now + 2,
    data: {
      id: `in_e2e_${context.runId}`,
      object: 'invoice',
      customer: `cus_e2e_webhook_${context.runId}`,
      subscription: `sub_e2e_webhook_${context.runId}`,
    },
  });
  if (!webhookResponse.ok) throw new Error(`invoice.paid webhook failed: ${webhookResponse.status}`);
  await waitForUser(context.databaseUrl, webhookUser.id, (user) => user.plan === 'pro', 'invoice.paid ignored state');

  webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, {
    eventId: `evt_e2e_payment_failed_${context.runId}`,
    eventType: 'invoice.payment_failed',
    created: now + 3,
    data: {
      id: `in_e2e_failed_${context.runId}`,
      object: 'invoice',
      customer: `cus_e2e_webhook_${context.runId}`,
      subscription: `sub_e2e_webhook_${context.runId}`,
    },
  });
  if (!webhookResponse.ok) throw new Error(`payment_failed webhook failed: ${webhookResponse.status}`);
  await waitForUser(context.databaseUrl, webhookUser.id, (user) => user.plan === 'pro' && user.stripe_subscription_status === 'past_due', 'payment failed state');

  webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, {
    eventId: `evt_e2e_stale_delete_${context.runId}`,
    eventType: 'customer.subscription.deleted',
    created: now + 2,
    data: {
      id: `sub_e2e_webhook_${context.runId}`,
      object: 'subscription',
      customer: `cus_e2e_webhook_${context.runId}`,
      status: 'canceled',
    },
  });
  if (!webhookResponse.ok) throw new Error(`stale delete webhook failed: ${webhookResponse.status}`);
  await waitForUser(context.databaseUrl, webhookUser.id, (user) => user.plan === 'pro', 'stale webhook did not downgrade');

  webhookResponse = await sendSignedWebhook(context.baseUrl, webhookSecret, {
    eventId: `evt_e2e_delete_${context.runId}`,
    eventType: 'customer.subscription.deleted',
    created: now + 4,
    data: {
      id: `sub_e2e_webhook_${context.runId}`,
      object: 'subscription',
      customer: `cus_e2e_webhook_${context.runId}`,
      status: 'canceled',
    },
  });
  if (!webhookResponse.ok) throw new Error(`delete webhook failed: ${webhookResponse.status}`);
  await waitForUser(context.databaseUrl, webhookUser.id, (user) => user.plan === 'free' && user.stripe_subscription_status === 'canceled', 'subscription deleted downgrade');

  context.summary.local = {
    freeUser: freeUser.id,
    paidUser: paidUser.id,
    webhookUser: webhookUser.id,
    projectId: freeUser.projectId,
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertTestModeEnv() {
  const secret = requireEnv('STRIPE_SECRET_KEY');
  if (secret.startsWith('sk_live_')) throw new Error('Refusing to run real-provider mode with a live Stripe secret key');

  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishable?.startsWith('pk_live_')) throw new Error('Refusing to run real-provider mode with a live Stripe publishable key');

  for (const name of ['STRIPE_PRICE_PRO', 'STRIPE_PRICE_TEAM', 'STRIPE_BILLING_PORTAL_CONFIG_ID']) {
    requireEnv(name);
  }
}

function stripeCliEnv() {
  const env = { ...process.env };
  if (process.env.STRIPE_SECRET_KEY) env.STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY;
  return env;
}

function runStripeCli(args, options = {}) {
  return run('stripe', ['--color', 'off', ...args], {
    ...options,
    capture: true,
    env: { ...stripeCliEnv(), ...(options.env ?? {}) },
  });
}

function parseJsonOutput(command, output) {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`Stripe CLI did not return JSON for ${command}`);
  }
}

function retrieveStripeJson(args) {
  const command = `stripe ${args.join(' ')}`;
  const result = runStripeCli(args);
  return parseJsonOutput(command, result.stdout);
}

function validatePrice(price, expectedId) {
  if (price.id !== expectedId) throw new Error(`Stripe CLI returned unexpected price id for ${expectedId}`);
  if (price.livemode !== false) throw new Error(`Refusing live-mode Stripe price: ${expectedId}`);
  if (price.active !== true) throw new Error(`Stripe price is not active: ${expectedId}`);
  if (!price.recurring) throw new Error(`Stripe price is not recurring: ${expectedId}`);
}

function validatePortalConfig(config, expectedId) {
  if (config.id !== expectedId) throw new Error(`Stripe CLI returned unexpected Billing Portal config id for ${expectedId}`);
  if (config.livemode !== false) throw new Error(`Refusing live-mode Billing Portal configuration: ${expectedId}`);
  if (config.active !== true) throw new Error(`Billing Portal configuration is not active: ${expectedId}`);
}

async function startStripeListener(context) {
  const events = [];
  let resolveSecret;
  let rejectSecret;
  const secretPromise = new Promise((resolve, reject) => {
    resolveSecret = resolve;
    rejectSecret = reject;
  });

  const listener = spawnProcess(
    'stripe-listen',
    'stripe',
    [
      'listen',
      '--events',
      'checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed,invoice.paid',
      '--forward-to',
      `${context.baseUrl}/api/webhooks/stripe`,
    ],
    {
      env: stripeCliEnv(),
      logPath: path.join(context.artifactDir, 'stripe-listener.log'),
      onRawData(raw) {
        const secret = raw.match(/whsec_[A-Za-z0-9_]+/)?.[0];
        if (secret) resolveSecret(secret);

        for (const line of raw.split(/\r?\n/)) {
          const eventMatch = line.match(/-->\s+([a-z0-9_.]+)\s+\[(evt_[A-Za-z0-9_]+)\]/);
          if (eventMatch) events.push({ type: eventMatch[1], id: eventMatch[2], direction: 'incoming' });

          const responseMatch = line.match(/<--\s+\[(\d+)\]\s+\w+\s+.*\[(evt_[A-Za-z0-9_]+)\]/);
          if (responseMatch) {
            const status = Number(responseMatch[1]);
            const eventId = responseMatch[2];
            const event = events.find((candidate) => candidate.id === eventId);
            if (event) {
              event.responseStatus = status;
            } else {
              events.push({ type: 'unknown', id: eventId, direction: 'response', responseStatus: status });
            }
          }
        }
      },
    }
  );

  context.processes.push(listener);
  listener.child.once('exit', (code) => {
    rejectSecret(new Error(`stripe listen exited before providing webhook secret: ${code}`));
  });

  const secret = await Promise.race([
    secretPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for stripe listen webhook secret')), 45_000)),
  ]);

  context.stripeListenerEvents = events;
  return { secret, events };
}

async function waitForStripeListenerEvent(context, predicate, description, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (context.stripeListenerEvents.some(predicate)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Stripe listener event: ${description}`);
}

function assertStripeListenerResponses(context) {
  const failed = context.stripeListenerEvents.filter(
    (event) => typeof event.responseStatus === 'number' && (event.responseStatus < 200 || event.responseStatus >= 300)
  );
  if (failed.length > 0) {
    throw new Error(`Stripe listener saw non-2xx webhook responses: ${JSON.stringify(redactObject(failed))}`);
  }
}

async function fillCheckoutField(page, selectors, value, options = {}) {
  const deadline = Date.now() + (options.timeoutMs ?? 30_000);
  let lastError = '';

  while (Date.now() < deadline) {
    for (const frame of [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())]) {
      for (const selector of selectors) {
        try {
          const locator = frame.locator(selector).first();
          if ((await locator.count()) === 0) continue;
          if (!(await locator.isVisible().catch(() => false))) continue;
          await locator.fill(value, { timeout: 5000 });
          return;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Unable to fill Stripe Checkout field ${selectors.join(' | ')}: ${lastError}`);
}

async function clickFirstVisible(locators, options = {}) {
  let lastError = '';
  for (const locator of locators) {
    try {
      const target = locator.first();
      if ((await target.count()) === 0) continue;
      if (!(await target.isVisible().catch(() => false))) continue;
      await target.click({ timeout: options.timeoutMs ?? 5000 });
      await new Promise((resolve) => setTimeout(resolve, options.afterClickMs ?? 1000));
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  if (options.required) throw new Error(`Unable to click Stripe Checkout control: ${lastError}`);
  return false;
}

async function uncheckFirstVisible(locators) {
  for (const locator of locators) {
    const target = locator.first();
    if ((await target.count()) === 0) continue;
    if (!(await target.isVisible().catch(() => false))) continue;

    try {
      if (await target.isChecked()) {
        await target.uncheck({ timeout: 5000 });
      }
      return true;
    } catch {
      await target.click({ timeout: 5000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function completeHostedCheckout(page, email) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  await fillCheckoutField(page, ['input[type="email"]', 'input[name="email"]', 'input#email'], email, { timeoutMs: 10_000 }).catch(
    () => undefined
  );
  await clickFirstVisible(
    [
      page.getByRole('button', { name: /^continue$/i }),
      page.getByRole('button', { name: /^continue to payment$/i }),
      page.getByText(/^continue$/i),
    ],
    { afterClickMs: 1500 }
  );

  await clickFirstVisible(
    [
      page.getByRole('radio', { name: /card/i }),
      page.getByRole('tab', { name: /card/i }),
      page.getByText(/^card$/i),
      page.locator('[data-testid*="card"]').first(),
    ],
    { afterClickMs: 1000 }
  );

  await fillCheckoutField(
    page,
    [
      'input[name="cardNumber"]',
      'input[name="cardnumber"]',
      'input[name="number"]',
      'input[autocomplete="cc-number"]',
      'input[aria-label*="card number" i]',
      'input[placeholder*="1234"]',
      'input[data-elements-stable-field-name="cardNumber"]',
    ],
    '4242424242424242'
  );
  await fillCheckoutField(
    page,
    [
      'input[name="cardExpiry"]',
      'input[name="cardexpiry"]',
      'input[name="expiry"]',
      'input[name="exp-date"]',
      'input[autocomplete="cc-exp"]',
      'input[aria-label*="expiration" i]',
      'input[aria-label*="expiry" i]',
      'input[placeholder*="MM"]',
      'input[data-elements-stable-field-name="cardExpiry"]',
    ],
    '1234'
  );
  await fillCheckoutField(
    page,
    [
      'input[name="cardCvc"]',
      'input[name="cardcvc"]',
      'input[name="cvc"]',
      'input[autocomplete="cc-csc"]',
      'input[aria-label*="security" i]',
      'input[aria-label*="cvc" i]',
      'input[placeholder*="CVC"]',
      'input[data-elements-stable-field-name="cardCvc"]',
    ],
    '123'
  );
  await fillCheckoutField(
    page,
    ['input[name="billingName"]', 'input[name="name"]', 'input[autocomplete="cc-name"]', 'input[aria-label*="name" i]'],
    'Tally E2E',
    { timeoutMs: 10_000 }
  ).catch(() => undefined);
  await fillCheckoutField(
    page,
    ['input[name="postal"]', 'input[name="postalCode"]', 'input[autocomplete="postal-code"]', 'input[aria-label*="zip" i]'],
    '94107',
    { timeoutMs: 5_000 }
  ).catch(() => undefined);
  await uncheckFirstVisible([
    page.getByRole('checkbox', { name: /save my information/i }),
    page.locator('input[type="checkbox"][name*="link"]'),
  ]);

  await clickFirstVisible(
    [
      page.getByRole('button', { name: /^subscribe$/i }),
      page.getByRole('button', { name: /^pay$/i }),
      page.getByRole('button', { name: /^start trial$/i }),
      page.getByRole('button', { name: /^complete purchase$/i }),
      page.locator('button[type="submit"]'),
      page.locator('[data-testid="hosted-payment-submit-button"]'),
    ],
    { required: true, timeoutMs: 30_000, afterClickMs: 0 }
  );
  await page.waitForURL(/\/settings\?success=true/, { timeout: 90_000 });
}

async function runRealProviderTier(context) {
  assertTestModeEnv();

  await assertPortFree(context.port);
  run('stripe', ['--version'], { capture: true });
  runDbPush();

  const proPriceId = requireEnv('STRIPE_PRICE_PRO');
  const teamPriceId = requireEnv('STRIPE_PRICE_TEAM');
  const portalConfigId = requireEnv('STRIPE_BILLING_PORTAL_CONFIG_ID');

  const proPrice = retrieveStripeJson(['prices', 'retrieve', proPriceId]);
  const teamPrice = retrieveStripeJson(['prices', 'retrieve', teamPriceId]);
  const portalConfig = retrieveStripeJson(['billing_portal', 'configurations', 'retrieve', portalConfigId]);
  validatePrice(proPrice, proPriceId);
  validatePrice(teamPrice, teamPriceId);
  validatePortalConfig(portalConfig, portalConfigId);

  const listener = await startStripeListener(context);
  const webEnv = {
    ...baseWebEnv(context),
    STRIPE_SECRET_KEY: requireEnv('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: listener.secret,
    STRIPE_PRICE_PRO: proPriceId,
    STRIPE_PRICE_TEAM: teamPriceId,
    STRIPE_BILLING_PORTAL_CONFIG_ID: portalConfigId,
  };

  startWeb(context, webEnv);
  await waitForHttp(`${context.baseUrl}/login`);

  const browser = await chromium.launch();
  context.browser = browser;
  const user = await createBillingUser(context.databaseUrl, context, { label: 'real', withProject: true });
  const browserContext = await loginContext(browser, context.baseUrl, user.id);
  const page = await browserContext.newPage();

  await page.goto(`${context.baseUrl}/pricing`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Upgrade to Pro' }).click();
  await completeHostedCheckout(page, user.email);
  await page.getByText('Pro').first().waitFor({ state: 'visible', timeout: 60_000 });
  await page.getByText(/Active|Trialing/i).first().waitFor({ state: 'visible', timeout: 60_000 });
  await maybeCaptureScreenshot(context, 'real-settings', page);

  const billingRow = await waitForUser(
    context.databaseUrl,
    user.id,
    (row) =>
      row.plan === 'pro' &&
      typeof row.stripe_customer_id === 'string' &&
      typeof row.stripe_subscription_id === 'string' &&
      row.stripe_price_id === proPriceId,
    'real provider billing row',
    90_000
  );
  context.providerResources.customerId = billingRow.stripe_customer_id;
  context.providerResources.subscriptionId = billingRow.stripe_subscription_id;

  await waitForUser(
    context.databaseUrl,
    user.id,
    (row) => typeof row.stripe_last_webhook_event_id === 'string',
    'real provider webhook processing',
    90_000
  );
  await waitForStripeListenerEvent(
    context,
    (event) => event.type === 'checkout.session.completed' && event.responseStatus >= 200 && event.responseStatus < 300,
    'checkout.session.completed 2xx response'
  );

  await assertProjectQuota(context, browserContext, user.projectId, 100_000);

  const duplicateCheckout = await browserContext.request.post(`${context.baseUrl}/api/stripe/checkout`, {
    form: { plan: 'pro' },
    maxRedirects: 0,
  });
  assertStatus(duplicateCheckout, 409, 'real duplicate checkout');
  const duplicateJson = await duplicateCheckout.json();
  if (typeof duplicateJson.manageUrl !== 'string') {
    throw new Error(`Real duplicate checkout did not return manageUrl: ${JSON.stringify(duplicateJson)}`);
  }

  const portal = await browserContext.request.post(`${context.baseUrl}/api/stripe/portal`, { maxRedirects: 0 });
  assertStatus(portal, 303, 'real portal');
  if (!portal.headers().location?.includes('billing.stripe.com')) {
    throw new Error(`Real portal did not redirect to Stripe Billing Portal: ${portal.headers().location}`);
  }
  assertStripeListenerResponses(context);

  context.summary.real = {
    userId: user.id,
    projectId: user.projectId,
    customerId: billingRow.stripe_customer_id,
    subscriptionId: billingRow.stripe_subscription_id,
    webhookEvents: context.stripeListenerEvents,
  };
}

async function cleanupProviderResources(context) {
  if (context.provider !== 'real') return;
  const subscriptionIds = new Set();
  const customerIds = new Set();

  if (context.providerResources.subscriptionId) subscriptionIds.add(context.providerResources.subscriptionId);
  if (context.providerResources.customerId) customerIds.add(context.providerResources.customerId);

  const userIds = Array.from(context.userIds);
  if (userIds.length > 0) {
    await withDb(context.databaseUrl, async (client) => {
      const result = await client.query(
        `
          SELECT stripe_customer_id, stripe_subscription_id
          FROM users
          WHERE id = ANY($1::uuid[])
        `,
        [userIds]
      );
      for (const row of result.rows) {
        if (row.stripe_customer_id) customerIds.add(row.stripe_customer_id);
        if (row.stripe_subscription_id) subscriptionIds.add(row.stripe_subscription_id);
      }
    });
  }

  context.summary.cleanup.subscriptionCancelStatuses = [];
  for (const subscriptionId of subscriptionIds) {
    const result = runStripeCli(['subscriptions', 'cancel', subscriptionId], { allowFailure: true });
    context.summary.cleanup.subscriptionCancelStatuses.push(result.status);
  }

  context.summary.cleanup.customerDeleteStatuses = [];
  for (const customerId of customerIds) {
    const result = runStripeCli(['customers', 'delete', customerId], { allowFailure: true });
    context.summary.cleanup.customerDeleteStatuses.push(result.status);
  }
}

async function maybeCaptureScreenshot(context, name, page) {
  if (!context.screenshots) return;
  const screenshotsDir = path.join(context.artifactDir, 'screenshots');
  ensureDir(screenshotsDir);
  await page.screenshot({ path: path.join(screenshotsDir, `${name}.png`), fullPage: true });
}

async function captureFailureScreenshots(context) {
  if (!context.browser) return;
  const screenshotsDir = path.join(context.artifactDir, 'screenshots');
  ensureDir(screenshotsDir);
  let index = 0;
  for (const browserContext of context.browser.contexts()) {
    for (const page of browserContext.pages()) {
      index += 1;
      await page.screenshot({ path: path.join(screenshotsDir, `failure-${index}.png`), fullPage: true }).catch(() => undefined);
    }
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
  assertLocalDatabase(databaseUrl);

  const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toLowerCase();
  const artifactDir = path.join(tmpRoot, runId);
  ensureDir(artifactDir);

  const context = {
    provider: args.provider,
    port: args.port,
    baseUrl: `http://localhost:${args.port}`,
    databaseUrl,
    artifactDir,
    runId,
    keep: args.keep,
    screenshots: args.screenshots,
    userIds: new Set(),
    projectIds: new Set(),
    processes: [],
    browser: null,
    stripeListenerEvents: [],
    providerResources: {},
    summary: {
      ok: false,
      provider: args.provider,
      artifactDir,
      runId,
      stages: [],
      cleanup: {},
    },
  };

  async function stage(name, fn) {
    const startedAt = Date.now();
    log(`stage: ${name}`);
    try {
      const result = await fn();
      context.summary.stages.push({ name, status: 'passed', durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      context.summary.stages.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      writeJson(path.join(artifactDir, 'summary.json'), context.summary);
    }
  }

  try {
    await stage('preflight', async () => {
      run('pnpm', ['--version'], { capture: true });
      await withDb(databaseUrl, (client) => client.query('SELECT 1'));
    });

    if (args.provider === 'real') {
      await stage('real-provider', () => runRealProviderTier(context));
    } else {
      await stage('deterministic-local', () => runDeterministicTier(context));
    }

    context.summary.ok = true;
  } catch (error) {
    context.summary.ok = false;
    context.summary.error = error instanceof Error ? error.message : String(error);
    log(`failed: ${context.summary.error}`);
    await captureFailureScreenshots(context);
  } finally {
    try {
      await cleanupProviderResources(context);
    } catch (error) {
      context.summary.cleanup.providerError = error instanceof Error ? error.message : String(error);
    }

    try {
      await cleanupLocalRows(databaseUrl, context);
    } catch (error) {
      context.summary.cleanup.localError = error instanceof Error ? error.message : String(error);
    }

    if (context.browser) await context.browser.close().catch(() => undefined);
    for (const processInfo of context.processes.reverse()) await stopProcess(processInfo);

    writeJson(path.join(artifactDir, 'summary.json'), context.summary);
    ensureDir(tmpRoot);
    writeJson(path.join(tmpRoot, 'last-summary.json'), context.summary);

    if (context.summary.ok && !context.keep) {
      fs.rmSync(artifactDir, { recursive: true, force: true });
    } else {
      log(`artifacts: ${artifactDir}`);
    }
  }

  if (!context.summary.ok) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(redactSecrets(error instanceof Error ? error.stack ?? error.message : String(error)));
    process.exitCode = 1;
  });
}
