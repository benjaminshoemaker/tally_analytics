import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { parseAnalyticsPeriod, type AnalyticsPeriod } from "../../analytics/periods";
import { boundAnalyticsString } from "../../analytics/urls";
import type { AnalyticsErrorStatus, AnalyticsServiceResultBase } from "../../analytics/types";
import type { ResolveProjectRepoInput } from "../../db/queries/projects";

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

export function unauthorizedAnalyticsResult(): AnalyticsServiceResultBase {
  return {
    status: "unauthorized",
    summary: "Authentication is required before querying Tally analytics.",
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
