import fs from 'node:fs';
import crypto from 'node:crypto';
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
const validTaskStatuses = new Set([
  'pending',
  'in_progress',
  'implemented_locally',
  'awaiting_deploy',
  'verified',
  'failed',
  'cancelled',
  'archived',
  'duplicate',
]);
const validTaskTypes = new Set(['track_completion', 'track_click', 'add_event_property']);
const validAnswerKinds = new Set(['answered', 'partial_answer', 'cannot_answer_yet', 'unsupported']);

function stripTrailingGitSuffix(value) {
  return value.replace(/\.git$/i, '');
}

function normalizeGitRemote(remote) {
  const trimmed = remote?.trim();
  if (!trimmed) return null;

  const scpLike = /^git@([^:]+):(.+)$/i.exec(trimmed);
  if (scpLike) {
    const host = scpLike[1].toLowerCase();
    const remotePath = stripTrailingGitSuffix(scpLike[2].replace(/^\/+|\/+$/g, ''));
    return `${host}/${host === 'github.com' ? remotePath.toLowerCase() : remotePath}`;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const remotePath = stripTrailingGitSuffix(url.pathname.replace(/^\/+|\/+$/g, ''));
    if (!host || !remotePath) return null;
    return `${host}/${host === 'github.com' ? remotePath.toLowerCase() : remotePath}`;
  } catch {
    return null;
  }
}

function buildMcpFingerprintInput(project) {
  const gitRemote = project.mcpGitRemote ?? project.gitRemote ?? null;
  const normalizedGitRemote = normalizeGitRemote(gitRemote);
  const appRoot = project.mcpAppRoot ?? '.';

  if (normalizedGitRemote) {
    return {
      source: 'mcp_codex',
      identity: 'remote',
      normalizedGitRemote,
      appRoot,
    };
  }

  const repoName = project.mcpRepoName ?? project.displayName ?? project.id;
  return {
    source: 'mcp_codex',
    identity: 'repo_name',
    repoName,
    packageName: project.mcpPackageName ?? repoName,
    appRoot,
  };
}

function mcpFingerprint(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function expectedMcpFingerprint(project) {
  return mcpFingerprint(buildMcpFingerprintInput(project));
}

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
      const allowBroadMatchFixture = scenario.id === 'mcp-multiple-projects';
      if (
        !allowBroadMatchFixture &&
        (typeof project.mcpFingerprint !== 'string' ||
          project.mcpFingerprint !== expectedMcpFingerprint(project))
      ) {
        throw new Error(`MCP scenario fingerprint must match repo context in ${scenario.id}: ${project.id}`);
      }
      if (
        allowBroadMatchFixture &&
        project.mcpFingerprint !== null &&
        (typeof project.mcpFingerprint !== 'string' || project.mcpFingerprint.length !== 64)
      ) {
        throw new Error(`Invalid mcpFingerprint in ${scenario.id}: ${project.id}`);
      }
    }
  }

  const knownProjectIds = new Set(scenario.projects.map((project) => project.id));
  const events = scenario.analytics?.events ?? [];
  if (!Array.isArray(events))
    throw new Error('Scenario analytics.events must be an array when present');
  for (const event of events) {
    if (!knownProjectIds.has(String(event.project_id ?? ''))) {
      throw new Error(`Event project_id must reference a seeded project in ${scenario.id}`);
    }
    if (typeof event.event_type !== 'string' || event.event_type.trim().length === 0) {
      throw new Error(`Invalid analytics event_type in ${scenario.id}`);
    }
    if (event.environment != null && !['production', 'development', 'test'].includes(String(event.environment))) {
      throw new Error(`Invalid analytics environment in ${scenario.id}: ${event.environment}`);
    }
    if (
      event.event_properties != null &&
      typeof event.event_properties !== 'string' &&
      typeof event.event_properties !== 'object'
    ) {
      throw new Error(`Invalid analytics event_properties in ${scenario.id}`);
    }
  }

  if (scenario.analyticsTasks != null && !Array.isArray(scenario.analyticsTasks)) {
    throw new Error('Scenario analyticsTasks must be an array when present');
  }
  for (const task of scenario.analyticsTasks ?? []) {
    if (typeof task.id !== 'string' || task.id.length === 0 || task.id.length > 24) {
      throw new Error(`Invalid analytics task id in ${scenario.id}`);
    }
    if (!knownProjectIds.has(task.projectId)) {
      throw new Error(`Analytics task projectId must reference a seeded project in ${scenario.id}: ${task.id}`);
    }
    if (!validTaskStatuses.has(task.status)) {
      throw new Error(`Invalid analytics task status in ${scenario.id}: ${task.id}`);
    }
    if (!validTaskTypes.has(task.taskType)) {
      throw new Error(`Invalid analytics task type in ${scenario.id}: ${task.id}`);
    }
    if (!validAnswerKinds.has(task.answerKind ?? 'cannot_answer_yet')) {
      throw new Error(`Invalid analytics task answer kind in ${scenario.id}: ${task.id}`);
    }
    if (typeof task.title !== 'string' || task.title.trim().length === 0 || task.title.length > 180) {
      throw new Error(`Invalid analytics task title in ${scenario.id}: ${task.id}`);
    }
    if (typeof task.originalQuestion !== 'string' || task.originalQuestion.trim().length === 0) {
      throw new Error(`Invalid analytics task originalQuestion in ${scenario.id}: ${task.id}`);
    }
    if (typeof task.eventName !== 'string' || !/^[a-z][a-z0-9_]{0,99}$/.test(task.eventName)) {
      throw new Error(`Invalid analytics task eventName in ${scenario.id}: ${task.id}`);
    }
    if (typeof task.triggerDescription !== 'string' || task.triggerDescription.trim().length === 0) {
      throw new Error(`Invalid analytics task triggerDescription in ${scenario.id}: ${task.id}`);
    }
  }
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
    'DELETE FROM analytics_task_status_events WHERE user_id = $1 OR project_id = ANY($2::varchar[])',
    [userId, projectIds]
  );
  await client.query(
    'DELETE FROM analytics_tasks WHERE user_id = $1 OR project_id = ANY($2::varchar[])',
    [userId, projectIds]
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

function compactText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  return compact.slice(0, maxLength);
}

