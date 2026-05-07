import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
    mcpFingerprint?: string;
    status: string;
    detectedAnalytics: string[];
    eventsThisMonth: number;
  }>;
  analytics?: {
    events?: Array<{ project_id?: unknown; event_type?: unknown }>;
  };
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
          expect(project.mcpFingerprint).toMatch(/^[a-f0-9]{64}$/);
        }
        expect(validStatuses.has(project.status)).toBe(true);
        expect(Array.isArray(project.detectedAnalytics)).toBe(true);
        expect(project.eventsThisMonth).toBeGreaterThanOrEqual(0);
      }

      for (const event of scenario.analytics?.events ?? []) {
        expect(knownProjectIds.has(String(event.project_id))).toBe(true);
        expect(['page_view', 'session_start']).toContain(event.event_type);
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
});
