import {
  buildE2EOverview,
  buildE2ELiveFeed,
  buildE2ESessions,
  isE2EAnalyticsFixtureMode,
} from './e2e-fixtures';
import {
  buildEventSchema,
  buildNextEventRecommendations,
  buildPathsToEvent,
  eventSchemaFromTinybird,
  eventsInDataWindow,
  fixtureEventRows,
  listEventsFromTinybird,
  normalizeTimestamp,
  pathsToEventRowsFromTinybird,
  summarizeEvents,
  validateAnalyticsEventName,
  validateRecommendationGoal,
} from './event-insights';
import {
  resolveAnalyticsDataWindow,
  serializeAnalyticsDataWindow,
  toTinybirdDateTime64String,
  type AnalyticsPeriod,
  type ResolvedAnalyticsDataWindow,
} from './periods';
import {
  createAnalyticsTinybirdClient,
  escapeAnalyticsSqlString,
  runAnalyticsTinybirdQuery,
  toAnalyticsServiceError,
} from './tinybird';
import type {
  AnalyticsProvenance,
  AnalyticsQuerySemantics,
  AnalyticsServiceResultBase,
  AnalyticsEventSchema,
  AnalyticsEventSummary,
  AnalyticsPathCoverage,
  AnalyticsPathSummary,
  AnalyticsRecommendation,
} from './types';
import type { AnalyticsDashboardUrls } from './urls';
import { getOwnedAnalyticsProject } from '../db/queries/projects';

export * from './periods';
export * from './tinybird';
export * from './types';
export * from './urls';

export type DashboardOverviewResponse = {
  period: AnalyticsPeriod;
  pageViews: { total: number; change: number; timeSeries: Array<{ date: string; count: number }> };
  sessions: { total: number; change: number };
  topPages: Array<{ path: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; count: number; percentage: number }>;
};

export type DashboardSessionsResponse = {
  period: AnalyticsPeriod;
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{ date: string; newSessions: number; returningSessions: number }>;
};

export type DashboardLiveEventsResponse = {
  events: Array<{
    id: string;
    eventType: string;
    path: string;
    referrer: string | null;
    timestamp: string;
    relativeTime: string;
  }>;
  hasMore: boolean;
};

export type ProjectOverviewSuccessResult = AnalyticsServiceResultBase &
  DashboardOverviewResponse & {
    status: 'ok' | 'no_events';
    provenance: AnalyticsProvenance;
    dashboardUrls: AnalyticsDashboardUrls;
  };

export type ProjectOverviewErrorResult = AnalyticsServiceResultBase & {
  status: 'invalid_period' | 'project_not_found' | 'service_error';
  dashboardUrls?: AnalyticsDashboardUrls;
  provenance?: AnalyticsProvenance;
};

export type ProjectOverviewResult = ProjectOverviewSuccessResult | ProjectOverviewErrorResult;

export type SessionsSummarySuccessResult = AnalyticsServiceResultBase &
  DashboardSessionsResponse & {
    status: 'ok' | 'no_events';
    provenance: AnalyticsProvenance;
    dashboardUrls: AnalyticsDashboardUrls;
  };

export type SessionsSummaryErrorResult = AnalyticsServiceResultBase & {
  status: 'invalid_period' | 'project_not_found' | 'service_error';
  dashboardUrls?: AnalyticsDashboardUrls;
  provenance?: AnalyticsProvenance;
};

export type SessionsSummaryResult = SessionsSummarySuccessResult | SessionsSummaryErrorResult;

