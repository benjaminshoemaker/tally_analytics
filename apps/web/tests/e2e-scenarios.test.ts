import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { buildMcpProjectFingerprintInput, mcpFingerprint } from '../lib/db/queries/projects';

vi.mock('../lib/db/client', () => ({ db: {} }));

const scenariosDir = path.resolve(__dirname, '../e2e/scenarios');

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
const validVerificationSources = new Set(['production_event']);

type Scenario = {
  id: string;
  description: string;
  tags: string[];
  user: {
    id: string;
    email: string;
    githubUserId?: number;
    plan?: string;
  };
  github?: {
    installations?: Array<{ id: number }>;
  };
  projects: Array<{
    id: string;
    source?: string;
    displayName?: string;
    repoId: number | null;
    repoFullName: string | null;
    installationId: number | null;
    mcpGitRemote?: string | null;
    mcpRepoName?: string | null;
    mcpAppRoot?: string | null;
    mcpPackageName?: string | null;
    mcpFingerprint?: string | null;
    status: string;
    detectedAnalytics: string[];
    eventsThisMonth: number;
  }>;
  analytics?: {
    events?: Array<{
      project_id?: unknown;
      event_type?: unknown;
      environment?: unknown;
      event_properties?: unknown;
    }>;
  };
  analyticsTasks?: Array<{
    id: string;
    projectId: string;
    userId?: string;
    status: string;
    taskType: string;
    title: string;
    originalQuestion: string;
    answerKind?: string;
    answerSummary?: string | null;
    analyticsGap?: string | null;
    eventName: string;
    triggerDescription: string;
    propertiesSchema?: Record<string, unknown>;
    targetSurface?: string | null;
    implementationGuidance?: string | null;
    verificationCriteria?: Record<string, unknown>;
    verificationSource?: string;
    duplicateFingerprint?: string | null;
    duplicateOfTaskId?: string | null;
    localVerification?: Record<string, unknown> | null;
    implementationFingerprint?: string | null;
    lastError?: string | null;
    confirmedAt?: string | null;
    claimedAt?: string | null;
    implementedAt?: string | null;
    verifiedAt?: string | null;
    cancelledAt?: string | null;
    archivedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    actorType?: 'user' | 'agent' | 'system';
    actorId?: string | null;
    reason?: string | null;
    statusDetails?: Record<string, unknown>;
    statusEventCreatedAt?: string;
  }>;
  expectations: {
    startPath: string;
    assertions: string[];
  };
};

function readScenarios(): Array<{ filename: string; scenario: Scenario }> {
  return fs
    .readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((filename) => ({
      filename,
      scenario: JSON.parse(fs.readFileSync(path.join(scenariosDir, filename), 'utf8')) as Scenario,
    }));
}

