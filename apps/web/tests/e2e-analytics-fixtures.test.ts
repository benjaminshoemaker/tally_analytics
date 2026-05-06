import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function writeFixture(root: string): void {
  const scenarioDir = path.join(root, 'active-project-with-campaign-data');
  fs.mkdirSync(scenarioDir, { recursive: true });
  fs.writeFileSync(
    path.join(scenarioDir, 'events.json'),
    `${JSON.stringify(
      {
        scenarioId: 'active-project-with-campaign-data',
        events: [
          {
            project_id: 'proj_e2e_campaign',
            session_id: 'sess_google',
            event_type: 'session_start',
            timestamp: '2026-05-01T12:00:00.000Z',
            path: '/',
            referrer: 'https://google.com/search?q=analytics',
            is_returning: 0,
          },
          {
            project_id: 'proj_e2e_campaign',
            session_id: 'sess_google',
            event_type: 'page_view',
            timestamp: '2026-05-01T12:00:05.000Z',
            path: '/',
            referrer: 'https://google.com/search?q=analytics',
          },
          {
            project_id: 'proj_e2e_campaign',
            session_id: 'sess_linkedin',
            event_type: 'session_start',
            timestamp: '2026-05-01T12:30:00.000Z',
            path: '/pricing',
            referrer: 'https://www.linkedin.com/',
            is_returning: 1,
          },
          {
            project_id: 'proj_e2e_campaign',
            session_id: 'sess_linkedin',
            event_type: 'page_view',
            timestamp: '2026-05-01T12:36:00.000Z',
            path: '/signup',
            referrer: 'https://www.linkedin.com/',
          },
        ],
      },
      null,
      2
    )}\n`
  );
}

describe('E2E analytics fixtures', () => {
  let fixtureDir: string;
  let previousFixtureDir: string | undefined;
  let previousNow: string | undefined;

  beforeEach(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpa-fixtures-'));
    writeFixture(fixtureDir);
    previousFixtureDir = process.env.E2E_ANALYTICS_FIXTURE_DIR;
    previousNow = process.env.E2E_ANALYTICS_NOW;
    process.env.E2E_ANALYTICS_FIXTURE_DIR = fixtureDir;
    process.env.E2E_ANALYTICS_NOW = '2026-05-01T12:36:00.001Z';
  });

  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    if (previousFixtureDir === undefined) delete process.env.E2E_ANALYTICS_FIXTURE_DIR;
    else process.env.E2E_ANALYTICS_FIXTURE_DIR = previousFixtureDir;
    if (previousNow === undefined) delete process.env.E2E_ANALYTICS_NOW;
    else process.env.E2E_ANALYTICS_NOW = previousNow;
  });

  it('builds deterministic overview, sessions, and live-feed responses', async () => {
    const { buildE2EOverview, buildE2ESessions, buildE2ELiveFeed } =
      await import('../lib/analytics/e2e-fixtures');

    expect(buildE2EOverview('proj_e2e_campaign', '7d')).toMatchObject({
      period: '7d',
      pageViews: {
        total: 2,
        change: 100,
        timeSeries: [{ date: '2026-05-01', count: 2 }],
      },
      sessions: { total: 2, change: 100 },
      topPages: [
        { path: '/', views: 1, percentage: 50 },
        { path: '/signup', views: 1, percentage: 50 },
      ],
      topReferrers: [
        { referrer: 'google.com', count: 1, percentage: 50 },
        { referrer: 'www.linkedin.com', count: 1, percentage: 50 },
      ],
    });

    expect(buildE2ESessions('proj_e2e_campaign', '7d')).toEqual({
      period: '7d',
      totalSessions: 2,
      newVisitors: 1,
      returningVisitors: 1,
      timeSeries: [{ date: '2026-05-01', newSessions: 1, returningSessions: 1 }],
    });

    expect(buildE2ELiveFeed({ projectId: 'proj_e2e_campaign', limit: 2 })).toMatchObject({
      events: [
        { eventType: 'page_view', path: '/signup', timestamp: '2026-05-01T12:36:00.000Z' },
        { eventType: 'session_start', path: '/pricing', timestamp: '2026-05-01T12:30:00.000Z' },
      ],
      hasMore: true,
    });
  });
});