function analyticsNow(explicitNow?: Date): Date | undefined {
  if (explicitNow) return explicitNow;
  if (!isE2EAnalyticsFixtureMode()) return undefined;

  const raw = process.env.E2E_ANALYTICS_NOW;
  if (!raw) return undefined;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export type LiveEventsSuccessResult = AnalyticsServiceResultBase &
  DashboardLiveEventsResponse & {
    status: 'ok' | 'no_events';
    provenance: AnalyticsProvenance;
    dashboardUrls: AnalyticsDashboardUrls;
  };

export type LiveEventsErrorResult = AnalyticsServiceResultBase & {
  status: 'invalid_limit' | 'invalid_since' | 'project_not_found' | 'service_error';
  dashboardUrls?: AnalyticsDashboardUrls;
  provenance?: AnalyticsProvenance;
};

export type LiveEventsResult = LiveEventsSuccessResult | LiveEventsErrorResult;

export type ParsedLiveEventsQuery =
  | { ok: true; limit: number; since: Date | null }
  | {
      ok: false;
      status: 'invalid_limit' | 'invalid_since';
      summary: string;
    };

export type TopPagesSuccessResult = AnalyticsServiceResultBase & {
  status: 'ok' | 'no_events';
  period: AnalyticsPeriod;
  topPages: DashboardOverviewResponse['topPages'];
  provenance: AnalyticsProvenance;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type TopReferrersSuccessResult = AnalyticsServiceResultBase & {
  status: 'ok' | 'no_events';
  period: AnalyticsPeriod;
  topReferrers: DashboardOverviewResponse['topReferrers'];
  provenance: AnalyticsProvenance;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type TopPagesResult = TopPagesSuccessResult | ProjectOverviewErrorResult;
export type TopReferrersResult = TopReferrersSuccessResult | ProjectOverviewErrorResult;

export type ListEventsSuccessResult = AnalyticsServiceResultBase & {
  status: 'ok' | 'no_events';
  period: AnalyticsPeriod;
  events: AnalyticsEventSummary[];
  provenance: AnalyticsProvenance;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type EventSchemaSuccessResult = AnalyticsServiceResultBase & {
  status: 'ok';
  event: AnalyticsEventSchema;
  provenance: AnalyticsProvenance;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type EventSchemaErrorResult = AnalyticsServiceResultBase & {
  status: 'invalid_event_name' | 'no_events' | 'project_not_found' | 'service_error';
  availableEvents?: string[];
  dashboardUrls?: AnalyticsDashboardUrls;
  provenance?: AnalyticsProvenance;
};

export type ListEventsResult = ListEventsSuccessResult | ProjectOverviewErrorResult;
export type EventSchemaResult = EventSchemaSuccessResult | EventSchemaErrorResult;

export type PathsToEventSuccessResult = AnalyticsServiceResultBase & {
  status: 'ok' | 'partial_data' | 'no_events' | 'insufficient_data';
  projectId: string;
  targetEvent: string;
  period: AnalyticsPeriod;
  paths: AnalyticsPathSummary[];
  coverage: AnalyticsPathCoverage;
  suggestedEvents?: AnalyticsRecommendation[];
  provenance: AnalyticsProvenance;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type PathsToEventErrorResult = AnalyticsServiceResultBase & {
  status: 'invalid_event_name' | 'invalid_limit' | 'invalid_steps' | 'project_not_found' | 'service_error';
  dashboardUrls?: AnalyticsDashboardUrls;
  provenance?: AnalyticsProvenance;
};

export type PathsToEventResult = PathsToEventSuccessResult | PathsToEventErrorResult;

export type NextEventRecommendationsSuccessResult = AnalyticsServiceResultBase & {
  status: 'ok' | 'partial_data' | 'no_events' | 'insufficient_data';
  projectId: string;
  period: AnalyticsPeriod;
  evidence: string[];
  recommendations: AnalyticsRecommendation[];
  createsPendingTasks: false;
  provenance: AnalyticsProvenance;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type NextEventRecommendationsErrorResult = AnalyticsServiceResultBase & {
  status: 'invalid_goal' | 'project_not_found' | 'service_error';
  createsPendingTasks: false;
  dashboardUrls?: AnalyticsDashboardUrls;
  provenance?: AnalyticsProvenance;
};

export type NextEventRecommendationsResult =
  | NextEventRecommendationsSuccessResult
  | NextEventRecommendationsErrorResult;

export function createAnalyticsProvenance(params: {
  projectName: string;
  tool: string;
  semantics: AnalyticsQuerySemantics;
  dataWindow?: ResolvedAnalyticsDataWindow;
  generatedAt?: Date;
}): AnalyticsProvenance {
  return {
    projectName: params.projectName,
    generatedAt: (params.generatedAt ?? new Date()).toISOString(),
    dataWindow: params.dataWindow ? serializeAnalyticsDataWindow(params.dataWindow) : undefined,
    queryBasis: {
      tool: params.tool,
      semantics: params.semantics,
    },
  };
}

export function parseLiveEventsQuery(params: {
  limit?: unknown;
  since?: unknown;
  defaultLimit?: number;
  minLimit?: number;
  maxLimit?: number;
}): ParsedLiveEventsQuery {
  const defaultLimit = params.defaultLimit ?? 20;
  const minLimit = params.minLimit ?? 1;
  const maxLimit = params.maxLimit ?? 100;
  const limitValue = params.limit ?? defaultLimit;
  const limit =
    typeof limitValue === 'number'
      ? limitValue
      : typeof limitValue === 'string' && limitValue.trim() !== ''
        ? Number(limitValue)
        : defaultLimit;

  if (!Number.isInteger(limit) || limit < minLimit || limit > maxLimit) {
    return {
      ok: false,
      status: 'invalid_limit',
      summary: `Limit must be an integer from ${minLimit} to ${maxLimit}.`,
    };
  }

  if (params.since === undefined || params.since === null || params.since === '') {
    return { ok: true, limit, since: null };
  }

  if (typeof params.since !== 'string' && !(params.since instanceof Date)) {
    return { ok: false, status: 'invalid_since', summary: 'Since must be a valid timestamp.' };
  }

  const since = params.since instanceof Date ? params.since : new Date(params.since);
  if (Number.isNaN(since.getTime())) {
    return { ok: false, status: 'invalid_since', summary: 'Since must be a valid timestamp.' };
  }

  return { ok: true, limit, since };
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function overviewStatus(response: DashboardOverviewResponse): 'ok' | 'no_events' {
  return response.pageViews.total === 0 &&
    response.sessions.total === 0 &&
    response.topPages.length === 0 &&
    response.topReferrers.length === 0
    ? 'no_events'
    : 'ok';
}

function overviewSummary(response: DashboardOverviewResponse): string {
  if (overviewStatus(response) === 'no_events') {
    return 'Waiting for first event. Tally is installed, but no production events have been received yet.';
  }

  return `${response.pageViews.total} page views and ${response.sessions.total} sessions in the selected period.`;
}

function sessionsStatus(response: DashboardSessionsResponse): 'ok' | 'no_events' {
  return response.totalSessions === 0 ? 'no_events' : 'ok';
}

function sessionsSummary(response: DashboardSessionsResponse): string {
  if (sessionsStatus(response) === 'no_events') {
    return 'No sessions were recorded in the selected period.';
  }

  return `${response.totalSessions} sessions in the selected period.`;
}

function liveEventsStatus(response: DashboardLiveEventsResponse): 'ok' | 'no_events' {
  return response.events.length === 0 ? 'no_events' : 'ok';
}

function liveEventsSummary(response: DashboardLiveEventsResponse): string {
  if (liveEventsStatus(response) === 'no_events') {
    return 'No recent analytics events were found.';
  }

  return `${response.events.length} recent analytics events returned.`;
}

function withOverviewProvenance(params: {
  response: DashboardOverviewResponse;
  projectName: string;
  dashboardUrls: AnalyticsDashboardUrls;
  dataWindow: ResolvedAnalyticsDataWindow;
  generatedAt?: Date;
}): ProjectOverviewSuccessResult {
  return {
    status: overviewStatus(params.response),
    summary: overviewSummary(params.response),
    provenance: createAnalyticsProvenance({
      projectName: params.projectName,
      tool: 'get_project_overview',
      semantics: 'dashboard_overview',
      dataWindow: params.dataWindow,
      generatedAt: params.generatedAt,
    }),
    dashboardUrls: params.dashboardUrls,
    ...params.response,
  };
}

function withSessionsProvenance(params: {
  response: DashboardSessionsResponse;
  projectName: string;
  dashboardUrls: AnalyticsDashboardUrls;
  dataWindow: ResolvedAnalyticsDataWindow;
  generatedAt?: Date;
}): SessionsSummarySuccessResult {
  return {
    status: sessionsStatus(params.response),
    summary: sessionsSummary(params.response),
    provenance: createAnalyticsProvenance({
      projectName: params.projectName,
      tool: 'get_sessions_summary',
      semantics: 'dashboard_sessions',
      dataWindow: params.dataWindow,
      generatedAt: params.generatedAt,
    }),
    dashboardUrls: params.dashboardUrls,
    ...params.response,
  };
}

function withLiveEventsProvenance(params: {
  response: DashboardLiveEventsResponse;
  projectName: string;
  dashboardUrls: AnalyticsDashboardUrls;
  generatedAt?: Date;
}): LiveEventsSuccessResult {
  return {
    status: liveEventsStatus(params.response),
    summary: liveEventsSummary(params.response),
    provenance: createAnalyticsProvenance({
      projectName: params.projectName,
      tool: 'get_live_events',
      semantics: 'dashboard_live',
      generatedAt: params.generatedAt,
    }),
    dashboardUrls: params.dashboardUrls,
    ...params.response,
  };
}

async function queryProjectOverviewFromTinybird(params: {
  projectId: string;
  period: AnalyticsPeriod;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<DashboardOverviewResponse> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));
  const previousStartSql = escapeAnalyticsSqlString(
    toTinybirdDateTime64String(params.dataWindow.previousStart)
  );
  const previousEndSql = escapeAnalyticsSqlString(
    toTinybirdDateTime64String(params.dataWindow.previousEnd)
  );

  const [
    currentPageViews,
    previousPageViews,
    currentSessionsResult,
    previousSessionsResult,
    topPages,
    topReferrers,
  ] = await Promise.all([
    runAnalyticsTinybirdQuery<{ date: string; count: number }>(
      client,
      'current_page_views_timeseries',
      `
        SELECT
          toDate(timestamp) AS date,
          count() AS count
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND event_type = 'page_view'
        AND timestamp >= toDateTime64('${startSql}', 3)
        AND timestamp < toDateTime64('${endSql}', 3)
        GROUP BY date
        ORDER BY date
      `.trim()
    ),
    runAnalyticsTinybirdQuery<{ date: string; count: number }>(
      client,
      'previous_page_views_timeseries',
      `
        SELECT
          toDate(timestamp) AS date,
          count() AS count
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND event_type = 'page_view'
        AND timestamp >= toDateTime64('${previousStartSql}', 3)
        AND timestamp < toDateTime64('${previousEndSql}', 3)
        GROUP BY date
        ORDER BY date
      `.trim()
    ),
    runAnalyticsTinybirdQuery<{ total: number }>(
      client,
      'current_sessions_total',
      `
        SELECT countIf(event_type = 'session_start') AS total
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND timestamp >= toDateTime64('${startSql}', 3)
        AND timestamp < toDateTime64('${endSql}', 3)
      `.trim()
    ),
    runAnalyticsTinybirdQuery<{ total: number }>(
      client,
      'previous_sessions_total',
      `
        SELECT countIf(event_type = 'session_start') AS total
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND timestamp >= toDateTime64('${previousStartSql}', 3)
        AND timestamp < toDateTime64('${previousEndSql}', 3)
      `.trim()
    ),
    runAnalyticsTinybirdQuery<{ path: string; views: number; percentage: number }>(
      client,
      'top_pages',
      `
        WITH total AS (
          SELECT count() AS total
          FROM events
          WHERE project_id = '${projectIdSql}'
          AND event_type = 'page_view'
          AND timestamp >= toDateTime64('${startSql}', 3)
          AND timestamp < toDateTime64('${endSql}', 3)
        )
        SELECT
          ifNull(e.path, '') AS path,
          count() AS views,
          if(total.total = 0, 0, round(count() * 100.0 / total.total, 2)) AS percentage
        FROM events AS e
        CROSS JOIN total
        WHERE e.project_id = '${projectIdSql}'
        AND e.event_type = 'page_view'
        AND e.timestamp >= toDateTime64('${startSql}', 3)
        AND e.timestamp < toDateTime64('${endSql}', 3)
        GROUP BY path, total.total
        ORDER BY views DESC
        LIMIT 10
      `.trim()
    ),
    runAnalyticsTinybirdQuery<{ referrer_host: string; count: number; percentage: number }>(
      client,
      'top_referrers',
      `
        WITH total AS (
          SELECT count() AS total
          FROM events
          WHERE project_id = '${projectIdSql}'
          AND event_type = 'page_view'
          AND timestamp >= toDateTime64('${startSql}', 3)
          AND timestamp < toDateTime64('${endSql}', 3)
        )
        SELECT
          if(ifNull(e.referrer, '') = '', 'Direct', domain(ifNull(e.referrer, ''))) AS referrer_host,
          count() AS count,
          if(total.total = 0, 0, round(count() * 100.0 / total.total, 2)) AS percentage
        FROM events AS e
        CROSS JOIN total
        WHERE e.project_id = '${projectIdSql}'
        AND e.event_type = 'page_view'
        AND e.timestamp >= toDateTime64('${startSql}', 3)
        AND e.timestamp < toDateTime64('${endSql}', 3)
        GROUP BY referrer_host, total.total
        ORDER BY count DESC
        LIMIT 10
      `.trim()
    ),
  ]);

  const currentPageViewsTotal = currentPageViews.data.reduce(
    (sum, row) => sum + Number(row.count),
    0
  );
  const previousPageViewsTotal = previousPageViews.data.reduce(
    (sum, row) => sum + Number(row.count),
    0
  );

  const currentSessionsTotal = Number(currentSessionsResult.data[0]?.total ?? 0);
  const previousSessionsTotal = Number(previousSessionsResult.data[0]?.total ?? 0);

  return {
    period: params.period,
    pageViews: {
      total: currentPageViewsTotal,
      change: percentChange(currentPageViewsTotal, previousPageViewsTotal),
      timeSeries: currentPageViews.data.map((row) => ({
        date: String(row.date),
        count: Number(row.count),
      })),
    },
    sessions: {
      total: currentSessionsTotal,
      change: percentChange(currentSessionsTotal, previousSessionsTotal),
    },
    topPages: topPages.data.map((row) => ({
      path: String(row.path),
      views: Number(row.views),
      percentage: Number(row.percentage),
    })),
    topReferrers: topReferrers.data.map((row) => ({
      referrer: String(row.referrer_host),
      count: Number(row.count),
      percentage: Number(row.percentage),
    })),
  };
}

async function querySessionsSummaryFromTinybird(params: {
  projectId: string;
  period: AnalyticsPeriod;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<DashboardSessionsResponse> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));

  const result = await runAnalyticsTinybirdQuery<{
    date: string;
    new_sessions: number;
    returning_sessions: number;
  }>(
    client,
    'sessions_timeseries',
    `
      SELECT
        toDate(timestamp) AS date,
        countIf(event_type = 'session_start' AND ifNull(is_returning, 0) != 1) AS new_sessions,
        countIf(event_type = 'session_start' AND ifNull(is_returning, 0) = 1) AS returning_sessions
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      GROUP BY date
      ORDER BY date
    `.trim()
  );

  const timeSeries = result.data.map((row) => ({
    date: String(row.date),
    newSessions: Number(row.new_sessions),
    returningSessions: Number(row.returning_sessions),
  }));

  const totalSessions = timeSeries.reduce(
    (sum, row) => sum + row.newSessions + row.returningSessions,
    0
  );

  return {
    period: params.period,
    totalSessions,
    newVisitors: timeSeries.reduce((sum, row) => sum + row.newSessions, 0),
    returningVisitors: timeSeries.reduce((sum, row) => sum + row.returningSessions, 0),
    timeSeries,
  };
}

async function queryLiveEventsFromTinybird(params: {
  projectId: string;
  limit: number;
  since?: Date | null;
}): Promise<DashboardLiveEventsResponse> {
  const sinceFilter =
    params.since && !Number.isNaN(params.since.getTime())
      ? toTinybirdDateTime64String(params.since)
      : '2024-01-01 00:00:00.000';
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const sinceSql = escapeAnalyticsSqlString(sinceFilter);

  const result = await runAnalyticsTinybirdQuery<{
    event_type: string;
    path: string;
    referrer: string;
    timestamp: string;
    relative_time: string;
  }>(
    client,
    'live_events',
    `
      SELECT
        event_type,
        ifNull(path, '') AS path,
        ifNull(referrer, '') AS referrer,
        toString(e.timestamp) AS timestamp,
        formatReadableTimeDelta(now() - toDateTime(e.timestamp)) AS relative_time
      FROM events AS e
      WHERE e.project_id = '${projectIdSql}'
      AND e.timestamp > toDateTime64('${sinceSql}', 3)
      ORDER BY e.timestamp DESC
      LIMIT ${params.limit}
    `.trim()
  );

  const events: DashboardLiveEventsResponse['events'] = result.data.map((row, index) => {
    const typed = row as Record<string, unknown>;
    const timestamp = normalizeTimestamp(typed.timestamp);
    const referrer =
      typeof typed.referrer === 'string' && typed.referrer.length > 0 ? typed.referrer : null;

    return {
      id: `${timestamp}-${index}`,
      eventType: String(typed.event_type ?? ''),
      path: String(typed.path ?? ''),
      referrer,
      timestamp,
      relativeTime: String(typed.relative_time ?? ''),
    };
  });

  return {
    events,
    hasMore: events.length >= params.limit,
  };
}

export function isProjectOverviewSuccess(
  result: ProjectOverviewResult
): result is ProjectOverviewSuccessResult {
  return result.status === 'ok' || result.status === 'no_events';
}

export function isSessionsSummarySuccess(
  result: SessionsSummaryResult
): result is SessionsSummarySuccessResult {
  return result.status === 'ok' || result.status === 'no_events';
}

export function isLiveEventsSuccess(result: LiveEventsResult): result is LiveEventsSuccessResult {
  return result.status === 'ok' || result.status === 'no_events';
}

export function toDashboardOverviewResponse(
  result: ProjectOverviewSuccessResult
): DashboardOverviewResponse {
  return {
    period: result.period,
    pageViews: result.pageViews,
    sessions: result.sessions,
    topPages: result.topPages,
    topReferrers: result.topReferrers,
  };
}

export function toDashboardSessionsResponse(
  result: SessionsSummarySuccessResult
): DashboardSessionsResponse {
  return {
    period: result.period,
    totalSessions: result.totalSessions,
    newVisitors: result.newVisitors,
    returningVisitors: result.returningVisitors,
    timeSeries: result.timeSeries,
  };
}

export function toDashboardLiveEventsResponse(
  result: LiveEventsSuccessResult
): DashboardLiveEventsResponse {
  return {
    events: result.events,
    hasMore: result.hasMore,
  };
}

export async function getProjectOverview(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  now?: Date;
}): Promise<ProjectOverviewResult> {
  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
    };
  }

  const dataWindow = resolveAnalyticsDataWindow(params.period, analyticsNow(params.now));

  try {
    const response = isE2EAnalyticsFixtureMode()
      ? buildE2EOverview(params.projectId, params.period, dataWindow)
      : await queryProjectOverviewFromTinybird({
          projectId: params.projectId,
          period: params.period,
          dataWindow,
        });

    return withOverviewProvenance({
      response,
      projectName: project.displayName,
      dashboardUrls: project.dashboardUrls,
      dataWindow,
      generatedAt: analyticsNow(params.now),
    });
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_project_overview',
        semantics: 'dashboard_overview',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}

export async function getSessionsSummary(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  now?: Date;
}): Promise<SessionsSummaryResult> {
  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
    };
  }

  const dataWindow = resolveAnalyticsDataWindow(params.period, analyticsNow(params.now));

  try {
    const response = isE2EAnalyticsFixtureMode()
      ? buildE2ESessions(params.projectId, params.period, dataWindow)
      : await querySessionsSummaryFromTinybird({
          projectId: params.projectId,
          period: params.period,
          dataWindow,
        });

    return withSessionsProvenance({
      response,
      projectName: project.displayName,
      dashboardUrls: project.dashboardUrls,
      dataWindow,
      generatedAt: analyticsNow(params.now),
    });
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_sessions_summary',
        semantics: 'dashboard_sessions',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}

export async function getLiveEvents(params: {
  userId: string;
  projectId: string;
  limit: number;
  since?: Date | null;
  now?: Date;
}): Promise<LiveEventsResult> {
  if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100) {
    return {
      status: 'invalid_limit',
      summary: 'Limit must be an integer from 1 to 100.',
    };
  }

  if (params.since && Number.isNaN(params.since.getTime())) {
    return {
      status: 'invalid_since',
      summary: 'Since must be a valid timestamp.',
    };
  }

  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
    };
  }

  try {
    const response = isE2EAnalyticsFixtureMode()
      ? buildE2ELiveFeed({
          projectId: params.projectId,
          limit: params.limit,
          since: params.since,
        })
      : await queryLiveEventsFromTinybird({
          projectId: params.projectId,
          limit: params.limit,
          since: params.since,
        });

    return withLiveEventsProvenance({
      response,
      projectName: project.displayName,
      dashboardUrls: project.dashboardUrls,
      generatedAt: analyticsNow(params.now),
    });
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_live_events',
        semantics: 'dashboard_live',
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}

