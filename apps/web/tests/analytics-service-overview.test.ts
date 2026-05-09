import { beforeEach, describe, expect, it, vi } from 'vitest';

let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;
let createTinybirdClientFromEnvSpy: ReturnType<typeof vi.fn> | undefined;
let tinybirdSqlSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock('../lib/db/queries/projects', () => ({
  getOwnedAnalyticsProject: (...args: unknown[]) => {
    if (!getOwnedAnalyticsProjectSpy) throw new Error('getOwnedAnalyticsProjectSpy not initialized');
    return getOwnedAnalyticsProjectSpy(...args);
  },
}));

vi.mock('../lib/tinybird/client', () => ({
  createTinybirdClientFromEnv: (...args: unknown[]) => {
    if (!createTinybirdClientFromEnvSpy) {
      throw new Error('createTinybirdClientFromEnvSpy not initialized');
    }
    return createTinybirdClientFromEnvSpy(...args);
  },
  tinybirdSql: (...args: unknown[]) => {
    if (!tinybirdSqlSpy) throw new Error('tinybirdSqlSpy not initialized');
    return tinybirdSqlSpy(...args);
  },
}));

beforeEach(() => {
  vi.resetModules();
  getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue({
    id: 'proj_123',
    displayName: 'Example App',
    source: 'mcp_codex',
    status: 'active',
    lastEventAt: null,
    mcpRepoName: 'repo',
    mcpAppRoot: 'apps/web',
    mcpPackageManager: 'pnpm',
    dashboardUrls: {
      project: 'https://usetally.xyz/projects/proj_123',
      overview: 'https://usetally.xyz/projects/proj_123/overview',
      live: 'https://usetally.xyz/projects/proj_123/live',
      sessions: 'https://usetally.xyz/projects/proj_123/sessions',
    },
  });
  createTinybirdClientFromEnvSpy = vi.fn().mockReturnValue({ apiUrl: 'x', token: 'y' });
  tinybirdSqlSpy = vi.fn();
  delete process.env.E2E_TEST_MODE;
});

function mockOverviewTinybirdData(): void {
  if (!tinybirdSqlSpy) throw new Error('tinybirdSqlSpy not initialized');
  tinybirdSqlSpy
    .mockResolvedValueOnce({
      data: [
        { date: '2026-05-08', count: 10 },
        { date: '2026-05-09', count: 20 },
      ],
    })
    .mockResolvedValueOnce({ data: [{ date: '2026-05-01', count: 15 }] })
    .mockResolvedValueOnce({ data: [{ total: 5 }] })
    .mockResolvedValueOnce({ data: [{ total: 10 }] })
    .mockResolvedValueOnce({
      data: [
        { path: '/', views: 20, percentage: 66.67 },
        { path: '/pricing', views: 10, percentage: 33.33 },
      ],
    })
    .mockResolvedValueOnce({
      data: [
        { referrer_host: 'Direct', count: 5, percentage: 62.5 },
        { referrer_host: 'google.com', count: 3, percentage: 37.5 },
      ],
    });
}

