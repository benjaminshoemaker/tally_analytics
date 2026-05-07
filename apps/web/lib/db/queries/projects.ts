import { and, eq, inArray, sql } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "../client";
import { projects } from "../schema";

function createProjectId(): string {
  return `proj_${crypto.randomBytes(12).toString("base64url").slice(0, 15)}`;
}

export type GitHubRepoRef = { id: number; fullName: string };
export type ProjectStatus = "pending" | "analyzing" | "analysis_failed" | "pr_pending" | "pr_closed" | "active" | "unsupported";

export type McpProjectFingerprintInput =
  | {
      source: "mcp_codex";
      identity: "remote";
      normalizedGitRemote: string;
      appRoot: string;
    }
  | {
      source: "mcp_codex";
      identity: "repo_name";
      repoName: string;
      packageName: string;
      appRoot: string;
    };

export type CreateOrReuseMcpProjectParams = {
  userId: string;
  repoName: string;
  packageName?: string | null;
  gitRemote?: string | null;
  appRoot: string;
  framework: string;
  packageManager: string;
};

export type CreateOrReuseMcpProjectResult =
  | {
      status: "ready";
      projectId: string;
      dashboardUrl: string;
      created: boolean;
      mcpFingerprint: string;
    }
  | {
      status: "unsupported";
      reason: "multiple_matching_projects";
      mcpFingerprint: string;
    };

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function dashboardUrlForProject(projectId: string): string {
  return `${normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? "https://usetally.xyz")}/projects/${projectId}`;
}

function stripTrailingGitSuffix(value: string): string {
  return value.replace(/\.git$/i, "");
}

export function normalizeGitRemote(remote: string | null | undefined): string | null {
  const trimmed = remote?.trim();
  if (!trimmed) return null;

  const scpLike = /^git@([^:]+):(.+)$/i.exec(trimmed);
  if (scpLike) {
    const host = scpLike[1].toLowerCase();
    const path = stripTrailingGitSuffix(scpLike[2].replace(/^\/+|\/+$/g, ""));
    return `${host}/${host === "github.com" ? path.toLowerCase() : path}`;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const path = stripTrailingGitSuffix(url.pathname.replace(/^\/+|\/+$/g, ""));
    if (!host || !path) return null;
    return `${host}/${host === "github.com" ? path.toLowerCase() : path}`;
  } catch {
    return null;
  }
}

export function mcpFingerprint(input: McpProjectFingerprintInput): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildMcpProjectFingerprintInput(params: {
  repoName: string;
  packageName?: string | null;
  gitRemote?: string | null;
  appRoot: string;
}): McpProjectFingerprintInput {
  const normalizedGitRemote = normalizeGitRemote(params.gitRemote);
  if (normalizedGitRemote) {
    return {
      source: "mcp_codex",
      identity: "remote",
      normalizedGitRemote,
      appRoot: params.appRoot,
    };
  }

  return {
    source: "mcp_codex",
    identity: "repo_name",
    repoName: params.repoName,
    packageName: params.packageName || params.repoName,
    appRoot: params.appRoot,
  };
}

async function selectMcpProjectsByFingerprint(params: { userId: string; fingerprint: string }): Promise<Array<{ id: string }>> {
  return db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, params.userId), eq(projects.mcpFingerprint, params.fingerprint)));
}

export async function createOrReuseMcpProject(
  params: CreateOrReuseMcpProjectParams,
): Promise<CreateOrReuseMcpProjectResult> {
  const fingerprintInput = buildMcpProjectFingerprintInput(params);
  const fingerprint = mcpFingerprint(fingerprintInput);
  const existingRows = await selectMcpProjectsByFingerprint({ userId: params.userId, fingerprint });

  if (existingRows.length > 1) {
    return { status: "unsupported", reason: "multiple_matching_projects", mcpFingerprint: fingerprint };
  }

  const existingProjectId = existingRows[0]?.id;
  if (existingProjectId) {
    return {
      status: "ready",
      projectId: existingProjectId,
      dashboardUrl: dashboardUrlForProject(existingProjectId),
      created: false,
      mcpFingerprint: fingerprint,
    };
  }

  const projectId = createProjectId();
  const normalizedGitRemote = fingerprintInput.identity === "remote" ? fingerprintInput.normalizedGitRemote : null;
  const repoName = params.repoName;

  const insertedRows = await db
    .insert(projects)
    .values({
      id: projectId,
      userId: params.userId,
      source: "mcp_codex",
      displayName: repoName,
      status: "active",
      detectedFramework: params.framework,
      mcpNormalizedGitRemote: normalizedGitRemote,
      mcpRepoName: repoName,
      mcpAppRoot: params.appRoot,
      mcpFramework: params.framework,
      mcpPackageManager: params.packageManager,
      mcpFingerprint: fingerprint,
    })
    .onConflictDoNothing({
      target: [projects.userId, projects.mcpFingerprint],
      where: sql`${projects.mcpFingerprint} is not null`,
    })
    .returning();

  const insertedProjectId = insertedRows[0]?.id;
  if (insertedProjectId) {
    return {
      status: "ready",
      projectId: insertedProjectId,
      dashboardUrl: dashboardUrlForProject(insertedProjectId),
      created: true,
      mcpFingerprint: fingerprint,
    };
  }

  const conflictRows = await selectMcpProjectsByFingerprint({ userId: params.userId, fingerprint });
  if (conflictRows.length === 1) {
    const conflictProjectId = conflictRows[0].id;
    return {
      status: "ready",
      projectId: conflictProjectId,
      dashboardUrl: dashboardUrlForProject(conflictProjectId),
      created: false,
      mcpFingerprint: fingerprint,
    };
  }

  return { status: "unsupported", reason: "multiple_matching_projects", mcpFingerprint: fingerprint };
}

export async function upsertProjectsForRepos(params: {
  userId: string;
  installationId: bigint;
  repositories: GitHubRepoRef[];
}): Promise<void> {
  if (params.repositories.length === 0) return;

  const values = params.repositories.map((repo) => ({
    id: createProjectId(),
    userId: params.userId,
    source: "github_app",
    displayName: repo.fullName,
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
        source: "github_app",
        displayName: sql`excluded.display_name`,
        githubRepoFullName: sql`excluded.github_repo_full_name`,
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
    .where(and(eq(projects.githubRepoId, params.repoId), eq(projects.prNumber, params.prNumber)));
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

export async function setProjectPullRequestByRepoId(params: {
  repoId: bigint;
  prNumber: number;
  prUrl: string;
}): Promise<void> {
  await db
    .update(projects)
    .set({ prNumber: params.prNumber, prUrl: params.prUrl, status: "pr_pending" })
    .where(eq(projects.githubRepoId, params.repoId));
}

export async function getProjectIdByRepoId(repoId: bigint): Promise<string | null> {
  const rows = await db.select({ id: projects.id }).from(projects).where(eq(projects.githubRepoId, repoId));
  return rows[0]?.id ?? null;
}

export async function getProjectStatusByRepoId(params: { repoId: bigint }): Promise<ProjectStatus | null> {
  const rows = await db
    .select({ status: projects.status })
    .from(projects)
    .where(eq(projects.githubRepoId, params.repoId));
  const status = rows[0]?.status;
  if (typeof status !== "string") return null;
  return status as ProjectStatus;
}
