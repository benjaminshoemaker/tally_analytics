import { and, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../../lib/auth/get-user";
import { db } from "../../../../lib/db/client";
import { projects, users } from "../../../../lib/db/schema";
import { createTinybirdClientFromEnv, tinybirdSql } from "../../../../lib/tinybird/client";

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

async function fetchTinybirdLastEventAt(projectId: string): Promise<string | null> {
  const client = createTinybirdClientFromEnv();
  const projectIdSql = escapeSqlString(projectId);

  const result = await tinybirdSql<{ last_event_at: string }>(
    client,
    `
      SELECT
        toString(max(timestamp)) AS last_event_at
      FROM events
      WHERE project_id = '${projectIdSql}'
      GROUP BY project_id
      LIMIT 1
    `.trim(),
  );

  return normalizeTimestamp(result.data[0]?.last_event_at ?? null);
}

const PLAN_LIMITS = {
  free: 10_000,
  pro: 100_000,
  team: 1_000_000,
} as const;

type ProjectDetailResponse = {
  project: {
    id: string;
    githubRepoFullName: string;
    status: string;
    prNumber: number | null;
    prUrl: string | null;
    detectedFramework: string | null;
    detectedAnalytics: string[];
    eventsThisMonth: number;
    lastEventAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  quotaLimit: number;
  quotaUsed: number;
  isOverQuota: boolean;
  userPlan: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) return Response.json({ error: "Missing project id" }, { status: 400 });

  const projectRows = await db
    .select({
      id: projects.id,
      githubRepoFullName: projects.githubRepoFullName,
      status: projects.status,
      prNumber: projects.prNumber,
      prUrl: projects.prUrl,
      detectedFramework: projects.detectedFramework,
      detectedAnalytics: projects.detectedAnalytics,
      eventsThisMonth: projects.eventsThisMonth,
      lastEventAt: projects.lastEventAt,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

  const project = projectRows[0];
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const userRows = await db.select({ plan: users.plan }).from(users).where(eq(users.id, user.id));
  const plan = userRows[0]?.plan ?? "free";
  const quotaLimit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  const quotaUsed = Number(project.eventsThisMonth);
  const isOverQuota = quotaUsed >= quotaLimit;

  let lastEventAt: string | null = null;
  try {
    lastEventAt = await fetchTinybirdLastEventAt(project.id);
  } catch {
    lastEventAt = null;
  }

  const responseBody: ProjectDetailResponse = {
    project: {
      id: project.id,
      githubRepoFullName: project.githubRepoFullName,
      status: project.status,
      prNumber: project.prNumber ?? null,
      prUrl: project.prUrl ?? null,
      detectedFramework: project.detectedFramework ?? null,
      detectedAnalytics: project.detectedAnalytics ?? [],
      eventsThisMonth: quotaUsed,
      lastEventAt: lastEventAt ?? (project.lastEventAt ? project.lastEventAt.toISOString() : null),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    quotaLimit,
    quotaUsed,
    isOverQuota,
    userPlan: String(plan),
  };

  return Response.json(responseBody);
}
