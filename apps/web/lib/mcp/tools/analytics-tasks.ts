import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import {
  resolveAnalyticsTaskProject,
  summarizeProjectCandidate,
  toMcpAnalyticsTaskContext,
  toMcpAnalyticsTaskListRow,
} from "../../analytics/tasks/mcp";
import { findOwnedAnalyticsTaskById, listOwnedAnalyticsTasksForProject } from "../../analytics/tasks/queries";
import { transitionAnalyticsTask } from "../../analytics/tasks/transitions";
import { refreshAnalyticsTaskListVerification, refreshAnalyticsTaskVerification } from "../../analytics/tasks/verification";
import { getOwnedAnalyticsProject } from "../../db/queries/projects";
import { MCP_TASKS_SCOPE } from "../../oauth/validation";
import { hasMcpScope, userIdFromAuth } from "./auth";
import { analyticsTaskToolSchemas } from "./schemas";

type AnalyticsTaskToolStatus =
  | "ready"
  | "no_tasks"
  | "needs_project_selection"
  | "no_matching_project"
  | "task_not_found"
  | "unauthorized"
  | "insufficient_scope"
  | "invalid_request"
  | "service_error";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
} as const;

const MUTATION_ANNOTATIONS = {
  readOnlyHint: false,
  openWorldHint: false,
} as const;

function inputRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function toAnalyticsTaskToolResult(
  payload: Record<string, unknown> & { status: AnalyticsTaskToolStatus; summary: string },
): CallToolResult {
  const errorStatuses = new Set<AnalyticsTaskToolStatus>([
    "needs_project_selection",
    "no_matching_project",
    "task_not_found",
    "unauthorized",
    "insufficient_scope",
    "invalid_request",
    "service_error",
  ]);

  return {
    ...(errorStatuses.has(payload.status) ? { isError: true } : {}),
    structuredContent: payload,
    content: [{ type: "text", text: payload.summary }],
  };
}

function requireTaskScope(extra: { authInfo?: unknown }): { ok: true; userId: string } | { ok: false; result: CallToolResult } {
  const userId = userIdFromAuth(extra.authInfo);
  if (!userId) {
    return {
      ok: false,
      result: toAnalyticsTaskToolResult({
        status: "unauthorized",
        summary: "Authentication is required before accessing analytics tasks.",
      }),
    };
  }
  if (!hasMcpScope(extra.authInfo, MCP_TASKS_SCOPE)) {
    return {
      ok: false,
      result: toAnalyticsTaskToolResult({
        status: "insufficient_scope",
        summary: "The mcp:tasks scope is required before accessing analytics tasks.",
        requiredScope: MCP_TASKS_SCOPE,
      }),
    };
  }

  return { ok: true, userId };
}

async function handleListPendingAnalyticsTasks(
  input: unknown,
  extra: { authInfo?: unknown },
): Promise<CallToolResult> {
  const auth = requireTaskScope(extra);
  if (!auth.ok) return auth.result;

  const parsed = analyticsTaskToolSchemas.listPendingAnalyticsTasks.inputSchema.safeParse(inputRecord(input));
  if (!parsed.success) {
    return toAnalyticsTaskToolResult({
      status: "invalid_request",
      summary: "Invalid list_pending_analytics_tasks input.",
    });
  }

  const includeInProgress = parsed.data.includeInProgress ?? true;
  const resolved = await resolveAnalyticsTaskProject({
    userId: auth.userId,
    input: parsed.data,
  });

  if (resolved.status === "needs_project_selection") {
    return toAnalyticsTaskToolResult({
      status: "needs_project_selection",
      summary: "Multiple owned projects matched this context. Select one project and retry.",
      candidates: resolved.candidates.slice(0, 10).map(summarizeProjectCandidate),
    });
  }
  if (resolved.status === "no_matching_project") {
    return toAnalyticsTaskToolResult({
      status: "no_matching_project",
      summary: "No owned analytics project matched the provided context.",
      reason: resolved.reason,
    });
  }

  const tasks = await listOwnedAnalyticsTasksForProject({
    userId: auth.userId,
    projectId: resolved.project.id,
  });
  const refreshedTasks = await refreshAnalyticsTaskListVerification({ tasks });
  const statuses = includeInProgress ? new Set(["pending", "in_progress"]) : new Set(["pending"]);
  const visible = refreshedTasks.filter((task) => statuses.has(task.status));

  if (visible.length === 0) {
    return toAnalyticsTaskToolResult({
      status: "no_tasks",
      summary: `No pending analytics tasks were found for ${resolved.project.displayName}.`,
      project: summarizeProjectCandidate(resolved.project),
      tasks: [],
    });
  }

  return toAnalyticsTaskToolResult({
    status: "ready",
    summary: `${visible.length} pending analytics task${visible.length === 1 ? "" : "s"} found for ${resolved.project.displayName}.`,
    project: summarizeProjectCandidate(resolved.project),
    tasks: visible.map((task) => toMcpAnalyticsTaskListRow(task, resolved.project)),
  });
}

