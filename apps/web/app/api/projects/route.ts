import { desc, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../lib/auth/get-user";
import { db } from "../../../lib/db/client";
import { projects } from "../../../lib/db/schema";
import { createTinybirdClientFromEnv, tinybirdSql } from "../../../lib/tinybird/client";

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function normalizeTimestamp(value: unknown): string | null {
  const raw = String(value ?? "");
  if (!raw) return null;
  if (raw.includes("T")) return raw.endsWith("Z") ? raw : `${raw}Z`;

  const iso = raw.replace(" ", "T");
  return iso.endsWith("Z") ? iso : `${iso}Z`;
}

async function fetchLastEventAtByProjectId(projectIds: string[]): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map();

  const inList = projectIds.map((id) => `'${escapeSqlString(id)}'`).join(", ");
  const client = createTinybirdClientFromEnv();

  const result = await tinybirdSql<{ project_id: string; last_event_at: string }>(
    client,
    `
      SELECT
        project_id,
        toString(max(timestamp)) AS last_event_at
      FROM events
      WHERE project_id IN (${inList})
      GROUP BY project_id
    `.trim(),
  );

  const map = new Map<string, string>();
  for (const row of result.data) {
    const projectId = String((row as { project_id?: unknown }).project_id ?? "");
    if (!projectId) continue;
    const normalized = normalizeTimestamp((row as { last_event_at?: unknown }).last_event_at);
    if (!normalized) continue;
    map.set(projectId, normalized);
  }

  return map;
}

type ProjectsResponse = {
  projects: Array<{
    id: string;
    githubRepoFullName: string;
    status: string;
    prUrl: string | null;
    detectedFramework: string | null;
    eventsThisMonth: number;
    lastEventAt: string | null;
    createdAt: string;
  }>;
};

export async function GET(request: Request): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: projects.id,
      githubRepoFullName: projects.githubRepoFullName,
      status: projects.status,
      prUrl: projects.prUrl,
      detectedFramework: projects.detectedFramework,
      eventsThisMonth: projects.eventsThisMonth,
      lastEventAt: projects.lastEventAt,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  let lastEventAtByProjectId = new Map<string, string>();
  try {
    lastEventAtByProjectId = await fetchLastEventAtByProjectId(rows.map((row) => row.id));
  } catch {
    lastEventAtByProjectId = new Map<string, string>();
  }

  const result: ProjectsResponse = {
    projects: rows.map((row) => ({
      id: row.id,
      githubRepoFullName: row.githubRepoFullName,
      status: row.status,
      prUrl: row.prUrl,
      detectedFramework: row.detectedFramework ?? null,
      eventsThisMonth: Number(row.eventsThisMonth),
      lastEventAt: lastEventAtByProjectId.get(row.id) ?? (row.lastEventAt ? row.lastEventAt.toISOString() : null),
      createdAt: row.createdAt.toISOString(),
    })),
  };

  return Response.json(result);
}