export async function getTopPages(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  limit?: number;
  now?: Date;
}): Promise<TopPagesResult> {
  const overview = await getProjectOverview(params);
  if (!isProjectOverviewSuccess(overview)) return overview;

  const limit = Math.max(1, Math.min(params.limit ?? 10, 100));
  return {
    status: overview.topPages.length === 0 ? 'no_events' : 'ok',
    summary:
      overview.topPages.length === 0
        ? 'No page views were recorded in the selected period.'
        : `${Math.min(limit, overview.topPages.length)} top pages returned.`,
    period: overview.period,
    topPages: overview.topPages.slice(0, limit),
    provenance: createAnalyticsProvenance({
      projectName: overview.provenance.projectName,
      tool: 'get_top_pages',
      semantics: 'dashboard_overview',
      dataWindow: resolveAnalyticsDataWindow(params.period, analyticsNow(params.now)),
      generatedAt: analyticsNow(params.now),
    }),
    dashboardUrls: overview.dashboardUrls,
  };
}

export async function getTopReferrers(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  limit?: number;
  now?: Date;
}): Promise<TopReferrersResult> {
  const overview = await getProjectOverview(params);
  if (!isProjectOverviewSuccess(overview)) return overview;

  const limit = Math.max(1, Math.min(params.limit ?? 10, 100));
  return {
    status: overview.topReferrers.length === 0 ? 'no_events' : 'ok',
    summary:
      overview.topReferrers.length === 0
        ? 'No referrers were recorded in the selected period.'
        : `${Math.min(limit, overview.topReferrers.length)} top referrers returned.`,
    period: overview.period,
    topReferrers: overview.topReferrers.slice(0, limit),
    provenance: createAnalyticsProvenance({
      projectName: overview.provenance.projectName,
      tool: 'get_top_referrers',
      semantics: 'dashboard_overview',
      dataWindow: resolveAnalyticsDataWindow(params.period, analyticsNow(params.now)),
      generatedAt: analyticsNow(params.now),
    }),
    dashboardUrls: overview.dashboardUrls,
  };
}