async function handleGetAnalyticsTaskContext(
  input: unknown,
  extra: { authInfo?: unknown },
): Promise<CallToolResult> {
  const auth = requireTaskScope(extra);
  if (!auth.ok) return auth.result;

  const parsed = analyticsTaskToolSchemas.getAnalyticsTaskContext.inputSchema.safeParse(inputRecord(input));
  if (!parsed.success) {
    return toAnalyticsTaskToolResult({
      status: "invalid_request",
      summary: "Invalid get_analytics_task_context input.",
    });
  }

  const projectId = parsed.data.projectId?.trim() || undefined;
  if (projectId) {
    const resolved = await resolveAnalyticsTaskProject({
      userId: auth.userId,
      input: { projectId },
    });
    if (resolved.status !== "ready") {
      return toAnalyticsTaskToolResult({
        status: "no_matching_project",
        summary: "The provided project could not be resolved for this account.",
      });
    }
  }

  const task = await findOwnedAnalyticsTaskById({
    userId: auth.userId,
    taskId: parsed.data.taskId,
    projectId,
  });
  if (!task) {
    return toAnalyticsTaskToolResult({
      status: "task_not_found",
      summary: "Task not found for this account or project.",
    });
  }

  const project = await getOwnedAnalyticsProject({
    userId: auth.userId,
    projectId: task.projectId,
  });
  if (!project) {
    return toAnalyticsTaskToolResult({
      status: "no_matching_project",
      summary: "No owned analytics project matched this task.",
    });
  }

  return toAnalyticsTaskToolResult({
    status: "ready",
    summary: `Loaded task context for ${task.title}.`,
    project: summarizeProjectCandidate(project),
    context: toMcpAnalyticsTaskContext(task, project),
  });
}

async function handleReportAnalyticsTaskStatus(
  input: unknown,
  extra: { authInfo?: unknown },
): Promise<CallToolResult> {
  const auth = requireTaskScope(extra);
  if (!auth.ok) return auth.result;

  const parsed = analyticsTaskToolSchemas.reportAnalyticsTaskStatus.inputSchema.safeParse(inputRecord(input));
  if (!parsed.success) {
    return toAnalyticsTaskToolResult({
      status: "invalid_request",
      summary: "Invalid report_analytics_task_status input.",
    });
  }

  const projectId = parsed.data.projectId?.trim() || undefined;
  if (projectId) {
    const project = await getOwnedAnalyticsProject({ userId: auth.userId, projectId });
    if (!project) {
      return toAnalyticsTaskToolResult({
        status: "no_matching_project",
        summary: "No owned analytics project matched the provided projectId.",
      });
    }
  }

  const existingTask = await findOwnedAnalyticsTaskById({
    userId: auth.userId,
    taskId: parsed.data.taskId,
    projectId,
  });
  if (!existingTask) {
    return toAnalyticsTaskToolResult({
      status: "task_not_found",
      summary: "Task not found for this account or project.",
    });
  }

  try {
    const transitioned = await transitionAnalyticsTask({
      taskId: existingTask.id,
      userId: auth.userId,
      projectId: existingTask.projectId,
      actorType: "agent",
      toStatus: parsed.data.status,
      changedFiles: parsed.data.changedFiles,
      verificationCommands: parsed.data.verificationCommands,
      localEventEvidence: parsed.data.localEventEvidence,
      implementationFingerprint: parsed.data.implementationFingerprint,
      errorSummary: parsed.data.errorSummary,
    });

    const verification = parsed.data.status === "implemented_locally"
      ? await refreshAnalyticsTaskVerification({ task: transitioned.task })
      : null;
    const task = verification?.task ?? transitioned.task;

    const project = await getOwnedAnalyticsProject({
      userId: auth.userId,
      projectId: task.projectId,
    });
    if (!project) {
      return toAnalyticsTaskToolResult({
        status: "no_matching_project",
        summary: "No owned analytics project matched this task.",
      });
    }

    return toAnalyticsTaskToolResult({
      status: "ready",
      summary: `Task ${task.id} is now ${task.status}.`,
      transition: transitioned.status,
      verification: verification?.status ?? "unchanged",
      task: toMcpAnalyticsTaskListRow(task, project),
    });
  } catch (error) {
    return toAnalyticsTaskToolResult({
      status: "service_error",
      summary: error instanceof Error ? error.message : "Task status update failed.",
    });
  }
}

export function registerAnalyticsTaskTools(server: McpServer): void {
  server.registerTool(
    "list_pending_analytics_tasks",
    {
      title: "List Pending Analytics Tasks",
      description: "Resolve one owned project and list pending analytics implementation tasks.",
      ...analyticsTaskToolSchemas.listPendingAnalyticsTasks,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleListPendingAnalyticsTasks,
  );

  server.registerTool(
    "get_analytics_task_context",
    {
      title: "Get Analytics Task Context",
      description: "Return the full context needed to implement one analytics task safely.",
      ...analyticsTaskToolSchemas.getAnalyticsTaskContext,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    handleGetAnalyticsTaskContext,
  );

  server.registerTool(
    "report_analytics_task_status",
    {
      title: "Report Analytics Task Status",
      description: "Update implementation progress for one analytics task with bounded local evidence.",
      ...analyticsTaskToolSchemas.reportAnalyticsTaskStatus,
      annotations: MUTATION_ANNOTATIONS,
    },
    handleReportAnalyticsTaskStatus,
  );
}
