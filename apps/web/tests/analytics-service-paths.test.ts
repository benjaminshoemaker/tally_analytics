import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPathsToEvent } from '../lib/analytics/service';

let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock('../lib/db/queries/projects', () => ({
  getOwnedAnalyticsProject: (...args: unknown[]) => {
    if (!getOwnedAnalyticsProjectSpy) throw new Error('getOwnedAnalyticsProjectSpy not initialized');
    return getOwnedAnalyticsProjectSpy(...args);
  },
}));

type FixtureEvent = {
  project_id: string;
  session_id: string;
  event_type: string;
  timestamp: string;
  path?: string;
};

function timestamp(offsetSeconds: number): string {
  return new Date(Date.UTC(2026, 4, 1, 12, 0, offsetSeconds)).toISOString();
}

function addPathToTargetEvents(params: {
  events: FixtureEvent[];
  projectId: string;
  sessionId: string;
  paths: string[];
  targetEvent?: string;
  offset: { value: number };
}): void {
  for (const pagePath of params.paths) {
    params.events.push({
      project_id: params.projectId,
      session_id: params.sessionId,
      event_type: 'page_view',
      timestamp: timestamp(params.offset.value++),
      path: pagePath,
    });
  }

  params.events.push({
    project_id: params.projectId,
    session_id: params.sessionId,
    event_type: params.targetEvent ?? 'signup_completed',
    timestamp: timestamp(params.offset.value++),
    path: '/signup',
  });
}

function writeFixture(root: string): void {
  const events: FixtureEvent[] = [];
  const offset = { value: 0 };

  events.push({
    project_id: 'proj_absent',
    session_id: 'absent_001',
    event_type: 'page_view',
    timestamp: timestamp(offset.value++),
    path: '/pricing',
  });

  addPathToTargetEvents({ events, projectId: 'proj_few', sessionId: 'few_001', paths: ['/pricing'], offset });
  addPathToTargetEvents({ events, projectId: 'proj_few', sessionId: 'few_002', paths: ['/docs'], offset });

  for (let index = 0; index < 6; index += 1) {
    addPathToTargetEvents({
      events,
      projectId: 'proj_low_coverage',
      sessionId: `low_${index}`,
      paths: index < 2 ? ['/pricing'] : [],
      offset,
    });
  }

  for (const [index, pagePath] of ['/a', '/b', '/a', '/b', '/c'].entries()) {
    addPathToTargetEvents({
      events,
      projectId: 'proj_sorted',
      sessionId: `sorted_${index}`,
      paths: [pagePath],
      offset,
    });
  }

  for (let index = 0; index < 1001; index += 1) {
    addPathToTargetEvents({
      events,
      projectId: 'proj_caps',
      sessionId: `cap_${index}`,
      paths: ['/pricing'],
      offset,
    });
  }

  for (let index = 0; index < 9000; index += 1) {
    events.push({
      project_id: 'proj_caps',
      session_id: `cap_extra_${index}`,
      event_type: 'page_view',
      timestamp: timestamp(offset.value++),
      path: '/extra',
    });
  }

  const scenarioDir = path.join(root, 'analytics-service-paths');
  fs.mkdirSync(scenarioDir, { recursive: true });
  fs.writeFileSync(
    path.join(scenarioDir, 'events.json'),
    `${JSON.stringify({ scenarioId: 'analytics-service-paths', events }, null, 2)}\n`
  );
}

describe('analytics paths-to-event service', () => {
  let fixtureDir: string;
  let previousFixtureDir: string | undefined;
  let previousTestMode: string | undefined;

  beforeEach(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpa-path-service-'));
    writeFixture(fixtureDir);
    previousFixtureDir = process.env.E2E_ANALYTICS_FIXTURE_DIR;
    previousTestMode = process.env.E2E_TEST_MODE;
    process.env.E2E_ANALYTICS_FIXTURE_DIR = fixtureDir;
    process.env.E2E_TEST_MODE = '1';
    getOwnedAnalyticsProjectSpy = vi.fn().mockImplementation(({ projectId }) =>
      Promise.resolve({
        id: projectId,
        displayName: 'Path Demo',
        source: 'mcp_codex',
        status: 'active',
        lastEventAt: null,
        mcpRepoName: 'path-demo',
        mcpAppRoot: '.',
        mcpPackageManager: 'pnpm',
        dashboardUrls: {
          project: `https://usetally.xyz/projects/${projectId}`,
          overview: `https://usetally.xyz/projects/${projectId}/overview`,
          live: `https://usetally.xyz/projects/${projectId}/live`,
          sessions: `https://usetally.xyz/projects/${projectId}/sessions`,
        },
      })
    );
  });

  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    if (previousFixtureDir === undefined) delete process.env.E2E_ANALYTICS_FIXTURE_DIR;
    else process.env.E2E_ANALYTICS_FIXTURE_DIR = previousFixtureDir;
    if (previousTestMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = previousTestMode;
  });

  it('returns insufficient_data with suggested events when the exact target event is absent', async () => {
    const result = await getPathsToEvent({
      userId: 'u1',
      projectId: 'proj_absent',
      period: '30d',
      targetEvent: 'signup_completed',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'insufficient_data',
      paths: [],
      coverage: { targetEventTotal: 0, targetEventsWithPriorPath: 0 },
      suggestedEvents: [
        {
          eventName: 'signup_completed',
          priority: 'high',
        },
      ],
    });
  });

  it('returns partial_data when fewer than 5 target events are observed', async () => {
    const result = await getPathsToEvent({
      userId: 'u1',
      projectId: 'proj_few',
      period: '30d',
      targetEvent: 'signup_completed',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'partial_data',
      coverage: { targetEventTotal: 2, targetEventsWithPriorPath: 2 },
    });
    expect(result.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('Fewer than 5 target events')])
    );
  });

  it('returns partial_data when below 50 percent of target events have prior paths', async () => {
    const result = await getPathsToEvent({
      userId: 'u1',
      projectId: 'proj_low_coverage',
      period: '30d',
      targetEvent: 'signup_completed',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'partial_data',
      coverage: { targetEventTotal: 6, targetEventsWithPriorPath: 2 },
    });
    expect(result.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('Fewer than 50%')])
    );
  });

  it('groups path sequences sorted by count descending and sequence string ascending', async () => {
    const result = await getPathsToEvent({
      userId: 'u1',
      projectId: 'proj_sorted',
      period: '30d',
      targetEvent: 'signup_completed',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error(`Expected ok, received ${result.status}`);
    expect(result.paths).toEqual([
      { sequence: ['/a'], targetEventCount: 2, percentage: 40 },
      { sequence: ['/b'], targetEventCount: 2, percentage: 40 },
      { sequence: ['/c'], targetEventCount: 1, percentage: 20 },
    ]);
  });

  it('marks target-event and page-view query caps as partial_data limitations', async () => {
    const result = await getPathsToEvent({
      userId: 'u1',
      projectId: 'proj_caps',
      period: '30d',
      targetEvent: 'signup_completed',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'partial_data',
      coverage: { targetEventTotal: 1001, targetEventsWithPriorPath: 1000 },
    });
    expect(result.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Target event result was capped'),
        expect.stringContaining('Page-view result was capped'),
      ])
    );
  });
});