export async function listEvents(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  now?: Date;
}): Promise<ListEventsResult> {
  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
    };
  }

  const dataWindow = resolveAnalyticsDataWindow(params.period, analyticsNow(params.now));

  try {
    const events = isE2EAnalyticsFixtureMode()
      ? summarizeEvents(eventsInDataWindow(fixtureEventRows(params.projectId), dataWindow))
      : await listEventsFromTinybird({ projectId: params.projectId, dataWindow });

    return {
      status: events.length === 0 ? 'no_events' : 'ok',
      summary: events.length === 0 ? 'No analytics events were found.' : `${events.length} event types found.`,
      period: params.period,
      events,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'list_events',
        semantics: 'event_discovery',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
      dashboardUrls: project.dashboardUrls,
    };
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'list_events',
        semantics: 'event_discovery',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}

export async function getEventSchema(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  eventName: string;
  now?: Date;
}): Promise<EventSchemaResult> {
  const eventName = validateAnalyticsEventName(params.eventName);
  if (!eventName) {
    return {
      status: 'invalid_event_name',
      summary: 'Event name is required.',
    };
  }

  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
    };
  }

  const dataWindow = resolveAnalyticsDataWindow(params.period, analyticsNow(params.now));

  try {
    const eventSchema = isE2EAnalyticsFixtureMode()
      ? buildEventSchema(
          eventName,
          eventsInDataWindow(fixtureEventRows(params.projectId), dataWindow)
        )
      : await eventSchemaFromTinybird({ projectId: params.projectId, eventName, dataWindow });

    if (!eventSchema) {
      const availableEvents = isE2EAnalyticsFixtureMode()
        ? summarizeEvents(eventsInDataWindow(fixtureEventRows(params.projectId), dataWindow)).map(
            (event) => event.eventName
          )
        : [];
      return {
        status: availableEvents.length === 0 ? 'no_events' : 'invalid_event_name',
        summary:
          availableEvents.length === 0
            ? 'No analytics events were found.'
            : 'Exact event name was not found.',
        availableEvents,
        dashboardUrls: project.dashboardUrls,
        provenance: createAnalyticsProvenance({
          projectName: project.displayName,
          tool: 'get_event_schema',
          semantics: 'event_schema',
          dataWindow,
          generatedAt: analyticsNow(params.now),
        }),
      };
    }

    return {
      status: 'ok',
      summary: `${eventSchema.eventName} was observed ${eventSchema.count} times.`,
      event: eventSchema,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_event_schema',
        semantics: 'event_schema',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
      dashboardUrls: project.dashboardUrls,
    };
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_event_schema',
        semantics: 'event_schema',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}

