import { and, eq, inArray, isNull, or } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "../client";
import { projects } from "../schema";

function createProjectId(): string {
  return `proj_${crypto.randomBytes(12).toString("base64url").slice(0, 15)}`;
}

export type GitHubRepoRef = { id: number; fullName: string };
export type ProjectStatus = "pending" | "analyzing" | "analysis_failed" | "pr_pending" | "pr_closed" | "active" | "unsupported";

export async function upsertProjectsForRepos(params: {
  userId: string;
  installationId: bigint;
  repositories: GitHubRepoRef[];
}): Promise<void> {
  if (params.repositories.length === 0) return;

  const values = params.repositories.map((repo) => ({
    id: createProjectId(),
    userId: params.userId,
    githubRepoId: BigInt(repo.id),
    githubRepoFullName: repo.fullName,
    githubInstallationId: params.installationId,
  }));

  await db
    .insert(projects)
    .values(values)
    .onConflictDoUpdate({
      target: projects.githubRepoId,
      set: {
        userId: params.userId,
        githubInstallationId: params.installationId,
      },
    });
}

export async function deleteProjectsByInstallationId(installationId: bigint): Promise<void> {
  await db.delete(projects).where(eq(projects.githubInstallationId, installationId));
}

export async function deleteProjectsByInstallationAndRepoIds(params: {
  installationId: bigint;
  repoIds: bigint[];
}): Promise<void> {
  if (params.repoIds.length === 0) return;
  await db
    .delete(projects)
    .where(and(eq(projects.githubInstallationId, params.installationId), inArray(projects.githubRepoId, params.repoIds)));
}

export async function updateProjectStatusForPullRequestClosed(params: {
  repoId: bigint;
  prNumber: number;
  status: "active" | "pr_closed";
}): Promise<void> {
  await db
    .update(projects)
    .set({ status: params.status })
    .where(
      and(
        eq(projects.githubRepoId, params.repoId),
        or(isNull(projects.prNumber), eq(projects.prNumber, params.prNumber)),
      ),
    );
}

export async function setProjectStatusByRepoId(params: { repoId: bigint; status: ProjectStatus }): Promise<void> {
  await db.update(projects).set({ status: params.status }).where(eq(projects.githubRepoId, params.repoId));
}

export async function updateProjectDetectionByRepoId(params: {
  repoId: bigint;
  detectedFramework: string | null;
  detectedAnalytics: string[];
}): Promise<void> {
  await db
    .update(projects)
    .set({ detectedFramework: params.detectedFramework, detectedAnalytics: params.detectedAnalytics })
    .where(eq(projects.githubRepoId, params.repoId));
}
