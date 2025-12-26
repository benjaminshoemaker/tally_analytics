import { and, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { db } from "../../../../../../lib/db/client";
import { projects } from "../../../../../../lib/db/schema";
import { createTinybirdClientFromEnv, tinybirdSql } from "../../../../../../lib/tinybird/client";

type Period = "24h" | "7d" | "30d";

type OverviewResponse = {
  period: Period;
  pageViews: { total: number; change: number; timeSeries: Array<{ date: string; count: number }> };
  sessions: { total: number; change: number };
  topPages: Array<{ path: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; count: number; percentage: number }>;
};

function parsePeriod(raw: string | null): Period | null {
  if (!raw) return "7d";
  if (raw === "24h" || raw === "7d" || raw === "30d") return raw;
  return null;
}

function periodMs(period: Period): number {
  switch (period) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function toTinybirdDateTime64String(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) return Response.json({ error: "Missing project id" }, { status: 400 });

  const ownedRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  if (!ownedRows[0]) return Response.json({ error: "Project not found" }, { status: 404 });

  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  if (!period) return Response.json({ error: "Invalid period" }, { status: 400 });

  const now = new Date();
  const duration = periodMs(period);
  const start = new Date(now.getTime() - duration);
  const previousStart = new Date(start.getTime() - duration);
  const previousEnd = start;

  const client = createTinybirdClientFromEnv();
  const projectIdSql = escapeSqlString(projectId);
  const startSql = escapeSqlString(toTinybirdDateTime64String(start));
  const endSql = escapeSqlString(toTinybirdDateTime64String(now));
  const previousStartSql = escapeSqlString(toTinybirdDateTime64String(previousStart));
  const previousEndSql = escapeSqlString(toTinybirdDateTime64String(previousEnd));

  const [
    currentPageViews,
    previousPageViews,
    currentSessionsResult,
    previousSessionsResult,
    topPages,
    topReferrers,
  ] = await Promise.all([
    tinybirdSql<{ date: string; count: number }>(
      client,
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
      `.trim(),
    ),
    tinybirdSql<{ date: string; count: number }>(
      client,
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
      `.trim(),
    ),
    tinybirdSql<{ total: number }>(
      client,
      `
        SELECT countIf(event_type = 'session_start') AS total
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND timestamp >= toDateTime64('${startSql}', 3)
        AND timestamp < toDateTime64('${endSql}', 3)
      `.trim(),
    ),
    tinybirdSql<{ total: number }>(
      client,
      `
        SELECT countIf(event_type = 'session_start') AS total
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND timestamp >= toDateTime64('${previousStartSql}', 3)
        AND timestamp < toDateTime64('${previousEndSql}', 3)
      `.trim(),
    ),
    tinybirdSql<{ path: string; views: number; percentage: number }>(
      client,
      `
        SELECT
          ifNull(path, '') AS path,
          count() AS views,
          ifNull(round(count() * 100.0 / nullIf(sum(count()) OVER (), 0), 2), 0) AS percentage
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND event_type = 'page_view'
        AND timestamp >= toDateTime64('${startSql}', 3)
        AND timestamp < toDateTime64('${endSql}', 3)
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `.trim(),
    ),
    tinybirdSql<{ referrer_host: string; count: number; percentage: number }>(
      client,
      `
        SELECT
          if(ifNull(referrer, '') = '', 'Direct', domain(ifNull(referrer, ''))) AS referrer_host,
          count() AS count,
          ifNull(round(count() * 100.0 / nullIf(sum(count()) OVER (), 0), 2), 0) AS percentage
        FROM events
        WHERE project_id = '${projectIdSql}'
        AND event_type = 'page_view'
        AND timestamp >= toDateTime64('${startSql}', 3)
        AND timestamp < toDateTime64('${endSql}', 3)
        GROUP BY referrer_host
        ORDER BY count DESC
        LIMIT 10
      `.trim(),
    ),
  ]);

  const currentPageViewsTotal = currentPageViews.data.reduce((sum, row) => sum + Number(row.count), 0);
  const previousPageViewsTotal = previousPageViews.data.reduce((sum, row) => sum + Number(row.count), 0);

  const currentSessionsTotal = Number(currentSessionsResult.data[0]?.total ?? 0);
  const previousSessionsTotal = Number(previousSessionsResult.data[0]?.total ?? 0);

  const responseBody: OverviewResponse = {
    period,
    pageViews: {
      total: currentPageViewsTotal,
      change: percentChange(currentPageViewsTotal, previousPageViewsTotal),
      timeSeries: currentPageViews.data.map((row) => ({ date: String(row.date), count: Number(row.count) })),
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

  return Response.json(responseBody, { status: 200 });
}