export async function getPathsToEvent(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  targetEvent: string;
  maxSteps?: number;
  limit?: number;
  now?: Date;
}): Promise<PathsToEventResult> {
  const targetEvent = validateAnalyticsEventName(params.targetEvent);
  if (!targetEvent) {
    return {
      status: 'invalid_event_name',
      summary: 'Target event name is required and must be 128 characters or fewer.',
    };
  }

  const maxSteps = params.maxSteps ?? 5;
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 10) {
    return {
      status: 'invalid_steps',
      summary: 'Max steps must be an integer from 1 to 10.',
    };
  }

  const limit = params.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return {
      status: 'invalid_limit',
      summary: 'Limit must be an integer from 1 to 50.',
    };
  }

  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
    };
  }

  const dataWindow = resolveAnalyticsDataWindow(params.period, analyticsNow(params.now));

  try {
    const events = isE2EAnalyticsFixtureMode()
      ? eventsInDataWindow(fixtureEventRows(params.projectId), dataWindow)
      : await pathsToEventRowsFromTinybird({
          projectId: params.projectId,
          targetEvent,
          dataWindow,
        });
    const result = buildPathsToEvent({ events, targetEvent, maxSteps, limit });

    return {
      ...result,
      projectId: params.projectId,
      targetEvent,
      period: params.period,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_paths_to_event',
        semantics: 'paths_to_event',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
      dashboardUrls: project.dashboardUrls,
    };
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'get_paths_to_event',
        semantics: 'paths_to_event',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}

