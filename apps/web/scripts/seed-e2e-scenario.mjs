import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const scenariosDir = path.join(appDir, 'e2e', 'scenarios');
const defaultFixturesDir = path.join(appDir, '.e2e-fixtures');
const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

const validStatuses = new Set([
  'pending',
  'analyzing',
  'analysis_failed',
  'pr_pending',
  'pr_closed',
  'active',
  'unsupported',
]);
const validSources = new Set(['github_app', 'mcp_codex']);

function loadEnv() {
  for (const candidate of [
    path.join(appDir, '.env.local'),
    path.join(appDir, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ]) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
    }
  }
}

function listScenarioIds() {
  return fs
    .readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
}

function readScenario(id) {
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`Invalid scenario id: ${id}`);
  }

  const filePath = path.join(scenariosDir, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Scenario not found: ${id}. Available: ${listScenarioIds().join(', ')}`);
  }

  const scenario = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateScenario(scenario, id);
  return scenario;
}

function validateScenario(scenario, expectedId) {
  if (!scenario || typeof scenario !== 'object') throw new Error('Scenario must be an object');
  if (scenario.id !== expectedId) throw new Error(`Scenario id must match filename: ${expectedId}`);
  if (!scenario.user || typeof scenario.user !== 'object')
    throw new Error('Scenario must include user');
  if (typeof scenario.user.id !== 'string') throw new Error('Scenario user.id must be a string');
  if (typeof scenario.user.email !== 'string')
    throw new Error('Scenario user.email must be a string');
  if (!Array.isArray(scenario.projects)) throw new Error('Scenario projects must be an array');

  for (const project of scenario.projects) {
    const source = project.source ?? 'github_app';
    if (typeof project.id !== 'string' || project.id.length > 20) {
      throw new Error(`Invalid project id in ${scenario.id}: ${project.id}`);
    }
    if (!validSources.has(source)) {
      throw new Error(`Invalid project source in ${scenario.id}: ${project.id}`);
    }
    if (typeof (project.displayName ?? project.repoFullName) !== 'string') {
      throw new Error(`Invalid displayName in ${scenario.id}: ${project.id}`);
    }
    if (!validStatuses.has(project.status)) {
      throw new Error(`Invalid project status in ${scenario.id}: ${project.status}`);
    }
    if (source === 'github_app') {
      if (typeof project.repoId !== 'number' || !Number.isSafeInteger(project.repoId)) {
        throw new Error(`Invalid repoId in ${scenario.id}: ${project.id}`);
      }
      if (
        typeof project.installationId !== 'number' ||
        !Number.isSafeInteger(project.installationId)
      ) {
        throw new Error(`Invalid installationId in ${scenario.id}: ${project.id}`);
      }
      if (typeof project.repoFullName !== 'string' || !project.repoFullName.includes('/')) {
        throw new Error(`Invalid repoFullName in ${scenario.id}: ${project.id}`);
      }
    } else {
      if (project.repoId !== null || project.repoFullName !== null || project.installationId !== null) {
        throw new Error(`MCP scenarios must use null GitHub fields in ${scenario.id}: ${project.id}`);
      }
      if (typeof project.mcpFingerprint !== 'string' || project.mcpFingerprint.length !== 64) {
        throw new Error(`Invalid mcpFingerprint in ${scenario.id}: ${project.id}`);
      }
    }
  }

  const events = scenario.analytics?.events ?? [];
  if (!Array.isArray(events))
    throw new Error('Scenario analytics.events must be an array when present');
}

function databaseUrlFromEnv() {
  loadEnv();
  return process.env.DATABASE_URL ?? defaultDatabaseUrl;
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function assertSafeDatabase(databaseUrl) {
  if (isLocalDatabaseUrl(databaseUrl)) return;
  if (process.env.E2E_ALLOW_REMOTE_SEED === '1') return;

  throw new Error(
    [
      'Refusing to seed a non-local database.',
      'Set E2E_ALLOW_REMOTE_SEED=1 only for an explicit staging seed.',
      `DATABASE_URL host: ${safeDatabaseHost(databaseUrl)}`,
    ].join(' ')
  );
}

function safeDatabaseHost(databaseUrl) {
  try {
    return new URL(databaseUrl).host;
  } catch {
    return '(invalid url)';
  }
}

function installationRecordsForScenario(scenario) {
  const recordsById = new Map();

  for (const installation of scenario.github?.installations ?? []) {
    recordsById.set(String(installation.id), {
      id: installation.id,
      accessToken: installation.accessToken ?? `e2e_installation_token_${installation.id}`,
      expiresAt: installation.expiresAt ?? '2030-01-01T00:00:00.000Z',
    });
  }

  for (const project of scenario.projects) {
    if (project.installationId == null) continue;
    const key = String(project.installationId);
    if (!recordsById.has(key)) {
      recordsById.set(key, {
        id: project.installationId,
        accessToken: `e2e_installation_token_${project.installationId}`,
        expiresAt: '2030-01-01T00:00:00.000Z',
      });
    }
  }

  return Array.from(recordsById.values());
}

function writeEventFixture(scenario, fixturesDir = defaultFixturesDir) {
  const scenarioDir = path.join(fixturesDir, scenario.id);
  fs.mkdirSync(scenarioDir, { recursive: true });

  const fixture = {
    scenarioId: scenario.id,
    description: scenario.description,
    generatedAt: new Date().toISOString(),
    events: scenario.analytics?.events ?? [],
  };

  const eventsPath = path.join(scenarioDir, 'events.json');
  fs.writeFileSync(eventsPath, `${JSON.stringify(fixture, null, 2)}\n`);
  return eventsPath;
}

async function cleanupScenarioRows(client, scenario) {
  const userId = scenario.user.id;
  const email = scenario.user.email;
  const githubUserId =
    scenario.user.githubUserId == null ? null : String(scenario.user.githubUserId);
  const projectIds = scenario.projects.map((project) => project.id);
  const repoIds = scenario.projects
    .filter((project) => project.repoId != null)
    .map((project) => String(project.repoId));
  const installationIds = installationRecordsForScenario(scenario).map((installation) =>
    String(installation.id)
  );

  await client.query(
    'DELETE FROM regenerate_requests WHERE user_id = $1 OR project_id = ANY($2::varchar[])',
    [userId, projectIds]
  );
  await client.query(
    'DELETE FROM projects WHERE user_id = $1 OR id = ANY($2::varchar[]) OR github_repo_id = ANY($3::bigint[])',
    [userId, projectIds, repoIds]
  );
  await client.query(
    'DELETE FROM github_tokens WHERE user_id = $1 OR installation_id = ANY($2::bigint[])',
    [userId, installationIds]
  );
  await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

  if (githubUserId) {
    await client.query(
      'DELETE FROM users WHERE id = $1 OR email = $2 OR github_user_id = $3::bigint',
      [userId, email, githubUserId]
    );
  } else {
    await client.query('DELETE FROM users WHERE id = $1 OR email = $2', [userId, email]);
  }
}

async function insertUser(client, scenario) {
  const user = scenario.user;
  const now = new Date().toISOString();

  await client.query(
    `
      INSERT INTO users (
        id,
        email,
        github_user_id,
        github_username,
        github_avatar_url,
        plan,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3::bigint, $4, $5, $6, $7, $8)
    `,
    [
      user.id,
      user.email,
      user.githubUserId == null ? null : String(user.githubUserId),
      user.githubUsername ?? null,
      user.githubAvatarUrl ?? null,
      user.plan ?? 'free',
      user.createdAt ?? now,
      user.updatedAt ?? now,
    ]
  );
}

async function insertInstallations(client, scenario) {
  for (const installation of installationRecordsForScenario(scenario)) {
    await client.query(
      `
        INSERT INTO github_tokens (
          user_id,
          installation_id,
          installation_access_token,
          installation_token_expires_at
        )
        VALUES ($1, $2::bigint, $3, $4)
      `,
      [scenario.user.id, String(installation.id), installation.accessToken, installation.expiresAt]
    );
  }
}

async function insertProjects(client, scenario) {
  for (const project of scenario.projects) {
    const source = project.source ?? 'github_app';
    const displayName = project.displayName ?? project.repoFullName ?? project.mcpRepoName ?? project.id;

    await client.query(
      `
        INSERT INTO projects (
          id,
          user_id,
          source,
          display_name,
          github_repo_id,
          github_repo_full_name,
          github_installation_id,
          mcp_normalized_git_remote,
          mcp_repo_name,
          mcp_app_root,
          mcp_framework,
          mcp_package_manager,
          mcp_fingerprint,
          status,
          pr_number,
          pr_url,
          detected_framework,
          detected_analytics,
          events_this_month,
          events_month_reset_at,
          conversion_path,
          conversion_label,
          conversion_configured_at,
          conversion_prompt_dismissed_at,
          created_at,
          updated_at,
          last_event_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::bigint,
          $6,
          $7::bigint,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18,
          $19::bigint,
          $20,
          $21,
          $22,
          $23,
          $24,
          $25,
          $26,
          $27
        )
      `,
      [
        project.id,
        scenario.user.id,
        source,
        displayName,
        project.repoId == null ? null : String(project.repoId),
        project.repoFullName ?? null,
        project.installationId == null ? null : String(project.installationId),
        project.mcpNormalizedGitRemote ?? null,
        project.mcpRepoName ?? null,
        project.mcpAppRoot ?? null,
        project.mcpFramework ?? null,
        project.mcpPackageManager ?? null,
        project.mcpFingerprint ?? null,
        project.status,
        project.prNumber ?? null,
        project.prUrl ?? null,
        project.detectedFramework ?? null,
        project.detectedAnalytics ?? [],
        String(project.eventsThisMonth ?? 0),
        project.eventsMonthResetAt ?? null,
        project.conversion?.path ?? null,
        project.conversion?.label ?? null,
        project.conversion?.configuredAt ?? null,
        project.conversion?.promptDismissedAt ?? null,
        project.createdAt ?? new Date().toISOString(),
        project.updatedAt ?? new Date().toISOString(),
        project.lastEventAt ?? null,
      ]
    );
  }
}

export async function seedScenario(id, options = {}) {
  const scenario = readScenario(id);
  const databaseUrl = options.databaseUrl ?? databaseUrlFromEnv();
  assertSafeDatabase(databaseUrl);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await cleanupScenarioRows(client, scenario);
    await insertUser(client, scenario);
    await insertInstallations(client, scenario);
    await insertProjects(client, scenario);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  const eventsPath = writeEventFixture(scenario, options.fixturesDir ?? defaultFixturesDir);
  return { scenario, eventsPath, databaseUrl };
}

function printUsage() {
  console.log('Usage:');
  console.log('  node ./scripts/seed-e2e-scenario.mjs --list');
  console.log('  node ./scripts/seed-e2e-scenario.mjs --print <scenario-id>');
  console.log('  node ./scripts/seed-e2e-scenario.mjs --replay-events <scenario-id>');
  console.log('  node ./scripts/seed-e2e-scenario.mjs <scenario-id>');
}

function printScenarioSummary(result) {
  const { scenario, eventsPath, databaseUrl } = result;
  console.log(`Seeded scenario: ${scenario.id}`);
  console.log(`Database host: ${safeDatabaseHost(databaseUrl)}`);
  console.log(`User: ${scenario.user.email} (${scenario.user.id})`);
  for (const project of scenario.projects) {
    console.log(`Project: ${project.id} ${project.status} ${project.repoFullName ?? project.displayName}`);
    console.log(`Route: /projects/${project.id}`);
  }
  console.log(`Events fixture: ${path.relative(appDir, eventsPath)}`);
}

async function main() {
  const [command, scenarioId] = process.argv.slice(2);

  if (!command) {
    printUsage();
    console.log('');
    console.log(`Available scenarios: ${listScenarioIds().join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (command === '--list' || command === 'list') {
    for (const id of listScenarioIds()) console.log(id);
    return;
  }

  if (command === '--print') {
    if (!scenarioId) throw new Error('--print requires a scenario id');
    console.log(JSON.stringify(readScenario(scenarioId), null, 2));
    return;
  }

  if (command === '--replay-events') {
    if (!scenarioId) throw new Error('--replay-events requires a scenario id');
    const scenario = readScenario(scenarioId);
    const eventsPath = writeEventFixture(scenario);
    console.log(`Replayed local analytics fixture: ${scenario.id}`);
    console.log(`Events fixture: ${path.relative(appDir, eventsPath)}`);
    console.log(`Events: ${scenario.analytics?.events?.length ?? 0}`);
    return;
  }

  const result = await seedScenario(command);
  printScenarioSummary(result);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
