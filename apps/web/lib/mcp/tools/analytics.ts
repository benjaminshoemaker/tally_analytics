import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { parseAnalyticsPeriod, type AnalyticsPeriod } from "../../analytics/periods";
import { boundAnalyticsString } from "../../analytics/urls";
import type { AnalyticsErrorStatus, AnalyticsServiceResultBase } from "../../analytics/types";
import type { OwnedAnalyticsProject, ResolveProjectRepoInput } from "../../db/queries/projects";
import { MCP_TASKS_SCOPE } from "../../oauth/validation";
import { analyticsToolSchemas } from "./analytics-schemas";
import { hasMcpScope, userIdFromAuth } from "./auth";

export type AnalyticsToolValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AnalyticsServiceResultBase };

function validationError(status: AnalyticsErrorStatus, summary: string): AnalyticsToolValidationResult<never> {
  return { ok: false, error: { status, summary } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const ANALYTICS_TOOL_ERROR_STATUSES = new Set([
  "invalid_period",
  "invalid_limit",
  "invalid_since",
  "invalid_goal",
  "invalid_event_name",
  "invalid_steps",
  "invalid_repo_context",
  "project_not_found",
  "unauthorized",
  "service_error",
]);

function redactedToolText(value: unknown): string {
  const bounded = boundAnalyticsString(value, 600);
  if (!bounded) return "Tally analytics result returned.";
  if (/\b(select|insert|update|delete)\b[\s\S]+\b(from|into|set|where)\b/i.test(bounded)) {
    return "Analytics query failed.";
  }

  return bounded
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(oauth|access|refresh)[_-]?token\s*[:=]\s*\S+/gi, "$1 token=[redacted]")
    .replace(/TINYBIRD[A-Z0-9_]*\s*[:=]\s*\S+/gi, "TINYBIRD_[redacted]")
    .replace(/github(?:Installation)?Id\s*[:=]\s*\S+/gi, "githubId=[redacted]")
    .replace(/billing\w*\s*[:=]\s*\S+/gi, "billing=[redacted]");
}

export function isAnalyticsToolErrorStatus(status: string): boolean {
  return ANALYTICS_TOOL_ERROR_STATUSES.has(status);
}

export function toAnalyticsToolResult(
  result: AnalyticsServiceResultBase & Record<string, unknown>,
): CallToolResult {
  const toolResult: CallToolResult = {
    structuredContent: result,
    content: [{ type: "text", text: redactedToolText(result.summary) }],
  };

  if (isAnalyticsToolErrorStatus(result.status)) {
    toolResult.isError = true;
  }

  return toolResult;
}

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
} as const;

function inputRecord(input: unknown): Record<string, unknown> {
  return isRecord(input) ? input : {};
}

function projectIdFromInput(input: Record<string, unknown>): string {
  return typeof input.projectId === "string" ? input.projectId : "";
}

function projectNotFoundResult(): AnalyticsServiceResultBase {
  return {
    status: "project_not_found",
    summary: "Project not found.",
  };
}

function requireAnalyticsScopeUserId(extra: { authInfo?: unknown }): AnalyticsToolValidationResult<string> {
  const userId = userIdFromAuth(extra.authInfo);
  if (!userId) return { ok: false, error: unauthorizedAnalyticsResult() };
  if (!hasMcpScope(extra.authInfo, MCP_TASKS_SCOPE)) {
    return { ok: false, error: unauthorizedAnalyticsScopeResult() };
  }
  return { ok: true, value: userId };
}

function analyticsToolErrorResult(error: AnalyticsServiceResultBase & Partial<Record<string, unknown>>): CallToolResult {
  return toAnalyticsToolResult(error as AnalyticsServiceResultBase & Record<string, unknown>);
}

function toolProject(project: OwnedAnalyticsProject): Record<string, unknown> {
  return {
    id: project.id,
    name: project.displayName,
    status: project.status,
    source: project.source,
    lastEventAt: project.lastEventAt ? project.lastEventAt.toISOString() : null,
    dashboardUrls: project.dashboardUrls,
  };
}

async function requireOwnedProject(userId: string, projectId: string): Promise<boolean> {
  const { getOwnedAnalyticsProject } = await import("../../db/queries/projects");
  return Boolean(await getOwnedAnalyticsProject({ userId, projectId }));
}

