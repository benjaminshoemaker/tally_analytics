import { and, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { db } from "../../../../../../lib/db/client";
import { projects } from "../../../../../../lib/db/schema";
import { createTinybirdClientFromEnv, tinybirdPipe, tinybirdSql } from "../../../../../../lib/tinybird/client";

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

  const currentPageViews = await tinybirdPipe<{ date: string; count: number }>(client, "page_views_timeseries", {
    project_id: projectId,
    start_date: start.toISOString(),
    end_date: now.toISOString(),
  });
  const previousPageViews = await tinybirdPipe<{ date: string; count: number }>(client, "page_views_timeseries", {
    project_id: projectId,
    start_date: previousStart.toISOString(),
    end_date: previousEnd.toISOString(),
  });

  const currentPageViewsTotal = currentPageViews.data.reduce((sum, row) => sum + Number(row.count), 0);
  const previousPageViewsTotal = previousPageViews.data.reduce((sum, row) => sum + Number(row.count), 0);

  const currentSessionsResult = await tinybirdSql<{ total: number }>(
    client,
    `
      SELECT countIf(event_type = 'session_start') AS total
      FROM events
      WHERE project_id = '${projectId}'
      AND timestamp >= toDateTime64('${start.toISOString()}', 3)
      AND timestamp < toDateTime64('${now.toISOString()}', 3)
    `.trim(),
  );
  const previousSessionsResult = await tinybirdSql<{ total: number }>(
    client,
    `
      SELECT countIf(event_type = 'session_start') AS total
      FROM events
      WHERE project_id = '${projectId}'
      AND timestamp >= toDateTime64('${previousStart.toISOString()}', 3)
      AND timestamp < toDateTime64('${previousEnd.toISOString()}', 3)
    `.trim(),
  );

  const currentSessionsTotal = Number(currentSessionsResult.data[0]?.total ?? 0);
  const previousSessionsTotal = Number(previousSessionsResult.data[0]?.total ?? 0);

  const topPages = await tinybirdPipe<{ path: string; views: number; percentage: number }>(client, "top_pages", {
    project_id: projectId,
    start_date: start.toISOString(),
    end_date: now.toISOString(),
  });
  const topReferrers = await tinybirdPipe<{ referrer_host: string; count: number; percentage: number }>(
    client,
    "top_referrers",
    { project_id: projectId, start_date: start.toISOString(), end_date: now.toISOString() },
  );

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