describe('analytics service overview primitives', () => {
  it('accepts only supported analytics periods and defaults missing values', async () => {
    const { ANALYTICS_PERIODS, parseAnalyticsPeriod } = await import('../lib/analytics/service');

    expect(ANALYTICS_PERIODS).toEqual(['24h', '7d', '30d']);
    expect(parseAnalyticsPeriod(null)).toBe('7d');
    expect(parseAnalyticsPeriod(undefined)).toBe('7d');
    expect(parseAnalyticsPeriod('')).toBe('7d');
    expect(parseAnalyticsPeriod('24h')).toBe('24h');
    expect(parseAnalyticsPeriod('7d')).toBe('7d');
    expect(parseAnalyticsPeriod('30d')).toBe('30d');
    expect(parseAnalyticsPeriod('1h')).toBeNull();
    expect(parseAnalyticsPeriod('14d')).toBeNull();
    expect(parseAnalyticsPeriod('7D')).toBeNull();
  });

  it('resolves rolling UTC windows with dataThrough set to the window end', async () => {
    const { resolveAnalyticsDataWindow, serializeAnalyticsDataWindow } = await import(
      '../lib/analytics/service'
    );
    const now = new Date('2026-05-09T12:34:56.789Z');

    expect(serializeAnalyticsDataWindow(resolveAnalyticsDataWindow('24h', now))).toEqual({
      period: '24h',
      start: '2026-05-08T12:34:56.789Z',
      end: '2026-05-09T12:34:56.789Z',
      timezone: 'UTC',
      dataThrough: '2026-05-09T12:34:56.789Z',
    });

    expect(serializeAnalyticsDataWindow(resolveAnalyticsDataWindow('7d', now))).toMatchObject({
      period: '7d',
      start: '2026-05-02T12:34:56.789Z',
      end: '2026-05-09T12:34:56.789Z',
      dataThrough: '2026-05-09T12:34:56.789Z',
    });

    expect(serializeAnalyticsDataWindow(resolveAnalyticsDataWindow('30d', now))).toMatchObject({
      period: '30d',
      start: '2026-04-09T12:34:56.789Z',
      end: '2026-05-09T12:34:56.789Z',
      dataThrough: '2026-05-09T12:34:56.789Z',
    });
  });

  it('preserves previous rolling window boundaries for dashboard comparisons', async () => {
    const { resolveAnalyticsDataWindow, toTinybirdDateTime64String } = await import(
      '../lib/analytics/service'
    );
    const window = resolveAnalyticsDataWindow('7d', new Date('2026-05-09T00:00:00.000Z'));

    expect(window.previousStart.toISOString()).toBe('2026-04-25T00:00:00.000Z');
    expect(window.previousEnd.toISOString()).toBe('2026-05-02T00:00:00.000Z');
    expect(toTinybirdDateTime64String(window.start)).toBe('2026-05-02 00:00:00.000');
  });

  it('creates project provenance for agent-readable responses', async () => {
    const { createAnalyticsProvenance, resolveAnalyticsDataWindow } = await import(
      '../lib/analytics/service'
    );
    const dataWindow = resolveAnalyticsDataWindow('7d', new Date('2026-05-09T12:00:00.000Z'));

    expect(
      createAnalyticsProvenance({
        projectName: 'Example App',
        tool: 'get_project_overview',
        semantics: 'dashboard_overview',
        dataWindow,
        generatedAt: new Date('2026-05-09T12:01:00.000Z'),
      })
    ).toEqual({
      projectName: 'Example App',
      generatedAt: '2026-05-09T12:01:00.000Z',
      dataWindow: {
        period: '7d',
        start: '2026-05-02T12:00:00.000Z',
        end: '2026-05-09T12:00:00.000Z',
        timezone: 'UTC',
        dataThrough: '2026-05-09T12:00:00.000Z',
      },
      queryBasis: {
        tool: 'get_project_overview',
        semantics: 'dashboard_overview',
      },
    });
  });

  it('returns ok overview data with project provenance and exact data window', async () => {
    mockOverviewTinybirdData();

    const { getProjectOverview } = await import('../lib/analytics/service');
    const result = await getProjectOverview({
      userId: 'u1',
      projectId: 'proj_123',
      period: '7d',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'ok',
      period: '7d',
      pageViews: { total: 30, change: 100 },
      sessions: { total: 5, change: -50 },
      topPages: [
        { path: '/', views: 20, percentage: 66.67 },
        { path: '/pricing', views: 10, percentage: 33.33 },
      ],
      topReferrers: [
        { referrer: 'Direct', count: 5, percentage: 62.5 },
        { referrer: 'google.com', count: 3, percentage: 37.5 },
      ],
      dashboardUrls: {
        project: 'https://usetally.xyz/projects/proj_123',
        overview: 'https://usetally.xyz/projects/proj_123/overview',
      },
      provenance: {
        projectName: 'Example App',
        generatedAt: '2026-05-09T12:00:00.000Z',
        dataWindow: {
          period: '7d',
          start: '2026-05-02T12:00:00.000Z',
          end: '2026-05-09T12:00:00.000Z',
          timezone: 'UTC',
          dataThrough: '2026-05-09T12:00:00.000Z',
        },
        queryBasis: {
          tool: 'get_project_overview',
          semantics: 'dashboard_overview',
        },
      },
    });
  });

  it('returns no_events overview status with zero metrics for empty projects', async () => {
    tinybirdSqlSpy = vi
      .fn()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ total: 0 }] })
      .mockResolvedValueOnce({ data: [{ total: 0 }] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    const { getProjectOverview } = await import('../lib/analytics/service');
    const result = await getProjectOverview({
      userId: 'u1',
      projectId: 'proj_123',
      period: '24h',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'no_events',
      summary: 'Waiting for first event. Tally is installed, but no production events have been received yet.',
      period: '24h',
      pageViews: { total: 0, change: 0, timeSeries: [] },
      sessions: { total: 0, change: 0 },
      topPages: [],
      topReferrers: [],
    });
  });

  it('returns sessions summary with existing Tinybird returning visitor semantics', async () => {
    tinybirdSqlSpy = vi.fn().mockResolvedValueOnce({
      data: [
        { date: '2026-05-08', sessions: 2 },
        { date: '2026-05-09', sessions: 3 },
      ],
    });

    const { getSessionsSummary } = await import('../lib/analytics/service');
    const result = await getSessionsSummary({
      userId: 'u1',
      projectId: 'proj_123',
      period: '7d',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'ok',
      totalSessions: 5,
      newVisitors: 5,
      returningVisitors: 0,
      timeSeries: [
        { date: '2026-05-08', newSessions: 2, returningSessions: 0 },
        { date: '2026-05-09', newSessions: 3, returningSessions: 0 },
      ],
      provenance: {
        projectName: 'Example App',
        queryBasis: {
          tool: 'get_sessions_summary',
          semantics: 'dashboard_sessions',
        },
      },
    });
  });

  it('returns top pages and top referrers that match overview values for the same period', async () => {
    mockOverviewTinybirdData();

    const { getProjectOverview, getTopPages, getTopReferrers } = await import(
      '../lib/analytics/service'
    );
    const overview = await getProjectOverview({
      userId: 'u1',
      projectId: 'proj_123',
      period: '7d',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    mockOverviewTinybirdData();
    const topPages = await getTopPages({
      userId: 'u1',
      projectId: 'proj_123',
      period: '7d',
      limit: 1,
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    mockOverviewTinybirdData();
    const topReferrers = await getTopReferrers({
      userId: 'u1',
      projectId: 'proj_123',
      period: '7d',
      limit: 1,
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(overview).toMatchObject({
      status: 'ok',
      topPages: [
        { path: '/', views: 20, percentage: 66.67 },
        { path: '/pricing', views: 10, percentage: 33.33 },
      ],
      topReferrers: [
        { referrer: 'Direct', count: 5, percentage: 62.5 },
        { referrer: 'google.com', count: 3, percentage: 37.5 },
      ],
    });
    expect(topPages).toMatchObject({
      status: 'ok',
      topPages: [{ path: '/', views: 20, percentage: 66.67 }],
      provenance: { queryBasis: { tool: 'get_top_pages' } },
    });
    expect(topReferrers).toMatchObject({
      status: 'ok',
      topReferrers: [{ referrer: 'Direct', count: 5, percentage: 62.5 }],
      provenance: { queryBasis: { tool: 'get_top_referrers' } },
    });
  });

  it('validates live event limit and since inputs', async () => {
    const { getLiveEvents } = await import('../lib/analytics/service');

    await expect(
      getLiveEvents({ userId: 'u1', projectId: 'proj_123', limit: 0 })
    ).resolves.toMatchObject({ status: 'invalid_limit' });
    await expect(
      getLiveEvents({
        userId: 'u1',
        projectId: 'proj_123',
        limit: 1,
        since: new Date('not-a-date'),
      })
    ).resolves.toMatchObject({ status: 'invalid_since' });
  });

  it('returns live events in query order and reports hasMore', async () => {
    tinybirdSqlSpy = vi.fn().mockResolvedValueOnce({
      data: [
        {
          event_type: 'page_view',
          path: '/pricing',
          referrer: 'https://google.com/search?q=tally',
          timestamp: '2026-05-09 12:00:00.000',
          relative_time: '3 seconds ago',
        },
        {
          event_type: 'session_start',
          path: '/',
          referrer: '',
          timestamp: '2026-05-09T11:59:00.000Z',
          relative_time: '1 minute ago',
        },
      ],
    });

    const { getLiveEvents } = await import('../lib/analytics/service');
    const result = await getLiveEvents({
      userId: 'u1',
      projectId: 'proj_123',
      limit: 2,
      since: new Date('2026-05-09T00:00:00.000Z'),
      now: new Date('2026-05-09T12:00:03.000Z'),
    });

    expect(result).toMatchObject({
      status: 'ok',
      events: [
        {
          eventType: 'page_view',
          path: '/pricing',
          referrer: 'https://google.com/search?q=tally',
          timestamp: '2026-05-09T12:00:00.000Z',
          relativeTime: '3 seconds ago',
        },
        {
          eventType: 'session_start',
          path: '/',
          referrer: null,
          timestamp: '2026-05-09T11:59:00.000Z',
          relativeTime: '1 minute ago',
        },
      ],
      hasMore: true,
      provenance: {
        queryBasis: {
          tool: 'get_live_events',
          semantics: 'dashboard_live',
        },
      },
    });
  });

  it('returns no_events for an empty live feed with hasMore false', async () => {
    tinybirdSqlSpy = vi.fn().mockResolvedValueOnce({ data: [] });

    const { getLiveEvents } = await import('../lib/analytics/service');
    const result = await getLiveEvents({
      userId: 'u1',
      projectId: 'proj_123',
      limit: 5,
      now: new Date('2026-05-09T12:00:03.000Z'),
    });

    expect(result).toMatchObject({
      status: 'no_events',
      events: [],
      hasMore: false,
    });
  });
});