function normalizeTaskEventName(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{0,99}$/.test(normalized)) return null;
  return normalized;
}

function seededStatusEventId(taskId) {
  return `tse_${crypto.createHash('sha256').update(taskId).digest('hex').slice(0, 20)}`;
}

async function insertAnalyticsTasks(client, scenario) {
  for (const task of scenario.analyticsTasks ?? []) {
    const now = new Date().toISOString();
    const userId = task.userId ?? scenario.user.id;
    const answerKind = task.answerKind ?? 'cannot_answer_yet';
    const status = task.status;
    const title = compactText(task.title, 180);
    const originalQuestion = compactText(task.originalQuestion, 500);
    const eventName = normalizeTaskEventName(task.eventName);
    const triggerDescription = compactText(task.triggerDescription, 500);
    const answerSummary = compactText(task.answerSummary ?? '', 400);
    const analyticsGap = compactText(task.analyticsGap ?? '', 400);
    const implementationGuidance = compactText(task.implementationGuidance ?? '', 600);

    if (!title || !originalQuestion || !eventName || !triggerDescription) {
      throw new Error(`Invalid analytics task fields for ${scenario.id}:${task.id}`);
    }

    await client.query(
      `
        INSERT INTO analytics_tasks (
          id,
          project_id,
          user_id,
          status,
          task_type,
          title,
          original_question,
          answer_kind,
          answer_summary,
          analytics_gap,
          event_name,
          trigger_description,
          properties_schema,
          target_surface,
          implementation_guidance,
          verification_criteria,
          verification_source,
          duplicate_fingerprint,
          duplicate_of_task_id,
          local_verification,
          implementation_fingerprint,
          last_error,
          confirmed_at,
          claimed_at,
          implemented_at,
          verified_at,
          cancelled_at,
          archived_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14,
          $15,
          $16::jsonb,
          $17,
          $18,
          $19,
          $20::jsonb,
          $21,
          $22,
          $23,
          $24,
          $25,
          $26,
          $27,
          $28,
          $29,
          $30
        )
      `,
      [
        task.id,
        task.projectId,
        userId,
        status,
        task.taskType,
        title,
        originalQuestion,
        answerKind,
        answerSummary ?? null,
        analyticsGap ?? null,
        eventName,
        triggerDescription,
        task.propertiesSchema ?? {},
        task.targetSurface ?? null,
        implementationGuidance ?? null,
        task.verificationCriteria ?? {},
        task.verificationSource ?? 'production_event',
        task.duplicateFingerprint ?? null,
        task.duplicateOfTaskId ?? null,
        task.localVerification ?? null,
        task.implementationFingerprint ?? null,
        compactText(task.lastError ?? '', 320) ?? null,
        task.confirmedAt ?? now,
        task.claimedAt ?? null,
        task.implementedAt ?? null,
        task.verifiedAt ?? null,
        task.cancelledAt ?? null,
        task.archivedAt ?? null,
        task.createdAt ?? now,
        task.updatedAt ?? now,
      ]
    );

    await client.query(
      `
        INSERT INTO analytics_task_status_events (
          id,
          task_id,
          project_id,
          user_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason,
          details,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
      `,
      [
        task.statusEventId ?? seededStatusEventId(task.id),
        task.id,
        task.projectId,
        userId,
        task.fromStatus ?? null,
        status,
        task.actorType ?? (status === 'pending' ? 'user' : 'system'),
        task.actorId ?? null,
        task.reason ?? null,
        task.statusDetails ?? {},
        task.statusEventCreatedAt ?? task.updatedAt ?? now,
      ]
    );
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
    await insertAnalyticsTasks(client, scenario);
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
  console.log(`Analytics tasks: ${scenario.analyticsTasks?.length ?? 0}`);
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