describe('E2E scenario contracts', () => {
  it('defines valid, uniquely-addressable local scenarios', () => {
    const scenarios = readScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(8);

    const scenarioIds = new Set<string>();
    const userIds = new Set<string>();
    const emails = new Set<string>();
    const projectIds = new Set<string>();
    const taskIds = new Set<string>();
    const repoIds = new Set<number>();
    const installationIds = new Set<number>();

    for (const { filename, scenario } of scenarios) {
      expect(scenario.id).toBe(filename.replace(/\.json$/, ''));
      expect(scenarioIds.has(scenario.id)).toBe(false);
      scenarioIds.add(scenario.id);

      expect(scenario.description.length).toBeGreaterThan(0);
      expect(scenario.tags).toContain('local');
      expect(scenario.user.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(scenario.user.email).toMatch(/^e2e\+/);
      expect(['free', 'pro', 'team']).toContain(scenario.user.plan ?? 'free');
      expect(userIds.has(scenario.user.id)).toBe(false);
      expect(emails.has(scenario.user.email)).toBe(false);
      userIds.add(scenario.user.id);
      emails.add(scenario.user.email);

      for (const installation of scenario.github?.installations ?? []) {
        expect(Number.isSafeInteger(installation.id)).toBe(true);
        expect(installationIds.has(installation.id)).toBe(false);
        installationIds.add(installation.id);
      }

      const knownProjectIds = new Set(scenario.projects.map((project) => project.id));
      for (const project of scenario.projects) {
        const source = project.source ?? 'github_app';
        expect(project.id).toMatch(/^proj_/);
        expect(project.id.length).toBeLessThanOrEqual(20);
        expect(projectIds.has(project.id)).toBe(false);
        projectIds.add(project.id);

        expect(validSources.has(source)).toBe(true);
        expect(typeof (project.displayName ?? project.repoFullName)).toBe('string');
        if (source === 'github_app') {
          expect(Number.isSafeInteger(project.repoId)).toBe(true);
          expect(repoIds.has(project.repoId as number)).toBe(false);
          repoIds.add(project.repoId as number);
          expect(project.repoFullName).toMatch(/^[^/]+\/[^/]+$/);
          expect(Number.isSafeInteger(project.installationId)).toBe(true);
        } else {
          expect(project.repoId).toBeNull();
          expect(project.repoFullName).toBeNull();
          expect(project.installationId).toBeNull();
          if (scenario.id === 'mcp-multiple-projects') {
            expect(project.mcpFingerprint === null || /^[a-f0-9]{64}$/.test(project.mcpFingerprint ?? '')).toBe(
              true
            );
          } else {
            expect(project.mcpFingerprint).toMatch(/^[a-f0-9]{64}$/);
          }
        }
        expect(validStatuses.has(project.status)).toBe(true);
        expect(Array.isArray(project.detectedAnalytics)).toBe(true);
        expect(project.eventsThisMonth).toBeGreaterThanOrEqual(0);
      }

      for (const event of scenario.analytics?.events ?? []) {
        expect(knownProjectIds.has(String(event.project_id))).toBe(true);
        expect(typeof event.event_type).toBe('string');
        expect(String(event.event_type).length).toBeGreaterThan(0);
        if (event.environment !== undefined) {
          expect(['production', 'development', 'test']).toContain(event.environment);
        }
        if (event.event_properties !== undefined) {
          expect(
            typeof event.event_properties === 'string' ||
              (event.event_properties !== null && typeof event.event_properties === 'object')
          ).toBe(true);
        }
      }

      for (const task of scenario.analyticsTasks ?? []) {
        expect(task.id).toMatch(/^task_/);
        expect(task.id.length).toBeLessThanOrEqual(24);
        expect(taskIds.has(task.id)).toBe(false);
        taskIds.add(task.id);
        expect(knownProjectIds.has(task.projectId)).toBe(true);
        expect(validTaskStatuses.has(task.status)).toBe(true);
        expect(validTaskTypes.has(task.taskType)).toBe(true);
        expect(validAnswerKinds.has(task.answerKind ?? 'cannot_answer_yet')).toBe(true);
        expect(task.title.trim().length).toBeGreaterThan(0);
        expect(task.title.length).toBeLessThanOrEqual(180);
        expect(task.originalQuestion.trim().length).toBeGreaterThan(0);
        expect(task.eventName).toMatch(/^[a-z][a-z0-9_]{0,99}$/);
        expect(task.triggerDescription.trim().length).toBeGreaterThan(0);
        expect(validVerificationSources.has(task.verificationSource ?? 'production_event')).toBe(true);
        if (task.duplicateFingerprint != null) {
          expect(task.duplicateFingerprint).toMatch(/^[a-f0-9]{64}$/);
        }
        if (task.duplicateOfTaskId != null) {
          expect(task.duplicateOfTaskId).toMatch(/^task_/);
        }
      }

      expect(scenario.expectations.startPath).toMatch(/^\//);
      expect(scenario.expectations.assertions.length).toBeGreaterThan(0);
    }
  });

  it('defines MCP scenarios with nullable GitHub fields and local fixture coverage', () => {
    const scenarios = readScenarios();
    const mcpNoEvents = scenarios.find(({ scenario }) => scenario.id === 'mcp-active-no-events')?.scenario;
    const mcpWithEvents = scenarios.find(({ scenario }) => scenario.id === 'mcp-active-with-events')?.scenario;

    expect(mcpNoEvents?.projects[0]).toMatchObject({
      source: 'mcp_codex',
      displayName: 'MCP Empty Demo',
      repoId: null,
      repoFullName: null,
      installationId: null,
      status: 'active',
      lastEventAt: null,
    });
    expect(mcpNoEvents?.analytics?.events).toHaveLength(0);

    expect(mcpWithEvents?.projects[0]).toMatchObject({
      source: 'mcp_codex',
      displayName: 'MCP Events Demo',
      repoId: null,
      repoFullName: null,
      installationId: null,
      status: 'active',
    });
    expect(mcpWithEvents?.analytics?.events?.map((event) => event.project_id)).toEqual([
      'proj_mcp_events',
      'proj_mcp_events',
    ]);
  });

  it('computes exact MCP analytics scenario fingerprints from resolver context', () => {
    const scenarios = readScenarios();
    const analyticsScenarioIds = new Set([
      'mcp-active-no-events',
      'mcp-active-with-events',
      'mcp-active-with-signup-events',
      'mcp-active-partial-signup-data',
    ]);

    for (const { scenario } of scenarios) {
      for (const project of scenario.projects) {
        if ((project.source ?? 'github_app') !== 'mcp_codex') continue;
        if (scenario.id === 'mcp-multiple-projects') continue;
        if (!analyticsScenarioIds.has(scenario.id)) continue;

        const expected = mcpFingerprint(
          buildMcpProjectFingerprintInput({
            repoName: project.mcpRepoName ?? project.displayName ?? project.id,
            packageName: project.mcpPackageName ?? project.mcpRepoName ?? project.displayName ?? project.id,
            gitRemote: project.mcpGitRemote ?? null,
            appRoot: project.mcpAppRoot ?? '.',
          })
        );

        expect(project.mcpFingerprint).toBe(expected);
      }
    }
  });

  it('allows broad-match missing fingerprints only in the multiple-project scenario', () => {
    const scenarios = readScenarios();
    const broadMatchScenarios = scenarios.filter(({ scenario }) =>
      scenario.projects.some((project) => {
        if ((project.source ?? 'github_app') !== 'mcp_codex') return false;
        const expected = mcpFingerprint(
          buildMcpProjectFingerprintInput({
            repoName: project.mcpRepoName ?? project.displayName ?? project.id,
            packageName: project.mcpPackageName ?? project.mcpRepoName ?? project.displayName ?? project.id,
            gitRemote: project.mcpGitRemote ?? null,
            appRoot: project.mcpAppRoot ?? '.',
          })
        );
        return project.mcpFingerprint !== expected;
      })
    );

    expect(broadMatchScenarios.map(({ scenario }) => scenario.id)).toEqual(['mcp-multiple-projects']);
  });

  it('lists MCP analytics scenarios needed by the flow harness', () => {
    const ids = readScenarios().map(({ scenario }) => scenario.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'mcp-active-with-signup-events',
        'mcp-active-partial-signup-data',
        'mcp-multiple-projects',
      ])
    );
  });

  it('lists dashboard pending-task scenarios needed by the flow harness', () => {
    const ids = readScenarios().map(({ scenario }) => scenario.id);

    expect(ids).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it('pins pending-task verification fixtures for production and test environments', () => {
    const scenarios = readScenarios();
    const testOnly = scenarios.find(({ scenario }) => scenario.id === 'dashboard-task-agent-implemented-awaiting-deploy')?.scenario;
    const verified = scenarios.find(({ scenario }) => scenario.id === 'dashboard-task-production-verified')?.scenario;
    const missingProperty = scenarios.find(({ scenario }) => scenario.id === 'dashboard-task-production-missing-property')?.scenario;

    expect(testOnly?.analytics?.events?.some((event) => event.environment === 'test' && event.event_type === 'upgrade_cta_clicked')).toBe(true);
    expect(verified?.analytics?.events?.some((event) => event.environment === 'production' && event.event_type === 'upgrade_cta_clicked')).toBe(true);

    const missingTask = missingProperty?.analyticsTasks?.find((task) => task.id === 'task_missing_prop');
    expect(missingTask?.taskType).toBe('add_event_property');
    expect(missingTask?.eventName).toBe('signup_completed');
    expect(missingTask?.propertiesSchema).toEqual({ required: ['plan'] });

    const missingEvent = missingProperty?.analytics?.events?.find((event) => event.event_type === 'signup_completed');
    expect(missingEvent?.environment).toBe('production');
    expect(missingEvent?.event_properties).toEqual({ source_page: '/pricing' });
  });
});
