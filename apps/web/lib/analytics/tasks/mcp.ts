import {
  buildMcpProjectFingerprintInput,
  getOwnedAnalyticsProject,
  mcpFingerprint,
  normalizeGitRemote,
  resolveOwnedMcpProjectForRepoContext,
  type OwnedAnalyticsProject,
  type ResolveProjectRepoInput,
} from "../../db/queries/projects";
import type { AnalyticsTaskRecord } from "./types";

export type AnalyticsTaskProjectResolverInput = {
  projectId?: string;
  repo?: {
    name?: string;
    packageName?: string;
    gitRemote?: string | null;
    appRoot?: string;
  };
};

export type ResolveAnalyticsTaskProjectResult =
  | {
      status: "ready";
      project: OwnedAnalyticsProject;
    }
  | {
      status: "needs_project_selection";
      candidates: OwnedAnalyticsProject[];
    }
  | {
      status: "no_matching_project";
      reason: "missing_project_context" | "project_not_found" | "invalid_repo_context" | "no_match";
    };

export type McpAnalyticsTaskListRow = {
  id: string;
  title: string;
  taskType: AnalyticsTaskRecord["taskType"];
  status: AnalyticsTaskRecord["status"];
  eventName: string;
  createdAt: string;
  dashboardUrl: string;
};

export type McpAnalyticsTaskContext = {
  taskId: string;
  status: AnalyticsTaskRecord["status"];
  originalQuestion: string;
  currentAnswer: {
    kind: AnalyticsTaskRecord["answerKind"];
    summary: string | null;
    analyticsGap: string | null;
  };
  eventContract: {
    taskType: AnalyticsTaskRecord["taskType"];
    eventName: string;
    triggerDescription: string;
    propertiesSchema: Record<string, unknown>;
    targetSurface: string | null;
  };
  implementationGuidance: string | null;
  localVerification: Record<string, unknown> | null;
  productionVerification: {
    source: AnalyticsTaskRecord["verificationSource"];
    criteria: Record<string, unknown>;
    verifiedAt: string | null;
    lastError: string | null;
  };
  dashboardUrl: string;
};

const MAX_SAFE_TEXT = 600;
const REDACTED_TOKEN = "[redacted]";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return compact || null;
}

