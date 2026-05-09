import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  boundAnalyticsString,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsUrl,
  suggestNextEvents,
} from '../lib/analytics/service';

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
  referrer?: string;
};

function timestamp(offsetSeconds: number): string {
  return new Date(Date.UTC(2026, 4, 1, 12, 0, offsetSeconds)).toISOString();
}

function writeFixture(root: string): void {
  const events: FixtureEvent[] = [
    {
      project_id: 'proj_recommend',
      session_id: 'recommend_001',
      event_type: 'session_start',
      timestamp: timestamp(1),
      path: '/',
    },
    {
      project_id: 'proj_recommend',
      session_id: 'recommend_001',
      event_type: 'page_view',
      timestamp: timestamp(2),
      path: '/signup?email=private@example.com',
      referrer: 'https://news.ycombinator.com/item?id=123',
    },
    {
      project_id: 'proj_recommend',
      session_id: 'recommend_002',
      event_type: 'page_view',
      timestamp: timestamp(3),
      path: '/onboarding',
      referrer: 'https://google.com/search?q=tally',
    },
    {
      project_id: 'proj_recommend',
      session_id: 'recommend_003',
      event_type: 'page_view',
      timestamp: timestamp(4),
      path: '/pricing',
      referrer: '',
    },
    {
      project_id: 'proj_recommend',
      session_id: 'recommend_004',
      event_type: 'page_view',
      timestamp: timestamp(5),
      path: '/checkout',
      referrer: '',
    },
    {
      project_id: 'proj_recommend',
      session_id: 'recommend_005',
      event_type: 'page_view',
      timestamp: timestamp(6),
      path: '/features/import',
      referrer: '',
    },
    {
      project_id: 'proj_signup_observed',
      session_id: 'observed_001',
      event_type: 'page_view',
      timestamp: timestamp(7),
      path: '/signup',
    },
    {
      project_id: 'proj_signup_observed',
      session_id: 'observed_001',
      event_type: 'signup_started',
      timestamp: timestamp(8),
      path: '/signup',
    },
    {
      project_id: 'proj_signup_observed',
      session_id: 'observed_001',
      event_type: 'signup_completed',
      timestamp: timestamp(9),
      path: '/welcome',
    },
    {
      project_id: 'proj_unknown_goal',
      session_id: 'unknown_001',
      event_type: 'page_view',
      timestamp: timestamp(10),
      path: '/docs',
    },
  ];

  const scenarioDir = path.join(root, 'analytics-service-recommendations');
  fs.mkdirSync(scenarioDir, { recursive: true });
  fs.writeFileSync(
    path.join(scenarioDir, 'events.json'),
    `${JSON.stringify({ scenarioId: 'analytics-service-recommendations', events }, null, 2)}\n`
  );
}