async function handleListProjects(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 20, min: 1, max: 100 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);

  const { listOwnedAnalyticsProjects } = await import("../../db/queries/projects");
  const projects = await listOwnedAnalyticsProjects({ userId, limit: limit.value });
  return toAnalyticsToolResult({
    status: projects.length === 0 ? "no_projects" : "ok",
    summary: projects.length === 0 ? "No Tally analytics projects were found." : `${projects.length} projects found.`,
    projects: projects.map(toolProject),
  });
}

async function handleResolveProject(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const repo = parseResolveProjectRepoInput(input);
  if (!repo.ok) return analyticsToolErrorResult(repo.error);

  const { resolveOwnedMcpProjectForRepoContext } = await import("../../db/queries/projects");
  const result = await resolveOwnedMcpProjectForRepoContext({ userId, repo: repo.value });
  if (result.status === "invalid_repo_context") {
    return analyticsToolErrorResult({
      status: "invalid_repo_context",
      summary: `Invalid repo context: ${result.reason}.`,
    });
  }
  if (result.status === "no_match") {
    return toAnalyticsToolResult({
      status: "no_match",
      summary: "No owned Tally analytics project matched this repo context.",
    });
  }
  if (result.status === "multiple_matches") {
    return toAnalyticsToolResult({
      status: "multiple_matches",
      summary: `${result.candidates.length} owned projects matched this repo context.`,
      candidates: result.candidates.map(toolProject),
    });
  }

  return toAnalyticsToolResult({
    status: "ok",
    summary: `Resolved project ${result.project.displayName}.`,
    project: toolProject(result.project),
    match: result.match,
  });
}

async function handleProjectOverview(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getProjectOverview } = await import("../../analytics/service");
  const result = await getProjectOverview({ userId, projectId, period: period.value });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleLiveEvents(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 20, min: 1, max: 100 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);
  const since = parseAnalyticsToolSince(parsedInput.since);
  if (!since.ok) return analyticsToolErrorResult(since.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getLiveEvents } = await import("../../analytics/service");
  const result = await getLiveEvents({ userId, projectId, limit: limit.value, since: since.value });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleSessionsSummary(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getSessionsSummary } = await import("../../analytics/service");
  const result = await getSessionsSummary({ userId, projectId, period: period.value });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleTopPages(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 10, min: 1, max: 50 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getTopPages } = await import("../../analytics/service");
  const result = await getTopPages({ userId, projectId, period: period.value, limit: limit.value });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleTopReferrers(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 10, min: 1, max: 50 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getTopReferrers } = await import("../../analytics/service");
  const result = await getTopReferrers({ userId, projectId, period: period.value, limit: limit.value });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleListEvents(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 50, min: 1, max: 100 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { listEvents } = await import("../../analytics/service");
  const result = await listEvents({ userId, projectId, period: period.value });
  if ("events" in result) {
    return toAnalyticsToolResult({
      ...result,
      events: result.events.slice(0, limit.value),
    } as AnalyticsServiceResultBase & Record<string, unknown>);
  }

  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleEventSchema(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);
  const eventName = parseAnalyticsToolEventName(parsedInput.eventName);
  if (!eventName.ok) return analyticsToolErrorResult(eventName.error);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 50, min: 1, max: 100 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getEventSchema } = await import("../../analytics/service");
  const result = await getEventSchema({ userId, projectId, period: period.value, eventName: eventName.value });
  if (result.status === "ok") {
    return toAnalyticsToolResult({
      ...result,
      event: {
        ...result.event,
        properties: result.event.properties.slice(0, limit.value),
      },
    } as AnalyticsServiceResultBase & Record<string, unknown>);
  }

  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handlePathsToEvent(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) return analyticsToolErrorResult(auth.error);
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult(period.error);
  const targetEvent = parseAnalyticsToolEventName(parsedInput.targetEvent);
  if (!targetEvent.ok) return analyticsToolErrorResult(targetEvent.error);
  const maxSteps = parseAnalyticsToolSteps(parsedInput.maxSteps);
  if (!maxSteps.ok) return analyticsToolErrorResult(maxSteps.error);
  const limit = parseAnalyticsToolLimit(parsedInput.limit, { defaultValue: 10, min: 1, max: 50 });
  if (!limit.ok) return analyticsToolErrorResult(limit.error);

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) return analyticsToolErrorResult(projectNotFoundResult());

  const { getPathsToEvent } = await import("../../analytics/service");
  const result = await getPathsToEvent({
    userId,
    projectId,
    period: period.value,
    targetEvent: targetEvent.value,
    maxSteps: maxSteps.value,
    limit: limit.value,
  });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