function normalizeRelativeRoot(value: unknown, fallback = "."): string | null {
  const compact = normalizeText(value ?? fallback);
  if (!compact) return null;
  const normalized = compact.replace(/\\/g, "/").replace(/\/+$/, "") || ".";
  if (normalized.startsWith("/") || /^[a-z]:\//i.test(normalized)) return null;
  if (normalized.split("/").some((segment) => segment === "..")) return null;
  return normalized;
}

function sanitizeTaskText(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_SAFE_TEXT);
  if (!compact) return null;

  return compact
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED_TOKEN}`)
    .replace(/(oauth|access|refresh)[_-]?token\s*[:=]\s*\S+/gi, "$1 token=[redacted]")
    .replace(/oauth[_-]?token/gi, "oauth_token")
    .replace(/TINYBIRD[A-Z0-9_]*\s*[:=]\s*\S+/gi, "TINYBIRD_[redacted]")
    .replace(/tinybird[_-]?token/gi, "TINYBIRD_[redacted]")
    .replace(/github(?:Installation)?Token\s*[:=]\s*\S+/gi, "githubToken=[redacted]")
    .replace(/(visitor|user)[_-]?id\s*[:=]\s*\S+/gi, "$1Id=[redacted]");
}

function sanitizeTaskOutput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeTaskOutput(entry));
  if (!value || typeof value !== "object") {
    if (typeof value === "string") return sanitizeTaskText(value);
    return value;
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (/(oauth|token|tinybird|visitor[_-]?id|user[_-]?id|source[_-]?code)/i.test(key)) continue;
    output[key] = sanitizeTaskOutput(entry);
  }
  return output;
}

function normalizeResolverRepoInput(
  input: AnalyticsTaskProjectResolverInput["repo"],
): ResolveProjectRepoInput | null {
  if (!input || typeof input !== "object") return null;
  const repoName = normalizeText(input.name);
  const packageName = normalizeText(input.packageName);
  const gitRemote = normalizeText(input.gitRemote);
  const appRoot = normalizeRelativeRoot(input.appRoot, ".");
  if (!appRoot) return null;
  if (!repoName && !gitRemote) return null;

  return {
    name: repoName ?? undefined,
    packageName: packageName ?? null,
    gitRemote: gitRemote ?? null,
    workspaceRoot: ".",
    appRoot,
  };
}

export function summarizeProjectCandidate(project: OwnedAnalyticsProject): Record<string, unknown> {
  return {
    id: project.id,
    name: project.displayName,
    status: project.status,
    source: project.source,
    dashboardUrl: project.dashboardUrls.project,
  };
}

export async function resolveAnalyticsTaskProject(params: {
  userId: string;
  input: AnalyticsTaskProjectResolverInput;
}): Promise<ResolveAnalyticsTaskProjectResult> {
  const projectId = normalizeText(params.input.projectId);
  if (projectId) {
    const project = await getOwnedAnalyticsProject({ userId: params.userId, projectId });
    if (!project) return { status: "no_matching_project", reason: "project_not_found" };
    return { status: "ready", project };
  }

  const repo = normalizeResolverRepoInput(params.input.repo);
  if (!repo) {
    return { status: "no_matching_project", reason: "missing_project_context" };
  }

  // Keep MCP task project resolution aligned with existing repo-fingerprint matching semantics.
  const repoNameForFingerprint = repo.name ?? repo.packageName ?? "repo";
  const fingerprintInput = buildMcpProjectFingerprintInput({
    repoName: repoNameForFingerprint,
    packageName: repo.packageName ?? null,
    gitRemote: repo.gitRemote ?? null,
    appRoot: repo.appRoot ?? ".",
  });
  const requestedFingerprint = mcpFingerprint(fingerprintInput);
  const normalizedRemote = normalizeGitRemote(repo.gitRemote ?? null);
  void requestedFingerprint;
  void normalizedRemote;

  const resolved = await resolveOwnedMcpProjectForRepoContext({
    userId: params.userId,
    repo,
  });

  if (resolved.status === "ok") return { status: "ready", project: resolved.project };
  if (resolved.status === "multiple_matches") {
    return {
      status: "needs_project_selection",
      candidates: resolved.candidates.slice(0, 10),
    };
  }
  if (resolved.status === "invalid_repo_context") {
    return { status: "no_matching_project", reason: "invalid_repo_context" };
  }
  return { status: "no_matching_project", reason: "no_match" };
}

export function toMcpAnalyticsTaskListRow(
  task: AnalyticsTaskRecord,
  project: OwnedAnalyticsProject,
): McpAnalyticsTaskListRow {
  return {
    id: task.id,
    title: task.title,
    taskType: task.taskType,
    status: task.status,
    eventName: task.eventName,
    createdAt: task.createdAt.toISOString(),
    dashboardUrl: project.dashboardUrls.project,
  };
}

export function toMcpAnalyticsTaskContext(
  task: AnalyticsTaskRecord,
  project: OwnedAnalyticsProject,
): McpAnalyticsTaskContext {
  return {
    taskId: task.id,
    status: task.status,
    originalQuestion: task.originalQuestion,
    currentAnswer: {
      kind: task.answerKind,
      summary: sanitizeTaskText(task.answerSummary),
      analyticsGap: sanitizeTaskText(task.analyticsGap),
    },
    eventContract: {
      taskType: task.taskType,
      eventName: task.eventName,
      triggerDescription: task.triggerDescription,
      propertiesSchema: (sanitizeTaskOutput(task.propertiesSchema) as Record<string, unknown>) ?? {},
      targetSurface: task.targetSurface,
    },
    implementationGuidance: sanitizeTaskText(task.implementationGuidance),
    localVerification:
      (sanitizeTaskOutput(task.localVerification) as Record<string, unknown> | null | undefined) ?? null,
    productionVerification: {
      source: task.verificationSource,
      criteria: (sanitizeTaskOutput(task.verificationCriteria) as Record<string, unknown>) ?? {},
      verifiedAt: task.verifiedAt ? task.verifiedAt.toISOString() : null,
      lastError: sanitizeTaskText(task.lastError),
    },
    dashboardUrl: project.dashboardUrls.project,
  };
}
