import { desc, eq } from "drizzle-orm";
import { canRegenerateProject } from "@fast-pr-analytics/shared-rules";

import { getUserFromRequest } from "../../../lib/auth/get-user";
import { db } from "../../../lib/db/client";
import { projects } from "../../../lib/db/schema";
import { fetchLastEventAtByProjectId, resolveLastEventAt } from "../../../lib/analytics/project-events";

type ProjectsResponse = {
  projects: Array<{
    id: string;
    displayName: string;
    source: string;
    githubRepoFullName: string | null;
    status: string;
    prUrl: string | null;
    detectedFramework: string | null;
    eventsThisMonth: number;
    lastEventAt: string | null;
    createdAt: string;
    actions: {
      canRegenerate: boolean;
    };
  }>;
};

export async function GET(request: Request): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: projects.id,
      displayName: projects.displayName,
      source: projects.source,
      githubRepoId: projects.githubRepoId,
      githubRepoFullName: projects.githubRepoFullName,
      githubInstallationId: projects.githubInstallationId,
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
      displayName: row.displayName,
      source: row.source,
      githubRepoFullName: row.githubRepoFullName ?? null,
      status: row.status,
      prUrl: row.prUrl,
      detectedFramework: row.detectedFramework ?? null,
      eventsThisMonth: Number(row.eventsThisMonth),
      lastEventAt: resolveLastEventAt(lastEventAtByProjectId.get(row.id), row.lastEventAt),
      createdAt: row.createdAt.toISOString(),
      actions: {
        canRegenerate: canRegenerateProject(row),
      },
    })),
  };

  return Response.json(result);
}
