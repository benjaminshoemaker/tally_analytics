import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';

export type ScenarioProject = {
  id: string;
  source?: 'github_app' | 'mcp_codex';
  displayName?: string;
  repoId: number | null;
  repoFullName: string | null;
  installationId: number | null;
  mcpNormalizedGitRemote?: string;
  mcpRepoName?: string;
  mcpAppRoot?: string;
  mcpFramework?: string;
  mcpPackageManager?: string;
  mcpFingerprint?: string;
  status: string;
  prNumber: number | null;
  prUrl: string | null;
  detectedFramework: string | null;
  detectedAnalytics: string[];
  eventsThisMonth: number;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentTestScenario = {
  id: string;
  description: string;
  tags: string[];
  user: {
    id: string;
    email: string;
    githubUserId?: number;
    githubUsername?: string;
    githubAvatarUrl?: string;
    plan?: 'free' | 'pro' | 'team';
  };
  github?: {
    installations?: Array<{
      id: number;
      accessToken?: string;
      expiresAt?: string;
    }>;
  };
  projects: ScenarioProject[];
  analytics?: {
    events?: Array<Record<string, unknown>>;
  };
  expectations: {
    startPath: string;
    assertions: string[];
  };
};

export const appDir = process.cwd().endsWith(`${path.sep}apps${path.sep}web`)
  ? process.cwd()
  : path.join(process.cwd(), 'apps', 'web');
export const scenariosDir = path.join(appDir, 'e2e', 'scenarios');
const seedScriptPath = path.join(appDir, 'scripts', 'seed-e2e-scenario.mjs');

export function listScenarioIds(): string[] {
  return fs
    .readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
}

export function loadScenario(id: string): AgentTestScenario {
  const scenarioPath = path.join(scenariosDir, `${id}.json`);
  const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8')) as AgentTestScenario;
  if (scenario.id !== id)
    throw new Error(`Scenario id mismatch: expected ${id}, got ${scenario.id}`);
  return scenario;
}

export function seedScenario(id: string): AgentTestScenario {
  const result = spawnSync(process.execPath, [seedScriptPath, id], {
    cwd: appDir,
    env: process.env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Failed to seed scenario ${id}.`,
        result.stdout ? `stdout:\n${result.stdout}` : '',
        result.stderr ? `stderr:\n${result.stderr}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return loadScenario(id);
}

export async function loginScenarioUser(
  page: Page,
  scenarioOrId: AgentTestScenario | string
): Promise<void> {
  const scenario = typeof scenarioOrId === 'string' ? loadScenario(scenarioOrId) : scenarioOrId;
  const response = await page.request.post('/api/auth/e2e-login', {
    data: { userId: scenario.user.id },
  });

  if (!response.ok()) {
    throw new Error(`Failed to log in scenario user ${scenario.user.email}: ${response.status()}`);
  }
}
