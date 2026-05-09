import { and, eq, inArray, sql } from "drizzle-orm";
import crypto from "node:crypto";

import { buildAnalyticsDashboardUrls, type AnalyticsDashboardUrls } from "../../analytics/urls";
import { db } from "../client";
import { projects } from "../schema";

function createProjectId(): string {
  return `proj_${crypto.randomBytes(12).toString("base64url").slice(0, 15)}`;
}

export type GitHubRepoRef = { id: number; fullName: string };
export type ProjectSource = "github_app" | "mcp_codex";
export type ProjectStatus = "pending" | "analyzing" | "analysis_failed" | "pr_pending" | "pr_closed" | "active" | "unsupported";

export type OwnedAnalyticsProject = {
  id: string;
  displayName: string;
  source: ProjectSource;
  status: ProjectStatus;
  lastEventAt: Date | null;
  mcpRepoName: string | null;
  mcpAppRoot: string | null;
  mcpPackageManager: string | null;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type ResolveProjectRepoInput = {
  name?: string;
  packageName?: string | null;
  gitRemote?: string | null;
  workspaceRoot?: string;
  appRoot?: string;
  packageManager?: "pnpm" | "npm" | "yarn" | "bun";
};

export type ResolveOwnedMcpProjectResult =
  | {
      status: "ok";
      project: OwnedAnalyticsProject;
      match: { strategy: "fingerprint" | "remote" | "repo_name"; confidence: "exact" | "broad" };
    }
  | { status: "no_match" }
  | { status: "multiple_matches"; candidates: OwnedAnalyticsProject[] }
  | { status: "invalid_repo_context"; reason: string };

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

type AnalyticsProjectRow = {
  id: string;
  displayName: string;
  source: string;
  status: string;
  lastEventAt: Date | null;
  mcpRepoName: string | null;
  mcpAppRoot: string | null;
  mcpPackageManager: string | null;
};

const analyticsProjectSelect = {
  id: projects.id,
  displayName: projects.displayName,
  source: projects.source,
  status: projects.status,
  lastEventAt: projects.lastEventAt,
  mcpRepoName: projects.mcpRepoName,
  mcpAppRoot: projects.mcpAppRoot,
  mcpPackageManager: projects.mcpPackageManager,
};

export function dashboardUrlsForProject(projectId: string): AnalyticsDashboardUrls {
  return buildAnalyticsDashboardUrls(projectId);
}

function dashboardUrlForProject(projectId: string): string {
  return dashboardUrlsForProject(projectId).project;
}

function stripTrailingGitSuffix(value: string): string {
  return value.replace(/\.git$/i, "");
}

function toProjectStatus(value: string): ProjectStatus {
  if (
    value === "pending" ||
    value === "analyzing" ||
    value === "analysis_failed" ||
    value === "pr_pending" ||
    value === "pr_closed" ||
    value === "active" ||
    value === "unsupported"
  ) {
    return value;
  }

  return "pending";
}

function toProjectSource(value: string): ProjectSource {
  return value === "mcp_codex" ? "mcp_codex" : "github_app";
}

function toOwnedAnalyticsProject(row: AnalyticsProjectRow): OwnedAnalyticsProject {
  return {
    id: row.id,
    displayName: row.displayName,
    source: toProjectSource(row.source),
    status: toProjectStatus(row.status),
    lastEventAt: row.lastEventAt,
    mcpRepoName: row.mcpRepoName,
    mcpAppRoot: row.mcpAppRoot,
    mcpPackageManager: row.mcpPackageManager,
    dashboardUrls: dashboardUrlsForProject(row.id),
  };
}

function normalizeRelativeRoot(value: string | undefined, fallback: string): string | null {
  const root = (value ?? fallback).trim();
  if (!root) return null;
  if (root.startsWith("/") || /^[a-z]:[\\/]/i.test(root)) return null;
  if (root.split(/[\\/]+/).some((segment) => segment === "..")) return null;
  return root.replace(/\\/g, "/").replace(/\/+$/, "") || ".";
}

function normalizeRepoLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function repoCandidateMatches(row: AnalyticsProjectRow, labels: Set<string>): boolean {
  return [row.mcpRepoName, row.displayName].some((value) => {
    const normalized = normalizeRepoLabel(value);
    return normalized ? labels.has(normalized) : false;
  });
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

export async function listOwnedAnalyticsProjects(params: {
  userId: string;
  limit?: number;
}): Promise<OwnedAnalyticsProject[]> {
  const limit = Math.max(1, Math.min(params.limit ?? 25, 100));
  const rows = await db
    .select(analyticsProjectSelect)
    .from(projects)
    .where(eq(projects.userId, params.userId));

  return (rows as AnalyticsProjectRow[]).slice(0, limit).map(toOwnedAnalyticsProject);
}

export async function getOwnedAnalyticsProject(params: {
  userId: string;
  projectId: string;
}): Promise<OwnedAnalyticsProject | null> {
  const rows = await db
    .select(analyticsProjectSelect)
    .from(projects)
    .where(and(eq(projects.id, params.projectId), eq(projects.userId, params.userId)));

  const row = (rows as AnalyticsProjectRow[])[0];
  return row ? toOwnedAnalyticsProject(row) : null;
}

async function selectOwnedMcpAnalyticsProjectsByFingerprint(params: {
  userId: string;
  fingerprint: string;
}): Promise<AnalyticsProjectRow[]> {
  const rows = await db
    .select(analyticsProjectSelect)
    .from(projects)
    .where(
      and(
        eq(projects.userId, params.userId),
        eq(projects.source, "mcp_codex"),
        eq(projects.mcpFingerprint, params.fingerprint),
      ),
    );

  return rows as AnalyticsProjectRow[];
}

async function selectOwnedMcpAnalyticsProjectsByRemote(params: {
  userId: string;
  normalizedGitRemote: string;
  appRoot: string;
}): Promise<AnalyticsProjectRow[]> {
  const rows = await db
    .select(analyticsProjectSelect)
    .from(projects)
    .where(
      and(
        eq(projects.userId, params.userId),
        eq(projects.source, "mcp_codex"),
        eq(projects.mcpNormalizedGitRemote, params.normalizedGitRemote),
        eq(projects.mcpAppRoot, params.appRoot),
      ),
    );

  return rows as AnalyticsProjectRow[];
}

async function selectOwnedMcpAnalyticsProjectsByAppRoot(params: {
  userId: string;
  appRoot: string;
}): Promise<AnalyticsProjectRow[]> {
  const rows = await db
    .select(analyticsProjectSelect)
    .from(projects)
    .where(
      and(
        eq(projects.userId, params.userId),
        eq(projects.source, "mcp_codex"),
        eq(projects.mcpAppRoot, params.appRoot),
      ),
    );

  return rows as AnalyticsProjectRow[];
}

export async function resolveOwnedMcpProjectForRepoContext(params: {
  userId: string;
  repo: ResolveProjectRepoInput;
}): Promise<ResolveOwnedMcpProjectResult> {
  const repoName = params.repo.name?.trim();
  const packageName = params.repo.packageName?.trim() || null;
  const normalizedGitRemote = normalizeGitRemote(params.repo.gitRemote);
  const appRoot = normalizeRelativeRoot(params.repo.appRoot, ".");
  const workspaceRoot = normalizeRelativeRoot(params.repo.workspaceRoot, ".");

  if (!repoName && !normalizedGitRemote) {
    return { status: "invalid_repo_context", reason: "repo_name_or_git_remote_required" };
  }

  if (params.repo.gitRemote && !normalizedGitRemote) {
    return { status: "invalid_repo_context", reason: "invalid_git_remote" };
  }

  if (!appRoot || !workspaceRoot) {
    return { status: "invalid_repo_context", reason: "invalid_repo_paths" };
  }

  const fingerprintInput = buildMcpProjectFingerprintInput({
    repoName: repoName || packageName || "repo",
    packageName,
    gitRemote: params.repo.gitRemote,
    appRoot,
  });
  const fingerprint = mcpFingerprint(fingerprintInput);
  const exactRows = await selectOwnedMcpAnalyticsProjectsByFingerprint({
    userId: params.userId,
    fingerprint,
  });

  if (exactRows.length === 1) {
    return {
      status: "ok",
      project: toOwnedAnalyticsProject(exactRows[0]),
      match: { strategy: "fingerprint", confidence: "exact" },
    };
  }

  if (exactRows.length > 1) {
    return {
      status: "multiple_matches",
      candidates: exactRows.slice(0, 10).map(toOwnedAnalyticsProject),
    };
  }

  const broadRows = normalizedGitRemote
    ? await selectOwnedMcpAnalyticsProjectsByRemote({
        userId: params.userId,
        normalizedGitRemote,
        appRoot,
      })
    : (await selectOwnedMcpAnalyticsProjectsByAppRoot({ userId: params.userId, appRoot })).filter(
        (row) => {
          const labels = new Set(
            [repoName, packageName].flatMap((value) => {
              const normalized = normalizeRepoLabel(value);
              return normalized ? [normalized] : [];
            }),
          );
          return repoCandidateMatches(row, labels);
        },
      );

  if (broadRows.length === 0) return { status: "no_match" };
  if (broadRows.length === 1) {
    return {
      status: "ok",
      project: toOwnedAnalyticsProject(broadRows[0]),
      match: {
        strategy: normalizedGitRemote ? "remote" : "repo_name",
        confidence: "broad",
      },
    };
  }

  return {
    status: "multiple_matches",
    candidates: broadRows.slice(0, 10).map(toOwnedAnalyticsProject),
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
