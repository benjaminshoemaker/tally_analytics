import { and, eq } from "drizzle-orm";
import { canRegenerateProject } from "@fast-pr-analytics/shared-rules";

import { getUserFromRequest } from "../../../../../lib/auth/get-user";
import { db } from "../../../../../lib/db/client";
import { projects } from "../../../../../lib/db/schema";
import { createRegenerateRequest, countRecentRegenerateRequests } from "../../../../../lib/db/queries/regenerate-requests";
import { analyzeRepository } from "../../../../../lib/github/analyze";

type RegenerateResponse = { success: boolean; message: string };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ success: false, message: "Unauthorized" } satisfies RegenerateResponse, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) {
    return Response.json({ success: false, message: "Missing project id" } satisfies RegenerateResponse, { status: 400 });
  }

  const rows = await db
    .select({
      id: projects.id,
      source: projects.source,
      status: projects.status,
      repoId: projects.githubRepoId,
      repoFullName: projects.githubRepoFullName,
      installationId: projects.githubInstallationId,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

  const project = rows[0];
  if (!project) {
    return Response.json({ success: false, message: "Project not found" } satisfies RegenerateResponse, { status: 404 });
  }

  const regenerationCandidate = {
    source: project.source,
    status: project.status,
    githubRepoId: project.repoId,
    githubRepoFullName: project.repoFullName,
    githubInstallationId: project.installationId,
  };
  if (!canRegenerateProject(regenerationCandidate)) {
    return Response.json(
      { success: false, message: "Re-run is only available for eligible GitHub App projects" } satisfies RegenerateResponse,
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - 5 * 60 * 1000);
  const recentCount = await countRecentRegenerateRequests({ userId: user.id, projectId, since });
  if (recentCount >= 1) {
    return Response.json(
      { success: false, message: "Rate limited. Try again in a few minutes." } satisfies RegenerateResponse,
      { status: 429 },
    );
  }

  await createRegenerateRequest({ userId: user.id, projectId });
  await analyzeRepository({
    repoId: BigInt(regenerationCandidate.githubRepoId),
    repoFullName: regenerationCandidate.githubRepoFullName,
    installationId: BigInt(regenerationCandidate.githubInstallationId),
  });

  return Response.json({ success: true, message: "Regeneration started" } satisfies RegenerateResponse, { status: 200 });
}