export async function suggestNextEvents(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  goal?: string;
  now?: Date;
}): Promise<NextEventRecommendationsResult> {
  const goal = validateRecommendationGoal(params.goal);
  if (goal === null) {
    return {
      status: 'invalid_goal',
      summary: 'Goal must be a string from 1 to 200 characters when provided.',
      createsPendingTasks: false,
    };
  }

  const project = await getOwnedAnalyticsProject({
    userId: params.userId,
    projectId: params.projectId,
  });

  if (!project) {
    return {
      status: 'project_not_found',
      summary: 'Project not found.',
      createsPendingTasks: false,
    };
  }

  const dataWindow = resolveAnalyticsDataWindow(params.period, analyticsNow(params.now));

  try {
    const overview = isE2EAnalyticsFixtureMode()
      ? buildE2EOverview(params.projectId, params.period, dataWindow)
      : await queryProjectOverviewFromTinybird({
          projectId: params.projectId,
          period: params.period,
          dataWindow,
        });
    const events = isE2EAnalyticsFixtureMode()
      ? summarizeEvents(eventsInDataWindow(fixtureEventRows(params.projectId), dataWindow))
      : await listEventsFromTinybird({ projectId: params.projectId, dataWindow });
    const result = buildNextEventRecommendations({ goal, overview, events });

    return {
      ...result,
      projectId: params.projectId,
      period: params.period,
      createsPendingTasks: false,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'suggest_next_events',
        semantics: 'next_event_recommendations',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
      dashboardUrls: project.dashboardUrls,
    };
  } catch (error) {
    const serviceError = toAnalyticsServiceError(error);
    return {
      status: serviceError.status,
      summary: serviceError.message,
      createsPendingTasks: false,
      dashboardUrls: project.dashboardUrls,
      provenance: createAnalyticsProvenance({
        projectName: project.displayName,
        tool: 'suggest_next_events',
        semantics: 'next_event_recommendations',
        dataWindow,
        generatedAt: analyticsNow(params.now),
      }),
    };
  }
}
