import { desc, eq } from "drizzle-orm";

import { getUserFromRequest } from "../../../lib/auth/get-user";
import { db } from "../../../lib/db/client";
import { projects } from "../../../lib/db/schema";

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

  const result: ProjectsResponse = {
    projects: rows.map((row) => ({
      id: row.id,
      githubRepoFullName: row.githubRepoFullName,
      status: row.status,
      prUrl: row.prUrl,
      detectedFramework: row.detectedFramework ?? null,
      eventsThisMonth: Number(row.eventsThisMonth),
      lastEventAt: row.lastEventAt ? row.lastEventAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
  };

  return Response.json(result);
}

