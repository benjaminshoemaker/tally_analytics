import { and, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { db } from "../../../../../../lib/db/client";
import { projects } from "../../../../../../lib/db/schema";

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

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Missing required environment variable: ${name}`);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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
  const since = url.searchParams.get("since") ?? "";

  const apiUrl = readRequiredEnv("TINYBIRD_API_URL").replace(/\/+$/, "");
  const token = readRequiredEnv("TINYBIRD_ADMIN_TOKEN");

  const tinybirdUrl = new URL(`${apiUrl}/v0/pipes/live_feed.json`);
  tinybirdUrl.searchParams.set("project_id", projectId);
  tinybirdUrl.searchParams.set("limit", String(limit));
  if (since) tinybirdUrl.searchParams.set("since", since);

  const tinybirdResponse = await fetch(tinybirdUrl.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const tinybirdJson = (await tinybirdResponse.json().catch(() => null)) as null | { data?: unknown[] };
  if (!tinybirdResponse.ok || !tinybirdJson) {
    return Response.json({ error: "Tinybird request failed" }, { status: 502 });
  }

  const data = Array.isArray(tinybirdJson.data) ? tinybirdJson.data : [];
  const events: LiveFeedResponse["events"] = data.map((row, index) => {
    const typed = row as Record<string, unknown>;
    const timestamp = String(typed.timestamp ?? "");
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
