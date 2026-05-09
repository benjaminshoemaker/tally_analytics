import {
  buildE2EOverview,
  buildE2ELiveFeed,
  buildE2ESessions,
  isE2EAnalyticsFixtureMode,
  loadE2EAnalyticsEvents,
} from './e2e-fixtures';
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
import {
  boundAnalyticsString,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsUrl,
} from './urls';
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

  const result = await runAnalyticsTinybirdQuery<{ date: string; sessions: number }>(
    client,
    'sessions_timeseries',
    `
      SELECT
        toDate(timestamp) AS date,
        countIf(event_type = 'session_start') AS sessions
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
    newSessions: Number(row.sessions),
    returningSessions: 0,
  }));

  const totalSessions = timeSeries.reduce(
    (sum, row) => sum + row.newSessions + row.returningSessions,
    0
  );

  return {
    period: params.period,
    totalSessions,
    newVisitors: totalSessions,
    returningVisitors: 0,
    timeSeries,
  };
}

function normalizeTimestamp(value: unknown): string {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (raw.includes('T')) return raw;

  const iso = raw.replace(' ', 'T');
  return iso.endsWith('Z') ? iso : `${iso}Z`;
}

const PROPERTY_NAME_MAP: Record<string, string> = {
  session_id: 'sessionId',
  user_id: 'userId',
  visitor_id: 'visitorId',
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
  engagement_time_ms: 'engagementTimeMs',
  scroll_depth: 'scrollDepth',
  cta_clicks: 'ctaClicks',
  screen_width: 'screenWidth',
  is_returning: 'isReturning',
  signup_method: 'signupMethod',
};

const RAW_IDENTIFIER_PROPERTY_NAMES = new Set([
  'project_id',
  'projectId',
  'session_id',
  'sessionId',
  'visitor_id',
  'visitorId',
  'user_id',
  'userId',
  'event_type',
  'eventType',
  'timestamp',
  'user_agent',
  'userAgent',
]);

type AnalyticsFixtureEventRow = Record<string, unknown> & { event_type: string; timestampMs: number };

const PATH_TARGET_EVENT_QUERY_CAP = 1000;
const PATH_PAGE_VIEW_QUERY_CAP = 10000;

function fixtureEventRows(projectId: string): AnalyticsFixtureEventRow[] {
  return loadE2EAnalyticsEvents(projectId).flatMap((event) => {
    const eventType = event.event_type;
    const timestampMs = event.timestampMs;
    if (typeof eventType !== 'string' || !Number.isFinite(timestampMs)) return [];
    return [{ ...event, event_type: eventType, timestampMs }];
  });
}

function camelCasePropertyName(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function normalizeEventPropertyName(name: string): string {
  return PROPERTY_NAME_MAP[name] ?? camelCasePropertyName(name);
}

function safeEventPropertyValue(name: string, value: unknown, limit = 128): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (name === 'url') return boundAnalyticsString(sanitizeAnalyticsUrl(value), limit);
  if (name === 'path') return boundAnalyticsString(sanitizeAnalyticsPath(value), limit);
  if (name === 'referrer') return boundAnalyticsString(sanitizeAnalyticsReferrer(value), limit);
  return boundAnalyticsString(value, limit);
}

function safeEventProperties(event: Record<string, unknown>): Map<string, string> {
  const properties = new Map<string, string>();

  for (const [rawName, rawValue] of Object.entries(event)) {
    const normalizedName = normalizeEventPropertyName(rawName);
    if (RAW_IDENTIFIER_PROPERTY_NAMES.has(rawName) || RAW_IDENTIFIER_PROPERTY_NAMES.has(normalizedName)) {
      continue;
    }

    const value = safeEventPropertyValue(rawName, rawValue);
    if (!value) continue;
    properties.set(normalizedName, value);
  }

  return properties;
}

function eventsInDataWindow(
  events: AnalyticsFixtureEventRow[],
  dataWindow: ResolvedAnalyticsDataWindow
): AnalyticsFixtureEventRow[] {
  return events.filter(
    (event) =>
      event.timestampMs >= dataWindow.start.getTime() && event.timestampMs < dataWindow.end.getTime()
  );
}

function summarizeEvents(
  events: AnalyticsFixtureEventRow[]
): AnalyticsEventSummary[] {
  const summaries = new Map<
    string,
    { count: number; firstSeenMs: number; lastSeenMs: number; propertyCounts: Map<string, number> }
  >();

  for (const event of events) {
    const current =
      summaries.get(event.event_type) ??
      {
        count: 0,
        firstSeenMs: event.timestampMs,
        lastSeenMs: event.timestampMs,
        propertyCounts: new Map<string, number>(),
      };

    current.count += 1;
    current.firstSeenMs = Math.min(current.firstSeenMs, event.timestampMs);
    current.lastSeenMs = Math.max(current.lastSeenMs, event.timestampMs);
    for (const propertyName of safeEventProperties(event).keys()) {
      current.propertyCounts.set(propertyName, (current.propertyCounts.get(propertyName) ?? 0) + 1);
    }
    summaries.set(event.event_type, current);
  }

  return Array.from(summaries.entries())
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([eventName, summary]) => ({
      eventName,
      count: summary.count,
      firstSeenAt: new Date(summary.firstSeenMs).toISOString(),
      lastSeenAt: new Date(summary.lastSeenMs).toISOString(),
      commonProperties: Array.from(summary.propertyCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12)
        .map(([propertyName]) => propertyName),
    }));
}

function buildEventSchema(
  eventName: string,
  events: AnalyticsFixtureEventRow[]
): AnalyticsEventSchema | null {
  const matching = events.filter((event) => event.event_type === eventName);
  if (matching.length === 0) return null;

  const propertySummaries = new Map<string, { observedCount: number; examples: string[] }>();
  for (const event of matching) {
    for (const [propertyName, value] of safeEventProperties(event).entries()) {
      const current = propertySummaries.get(propertyName) ?? { observedCount: 0, examples: [] };
      current.observedCount += 1;
      if (!current.examples.includes(value) && current.examples.length < 3) {
        current.examples.push(value);
      }
      propertySummaries.set(propertyName, current);
    }
  }

  const timestamps = matching.map((event) => event.timestampMs);
  return {
    eventName,
    count: matching.length,
    firstSeenAt: new Date(Math.min(...timestamps)).toISOString(),
    lastSeenAt: new Date(Math.max(...timestamps)).toISOString(),
    properties: Array.from(propertySummaries.entries())
      .sort((a, b) => b[1].observedCount - a[1].observedCount || a[0].localeCompare(b[0]))
      .map(([name, property]) => ({ name, ...property })),
  };
}

function validateAnalyticsEventName(value: string): string | null {
  const bounded = boundAnalyticsString(value, 129);
  if (!bounded || bounded.length > 128) return null;
  return bounded;
}

function eventSessionId(event: AnalyticsFixtureEventRow): string | null {
  const sessionId = event.session_id;
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
}

function eventPath(event: AnalyticsFixtureEventRow): string {
  return sanitizeAnalyticsPath(event.path);
}

function roundedAnalyticsPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count * 10000) / total) / 100;
}

function suggestedEventsForTarget(targetEvent: string): AnalyticsRecommendation[] {
  const lower = targetEvent.toLowerCase();
  const reason = lower.includes('signup')
    ? 'Needed to answer which pages users visit before signup.'
    : `Needed to answer which pages users visit before ${targetEvent}.`;

  return [{ eventName: targetEvent, reason, priority: 'high' }];
}

function buildPathsToEvent(params: {
  events: AnalyticsFixtureEventRow[];
  targetEvent: string;
  maxSteps: number;
  limit: number;
}): Pick<
  PathsToEventSuccessResult,
  'status' | 'summary' | 'paths' | 'coverage' | 'limitations' | 'suggestedEvents'
> {
  const events = [...params.events].sort((a, b) => a.timestampMs - b.timestampMs);
  const coverage: AnalyticsPathCoverage = {
    targetEventTotal: 0,
    targetEventsWithPriorPath: 0,
  };

  if (events.length === 0) {
    return {
      status: 'no_events',
      summary: 'No analytics events were found.',
      paths: [],
      coverage,
    };
  }

  const targetEventsAll = events.filter((event) => event.event_type === params.targetEvent);
  coverage.targetEventTotal = targetEventsAll.length;

  if (targetEventsAll.length === 0) {
    return {
      status: 'insufficient_data',
      summary: `${params.targetEvent} was not observed in the selected period.`,
      paths: [],
      coverage,
      limitations: [`Target event "${params.targetEvent}" was not observed in the selected period.`],
      suggestedEvents: suggestedEventsForTarget(params.targetEvent),
    };
  }

  const pageViewsAll = events.filter((event) => event.event_type === 'page_view');
  const targetCapHit = targetEventsAll.length > PATH_TARGET_EVENT_QUERY_CAP;
  const pageViewCapHit = pageViewsAll.length > PATH_PAGE_VIEW_QUERY_CAP;
  const targetEvents = targetEventsAll.slice(0, PATH_TARGET_EVENT_QUERY_CAP);
  const pageViews = pageViewsAll.slice(0, PATH_PAGE_VIEW_QUERY_CAP);
  const pageViewsBySession = new Map<string, AnalyticsFixtureEventRow[]>();

  for (const pageView of pageViews) {
    const sessionId = eventSessionId(pageView);
    if (!sessionId) continue;
    const current = pageViewsBySession.get(sessionId) ?? [];
    current.push(pageView);
    pageViewsBySession.set(sessionId, current);
  }

  const pathCounts = new Map<string, { sequence: string[]; count: number }>();

  for (const targetEvent of targetEvents) {
    const sessionId = eventSessionId(targetEvent);
    if (!sessionId) continue;

    const priorPaths = (pageViewsBySession.get(sessionId) ?? [])
      .filter((event) => event.timestampMs < targetEvent.timestampMs)
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .slice(-params.maxSteps)
      .map(eventPath)
      .filter((path) => path.length > 0);

    if (priorPaths.length === 0) continue;

    coverage.targetEventsWithPriorPath += 1;
    const key = JSON.stringify(priorPaths);
    const current = pathCounts.get(key) ?? { sequence: priorPaths, count: 0 };
    current.count += 1;
    pathCounts.set(key, current);
  }

  const paths = Array.from(pathCounts.values())
    .sort(
      (a, b) =>
        b.count - a.count || a.sequence.join(' > ').localeCompare(b.sequence.join(' > '))
    )
    .slice(0, params.limit)
    .map((path) => ({
      sequence: path.sequence,
      targetEventCount: path.count,
      percentage: roundedAnalyticsPercentage(path.count, coverage.targetEventTotal),
    }));

  const coverageRate =
    coverage.targetEventTotal === 0
      ? 0
      : coverage.targetEventsWithPriorPath / coverage.targetEventTotal;
  const limitations: string[] = [];
  if (coverage.targetEventTotal < 5) {
    limitations.push('Fewer than 5 target events were observed in the selected period.');
  }
  if (coverageRate < 0.5) {
    limitations.push('Fewer than 50% of target events had a prior page path in the same session.');
  }
  if (targetCapHit) {
    limitations.push(
      `Target event result was capped at ${PATH_TARGET_EVENT_QUERY_CAP} events.`
    );
  }
  if (pageViewCapHit) {
    limitations.push(`Page-view result was capped at ${PATH_PAGE_VIEW_QUERY_CAP} events.`);
  }

  const status: PathsToEventSuccessResult['status'] =
    limitations.length > 0 ? 'partial_data' : 'ok';

  return {
    status,
    summary:
      status === 'ok'
        ? `${paths.length} paths to ${params.targetEvent} found.`
        : `Partial path data for ${params.targetEvent} found.`,
    paths,
    coverage,
    limitations: limitations.length > 0 ? limitations : undefined,
  };
}

async function listEventsFromTinybird(params: {
  projectId: string;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<AnalyticsEventSummary[]> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));

  const result = await runAnalyticsTinybirdQuery<{
    event_type: string;
    count: number;
    first_seen_at: string;
    last_seen_at: string;
  }>(
    client,
    'event_discovery',
    `
      SELECT
        event_type,
        count() AS count,
        toString(min(timestamp)) AS first_seen_at,
        toString(max(timestamp)) AS last_seen_at
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      GROUP BY event_type
      ORDER BY count DESC, event_type ASC
      LIMIT 100
    `.trim()
  );

  return result.data.map((row) => ({
    eventName: String(row.event_type),
    count: Number(row.count),
    firstSeenAt: normalizeTimestamp(row.first_seen_at),
    lastSeenAt: normalizeTimestamp(row.last_seen_at),
    commonProperties: [],
  }));
}

async function eventSchemaFromTinybird(params: {
  projectId: string;
  eventName: string;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<AnalyticsEventSchema | null> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const eventNameSql = escapeAnalyticsSqlString(params.eventName);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));

  const result = await runAnalyticsTinybirdQuery<Record<string, unknown>>(
    client,
    'event_schema',
    `
      SELECT *
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND event_type = '${eventNameSql}'
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      ORDER BY timestamp DESC
      LIMIT 100
    `.trim()
  );

  const events: AnalyticsFixtureEventRow[] = result.data.flatMap((row) => {
    const timestamp = Date.parse(String(row.timestamp ?? ''));
    if (!Number.isFinite(timestamp)) return [];
    return [{ ...row, event_type: params.eventName, timestampMs: timestamp }];
  });

  return buildEventSchema(params.eventName, events);
}

async function pathsToEventRowsFromTinybird(params: {
  projectId: string;
  targetEvent: string;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<AnalyticsFixtureEventRow[]> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const targetEventSql = escapeAnalyticsSqlString(params.targetEvent);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));
  const limit = PATH_TARGET_EVENT_QUERY_CAP + PATH_PAGE_VIEW_QUERY_CAP + 2;

  const result = await runAnalyticsTinybirdQuery<{
    session_id: string;
    event_type: string;
    path: string;
    timestamp: string;
  }>(
    client,
    'paths_to_event_events',
    `
      SELECT
        ifNull(session_id, '') AS session_id,
        event_type,
        ifNull(path, '') AS path,
        toString(timestamp) AS timestamp
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND (event_type = 'page_view' OR event_type = '${targetEventSql}')
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      ORDER BY timestamp ASC
      LIMIT ${limit}
    `.trim()
  );

  return result.data.flatMap((row) => {
    const timestampMs = Date.parse(normalizeTimestamp(row.timestamp));
    if (!Number.isFinite(timestampMs)) return [];
    return [
      {
        session_id: String(row.session_id ?? ''),
        event_type: String(row.event_type ?? ''),
        path: String(row.path ?? ''),
        timestamp: normalizeTimestamp(row.timestamp),
        timestampMs,
      },
    ];
  });
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

  const dataWindow = resolveAnalyticsDataWindow(params.period, params.now);

  try {
    const response = isE2EAnalyticsFixtureMode()
      ? buildE2EOverview(params.projectId, params.period)
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
      generatedAt: params.now,
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
        generatedAt: params.now,
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

  const dataWindow = resolveAnalyticsDataWindow(params.period, params.now);

  try {
    const response = isE2EAnalyticsFixtureMode()
      ? buildE2ESessions(params.projectId, params.period)
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
      generatedAt: params.now,
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
        generatedAt: params.now,
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
      generatedAt: params.now,
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
        generatedAt: params.now,
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
      dataWindow: resolveAnalyticsDataWindow(params.period, params.now),
      generatedAt: params.now,
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
      dataWindow: resolveAnalyticsDataWindow(params.period, params.now),
      generatedAt: params.now,
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

  const dataWindow = resolveAnalyticsDataWindow(params.period, params.now);

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
        generatedAt: params.now,
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
        generatedAt: params.now,
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
  const eventName = boundAnalyticsString(params.eventName, 128);
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

  const dataWindow = resolveAnalyticsDataWindow(params.period, params.now);

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
          generatedAt: params.now,
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
        generatedAt: params.now,
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
        generatedAt: params.now,
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

  const dataWindow = resolveAnalyticsDataWindow(params.period, params.now);

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
        generatedAt: params.now,
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
        generatedAt: params.now,
      }),
    };
  }
}
