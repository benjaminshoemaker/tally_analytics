import { findOwnedAnalyticsTaskById, updateOwnedAnalyticsTask } from "../../../../../../../lib/analytics/tasks/queries";
import { canDeleteAnalyticsTask, canEditAnalyticsTask } from "../../../../../../../lib/analytics/tasks/status-rules";
import {
  isRecord,
  normalizeTaskEventName,
  normalizeTaskText,
} from "../../../../../../../lib/analytics/tasks/route-validation";
import { transitionAnalyticsTask } from "../../../../../../../lib/analytics/tasks/transitions";
import type { AnalyticsTaskStatus } from "../../../../../../../lib/analytics/tasks/types";
import {
  isRouteContextResponse,
  parseJsonRequestBody,
  requireOwnedTaskProjectRouteContext,
} from "../../../../../../../lib/analytics/route-context";

async function loadOwnedTask(params: {
  userId: string;
  projectId: string;
  taskId: string;
}) {
  return findOwnedAnalyticsTaskById({
    userId: params.userId,
    projectId: params.projectId,
    taskId: params.taskId,
  });
}

async function editTask(params: {
  userId: string;
  projectId: string;
  taskId: string;
  taskStatus: AnalyticsTaskStatus;
  parsed: Record<string, unknown>;
}): Promise<Response> {
  if (!canEditAnalyticsTask(params.taskStatus)) {
    return Response.json({ error: "Only pending tasks can be edited" }, { status: 409 });
  }

  const title = normalizeTaskText(params.parsed.title, 180);
  const eventName = normalizeTaskEventName(params.parsed.eventName);
  const implementationNotes = normalizeTaskText(params.parsed.implementationNotes, 600);

  const patch = {
    ...(title ? { title } : {}),
    ...(eventName ? { eventName } : {}),
    ...(implementationNotes ? { implementationGuidance: implementationNotes } : {}),
    updatedAt: new Date(),
  };

  const updated = await updateOwnedAnalyticsTask({
    userId: params.userId,
    projectId: params.projectId,
    taskId: params.taskId,
    patch,
  });
  if (!updated) return Response.json({ error: "Task not found" }, { status: 404 });
  return Response.json({ status: "updated", task: updated }, { status: 200 });
}

async function transitionTaskAction(params: {
  userId: string;
  projectId: string;
  taskId: string;
  toStatus: "archived" | "pending" | "cancelled";
  reason: string;
}): Promise<Response> {
  const transitioned = await transitionAnalyticsTask({
    userId: params.userId,
    projectId: params.projectId,
    taskId: params.taskId,
    actorType: "user",
    toStatus: params.toStatus,
    reason: params.reason,
  });
  return Response.json({ status: transitioned.status, task: transitioned.task }, { status: 200 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> | { id: string; taskId: string } },
): Promise<Response> {
  const routeContext = await requireOwnedTaskProjectRouteContext(request, context.params);
  if (isRouteContextResponse(routeContext)) return routeContext;
  const { user, projectId, taskId } = routeContext;

  const task = await loadOwnedTask({
    userId: user.id,
    projectId,
    taskId,
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const parsed = await parseJsonRequestBody(request);
  if (isRouteContextResponse(parsed)) return parsed;
  if (!isRecord(parsed)) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const action = typeof parsed.action === "string" ? parsed.action : "";

  if (action === "edit") {
    return editTask({ userId: user.id, projectId, taskId, taskStatus: task.status, parsed });
  }

  if (action === "archive") {
    return transitionTaskAction({ userId: user.id, projectId, taskId, toStatus: "archived", reason: "user_archived_task" });
  }

  if (action === "reopen") {
    if (task.status !== "failed") {
      return Response.json({ error: "Only failed tasks can be reopened" }, { status: 409 });
    }
    return transitionTaskAction({ userId: user.id, projectId, taskId, toStatus: "pending", reason: "user_reopened_task" });
  }

  if (action === "cancel") {
    return transitionTaskAction({ userId: user.id, projectId, taskId, toStatus: "cancelled", reason: "user_cancelled_task" });
  }

  return Response.json({ error: "Unsupported task action" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> | { id: string; taskId: string } },
): Promise<Response> {
  const routeContext = await requireOwnedTaskProjectRouteContext(request, context.params);
  if (isRouteContextResponse(routeContext)) return routeContext;
  const { user, projectId, taskId } = routeContext;

  const task = await loadOwnedTask({
    userId: user.id,
    projectId,
    taskId,
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  if (!canDeleteAnalyticsTask(task.status)) {
    return Response.json({ error: "Only pending tasks can be deleted" }, { status: 409 });
  }

  const transitioned = await transitionAnalyticsTask({
    userId: user.id,
    projectId,
    taskId,
    actorType: "user",
    toStatus: "cancelled",
    reason: "user_deleted_pending_task",
  });
  return Response.json({ status: transitioned.status, task: transitioned.task }, { status: 200 });
}