async function handleSuggestNextEvents(input: unknown, extra: { authInfo?: unknown }): Promise<CallToolResult> {
  const auth = requireAnalyticsScopeUserId(extra);
  if (!auth.ok) {
    return analyticsToolErrorResult({ ...auth.error, createsPendingTasks: false });
  }
  const userId = auth.value;

  const parsedInput = inputRecord(input);
  const period = parseAnalyticsToolPeriod(parsedInput.period);
  if (!period.ok) return analyticsToolErrorResult({ ...period.error, createsPendingTasks: false });
  const goal = parseAnalyticsToolGoal(parsedInput.goal);
  if (!goal.ok) return analyticsToolErrorResult({ ...goal.error, createsPendingTasks: false });

  const projectId = projectIdFromInput(parsedInput);
  if (!(await requireOwnedProject(userId, projectId))) {
    return analyticsToolErrorResult({ ...projectNotFoundResult(), createsPendingTasks: false });
  }

  const { suggestNextEvents } = await import("../../analytics/service");
  const result = await suggestNextEvents({ userId, projectId, period: period.value, goal: goal.value });
  return toAnalyticsToolResult(result as AnalyticsServiceResultBase & Record<string, unknown>);
}

export function registerAnalyticsTools(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      title: "List Tally Analytics Projects",
      description: "List the authenticated user's Tally analytics projects.",
      ...analyticsToolSchemas.listProjects,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleListProjects,
  );

  server.registerTool(
    "resolve_project",
    {
      title: "Resolve Tally Analytics Project",
      description: "Resolve the current repo/app context to one owned Tally analytics project.",
      ...analyticsToolSchemas.resolveProject,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleResolveProject,
  );

  server.registerTool(
    "get_project_overview",
    {
      title: "Get Project Analytics Overview",
      description: "Summarize dashboard-compatible page view, session, top page, and referrer metrics.",
      ...analyticsToolSchemas.getProjectOverview,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleProjectOverview,
  );

  server.registerTool(
    "get_live_events",
    {
      title: "Get Live Analytics Events",
      description: "Return recent analytics events for one owned project.",
      ...analyticsToolSchemas.getLiveEvents,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleLiveEvents,
  );

  server.registerTool(
    "get_sessions_summary",
    {
      title: "Get Sessions Summary",
      description: "Summarize dashboard-compatible sessions for one owned project.",
      ...analyticsToolSchemas.getSessionsSummary,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleSessionsSummary,
  );

  server.registerTool(
    "get_top_pages",
    {
      title: "Get Top Pages",
      description: "Return the most visited pages for one owned project.",
      ...analyticsToolSchemas.getTopPages,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleTopPages,
  );

  server.registerTool(
    "get_top_referrers",
    {
      title: "Get Top Referrers",
      description: "Return the top traffic referrers for one owned project.",
      ...analyticsToolSchemas.getTopReferrers,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleTopReferrers,
  );

  server.registerTool(
    "list_events",
    {
      title: "List Analytics Events",
      description: "List observed event names for one owned project.",
      ...analyticsToolSchemas.listEvents,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleListEvents,
  );

  server.registerTool(
    "get_event_schema",
    {
      title: "Get Event Schema",
      description: "Summarize safe observed properties for one exact event name.",
      ...analyticsToolSchemas.getEventSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleEventSchema,
  );

  server.registerTool(
    "get_paths_to_event",
    {
      title: "Get Paths To Event",
      description: "Summarize page paths that occurred before one exact target event.",
      ...analyticsToolSchemas.getPathsToEvent,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handlePathsToEvent,
  );

  server.registerTool(
    "suggest_next_events",
    {
      title: "Suggest Next Analytics Events",
      description: "Suggest read-only deterministic analytics events to add next.",
      ...analyticsToolSchemas.suggestNextEvents,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleSuggestNextEvents,
  );
}

export function unauthorizedAnalyticsResult(): AnalyticsServiceResultBase {
  return {
    status: "unauthorized",
    summary: "Authentication is required before querying Tally analytics.",
  };
}

export function unauthorizedAnalyticsScopeResult(): AnalyticsServiceResultBase {
  return {
    status: "unauthorized",
    summary: "The mcp:tasks scope is required before querying Tally analytics.",
  };
}

export function parseAnalyticsToolPeriod(value: unknown): AnalyticsToolValidationResult<AnalyticsPeriod> {
  if (typeof value !== "string") {
    return validationError("invalid_period", "Period must be one of 24h, 7d, or 30d.");
  }

  const period = parseAnalyticsPeriod(value);
  if (!period) {
    return validationError("invalid_period", "Period must be one of 24h, 7d, or 30d.");
  }

  return { ok: true, value: period };
}

export function parseAnalyticsToolLimit(
  value: unknown,
  options: { defaultValue: number; min: number; max: number },
): AnalyticsToolValidationResult<number> {
  if (value === undefined || value === null) return { ok: true, value: options.defaultValue };
  if (typeof value !== "number" || !Number.isInteger(value) || value < options.min || value > options.max) {
    return validationError(
      "invalid_limit",
      `Limit must be an integer from ${options.min} to ${options.max}.`,
    );
  }
  return { ok: true, value };
}

export function parseAnalyticsToolSince(value: unknown): AnalyticsToolValidationResult<Date | null> {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") {
    return validationError("invalid_since", "Since must be a valid timestamp.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return validationError("invalid_since", "Since must be a valid timestamp.");
  }

  return { ok: true, value: date };
}

export function parseAnalyticsToolGoal(value: unknown): AnalyticsToolValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== "string") {
    return validationError("invalid_goal", "Goal must be a string from 1 to 200 characters when provided.");
  }

  const goal = boundAnalyticsString(value, 201);
  if (!goal || goal.length > 200) {
    return validationError("invalid_goal", "Goal must be a string from 1 to 200 characters when provided.");
  }

  return { ok: true, value: goal };
}

export function parseAnalyticsToolEventName(value: unknown): AnalyticsToolValidationResult<string> {
  if (typeof value !== "string") {
    return validationError("invalid_event_name", "Event name must be a string from 1 to 128 characters.");
  }

  const eventName = boundAnalyticsString(value, 129);
  if (!eventName || eventName.length > 128) {
    return validationError("invalid_event_name", "Event name must be a string from 1 to 128 characters.");
  }

  return { ok: true, value: eventName };
}

export function parseAnalyticsToolSteps(
  value: unknown,
  defaultValue = 5,
): AnalyticsToolValidationResult<number> {
  if (value === undefined || value === null) return { ok: true, value: defaultValue };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 10) {
    return validationError("invalid_steps", "Max steps must be an integer from 1 to 10.");
  }
  return { ok: true, value };
}

function parseRelativeRepoPath(value: unknown, fallback: string): string | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-z]:\//i.test(normalized)) return null;
  if (normalized.split("/").some((segment) => segment === "..")) return null;
  return normalized.replace(/\/+$/, "") || ".";
}

export function parseResolveProjectRepoInput(value: unknown): AnalyticsToolValidationResult<ResolveProjectRepoInput> {
  if (!isRecord(value) || !isRecord(value.repo)) {
    return validationError("invalid_repo_context", "Repo context is required.");
  }

  const repo = value.repo;
  const name = typeof repo.name === "string" ? repo.name.trim() : undefined;
  const gitRemote = typeof repo.gitRemote === "string" ? repo.gitRemote.trim() : null;
  if (!name && !gitRemote) {
    return validationError("invalid_repo_context", "Repo name or git remote is required.");
  }

  const workspaceRoot = parseRelativeRepoPath(repo.workspaceRoot, ".");
  const appRoot = parseRelativeRepoPath(repo.appRoot, ".");
  if (!workspaceRoot || !appRoot) {
    return validationError("invalid_repo_context", "Repo paths must be relative and stay inside the workspace.");
  }

  const packageManager =
    repo.packageManager === "pnpm" ||
    repo.packageManager === "npm" ||
    repo.packageManager === "yarn" ||
    repo.packageManager === "bun"
      ? repo.packageManager
      : undefined;

  return {
    ok: true,
    value: {
      name,
      packageName: typeof repo.packageName === "string" ? repo.packageName.trim() : null,
      gitRemote,
      workspaceRoot,
      appRoot,
      packageManager,
    },
  };
}
