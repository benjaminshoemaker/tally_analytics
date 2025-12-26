import { and, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { db } from "../../../../../../lib/db/client";
import { projects } from "../../../../../../lib/db/schema";
import { createTinybirdClientFromEnv, tinybirdSql } from "../../../../../../lib/tinybird/client";

type LiveFeedResponse = {
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function toTinybirdDateTime64String(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function normalizeTimestamp(value: unknown): string {
  const raw = String(value ?? "");
  if (!raw) return "";
  if (raw.includes("T")) return raw;

  const iso = raw.replace(" ", "T");
  return iso.endsWith("Z") ? iso : `${iso}Z`;
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
  const limitRaw = url.searchParams.get("limit");
  const limit = clamp(Number.parseInt(limitRaw ?? "20", 10) || 20, 1, 100);
  const sinceRaw = url.searchParams.get("since") ?? "";
  const sinceDate = sinceRaw ? new Date(sinceRaw) : null;
  const since = sinceDate && !Number.isNaN(sinceDate.getTime()) ? toTinybirdDateTime64String(sinceDate) : "";
  const sinceFilter = since || "2024-01-01 00:00:00.000";

  const client = createTinybirdClientFromEnv();
  const projectIdSql = escapeSqlString(projectId);
  const sinceSql = escapeSqlString(sinceFilter);

  const result = await tinybirdSql<{
    event_type: string;
    path: string;
    referrer: string;
    timestamp: string;
    relative_time: string;
  }>(
    client,
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
      LIMIT ${limit}
    `.trim(),
  );

  const data = result.data;
  const events: LiveFeedResponse["events"] = data.map((row, index) => {
    const typed = row as Record<string, unknown>;
    const timestamp = normalizeTimestamp(typed.timestamp);
    const referrer = typeof typed.referrer === "string" && typed.referrer.length > 0 ? typed.referrer : null;

    return {
      id: `${timestamp}-${index}`,
      eventType: String(typed.event_type ?? ""),
      path: String(typed.path ?? ""),
      referrer,
      timestamp,
      relativeTime: String(typed.relative_time ?? ""),
    };
  });

  return Response.json(
    { events, hasMore: events.length >= limit } satisfies LiveFeedResponse,
    { status: 200 },
  );
}
