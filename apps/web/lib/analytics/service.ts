import { buildE2EOverview, isE2EAnalyticsFixtureMode } from './e2e-fixtures';
import {
  parseAnalyticsPeriod,
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

export function isProjectOverviewSuccess(
  result: ProjectOverviewResult
): result is ProjectOverviewSuccessResult {
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
