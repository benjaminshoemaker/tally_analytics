import { and, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { db } from "../../../../../../lib/db/client";
import { projects } from "../../../../../../lib/db/schema";
import { createTinybirdClientFromEnv, tinybirdSql } from "../../../../../../lib/tinybird/client";

type Period = "24h" | "7d" | "30d";

type SessionsResponse = {
  period: Period;
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{ date: string; newSessions: number; returningSessions: number }>;
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
  const start = new Date(now.getTime() - periodMs(period));
  const projectIdSql = escapeSqlString(projectId);
  const startSql = escapeSqlString(toTinybirdDateTime64String(start));
  const endSql = escapeSqlString(toTinybirdDateTime64String(now));

  const client = createTinybirdClientFromEnv();
  const result = await tinybirdSql<{ date: string; sessions: number }>(
    client,
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
    `.trim(),
  );

  const timeSeries = result.data.map((row) => ({
    date: String(row.date),
    newSessions: Number(row.sessions),
    returningSessions: 0,
  }));

  const totalSessions = timeSeries.reduce((sum, row) => sum + row.newSessions + row.returningSessions, 0);

  const responseBody: SessionsResponse = {
    period,
    totalSessions,
    newVisitors: totalSessions,
    returningVisitors: 0,
    timeSeries,
  };

  return Response.json(responseBody, { status: 200 });
}