describe('analytics next-event recommendation service', () => {
  let fixtureDir: string;
  let previousFixtureDir: string | undefined;
  let previousTestMode: string | undefined;

  beforeEach(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpa-recommendation-service-'));
    writeFixture(fixtureDir);
    previousFixtureDir = process.env.E2E_ANALYTICS_FIXTURE_DIR;
    previousTestMode = process.env.E2E_TEST_MODE;
    process.env.E2E_ANALYTICS_FIXTURE_DIR = fixtureDir;
    process.env.E2E_TEST_MODE = '1';
    getOwnedAnalyticsProjectSpy = vi.fn().mockImplementation(({ projectId }) =>
      Promise.resolve({
        id: projectId,
        displayName: 'Recommendation Demo',
        source: 'mcp_codex',
        status: 'active',
        lastEventAt: null,
        mcpRepoName: 'recommendation-demo',
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

  async function recommendationNames(goal: string): Promise<string[]> {
    const result = await suggestNextEvents({
      userId: 'u1',
      projectId: 'proj_recommend',
      period: '30d',
      goal,
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result.status).toBe('partial_data');
    expect(result.createsPendingTasks).toBe(false);
    return result.status === 'partial_data'
      ? result.recommendations.map((recommendation) => recommendation.eventName)
      : [];
  }

  it('matches signup and account goals to canonical signup events', async () => {
    await expect(recommendationNames('Understand signup funnel dropoff')).resolves.toEqual(
      expect.arrayContaining(['signup_started', 'signup_completed'])
    );
  });

  it('matches onboarding, pricing/CTA, checkout/payment, and feature-usage goal terms', async () => {
    await expect(recommendationNames('Improve onboarding completion')).resolves.toEqual(
      expect.arrayContaining(['onboarding_started', 'onboarding_completed'])
    );
    await expect(recommendationNames('Which pricing CTA drives conversion?')).resolves.toEqual(
      expect.arrayContaining(['pricing_cta_clicked'])
    );
    await expect(recommendationNames('Measure checkout and payment dropoff')).resolves.toEqual(
      expect.arrayContaining(['checkout_started', 'checkout_completed'])
    );
    await expect(recommendationNames('Understand feature usage and activation')).resolves.toEqual(
      expect.arrayContaining(['feature_used'])
    );
  });

  it('suppresses recommendations for events already observed in the selected period', async () => {
    const result = await suggestNextEvents({
      userId: 'u1',
      projectId: 'proj_signup_observed',
      period: '30d',
      goal: 'Understand signup funnel dropoff',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'ok',
      recommendations: [],
      createsPendingTasks: false,
    });
  });

  it('returns no_events without recommendations for empty projects', async () => {
    const result = await suggestNextEvents({
      userId: 'u1',
      projectId: 'proj_empty',
      period: '30d',
      goal: 'Understand signup funnel dropoff',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'no_events',
      summary: expect.stringContaining('production events'),
      recommendations: [],
      createsPendingTasks: false,
    });
  });

  it('returns partial_data with evidence and limitations when lifecycle events are missing', async () => {
    const result = await suggestNextEvents({
      userId: 'u1',
      projectId: 'proj_recommend',
      period: '30d',
      goal: 'Understand signup funnel dropoff',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'partial_data',
      evidence: expect.arrayContaining([expect.stringContaining('Top pages include')]),
      limitations: expect.arrayContaining([expect.stringContaining('missing')]),
      createsPendingTasks: false,
    });
  });

  it('returns insufficient_data when the goal cannot be connected to observed patterns', async () => {
    const result = await suggestNextEvents({
      userId: 'u1',
      projectId: 'proj_unknown_goal',
      period: '30d',
      goal: 'Measure partner attribution quality',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'insufficient_data',
      evidence: expect.arrayContaining([expect.stringContaining('Observed')]),
      limitations: expect.arrayContaining([expect.stringContaining('No observed')]),
      recommendations: [
        {
          eventName: 'feature_used',
          priority: 'low',
        },
      ],
      createsPendingTasks: false,
    });
  });

  it('never creates pending tasks or calls known pending-task write paths', async () => {
    const result = await suggestNextEvents({
      userId: 'u1',
      projectId: 'proj_recommend',
      period: '30d',
      goal: 'Understand signup funnel dropoff',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result.createsPendingTasks).toBe(false);

    const serviceSource = fs.readFileSync(
      path.join(process.cwd(), 'lib', 'analytics', 'service.ts'),
      'utf8'
    );
    expect(serviceSource).not.toMatch(/db\.insert|createPending|pendingTasks|regenerateRequests/);
  });
});

describe('analytics service recommendation sanitization', () => {
  it('strips private URL details from recommendation evidence', () => {
    expect(sanitizeAnalyticsUrl('https://app.example.com/checkout?session=secret#complete')).toBe(
      'https://app.example.com/checkout'
    );
    expect(sanitizeAnalyticsPath('/onboarding?invite=private#step-2')).toBe('/onboarding');
  });

  it('bounds recommendation goal text before it is echoed in tool results', () => {
    const goal = `Understand signup behavior ${'and conversion '.repeat(40)}`;

    expect(boundAnalyticsString(goal, 80)).toHaveLength(80);
    expect(boundAnalyticsString(goal, 80)).toMatch(/^Understand signup behavior/);
  });

  it('renders referrer evidence as display hosts rather than raw URLs', () => {
    expect(sanitizeAnalyticsReferrer('https://news.ycombinator.com/item?id=123#comments')).toBe(
      'news.ycombinator.com'
    );
  });
});
