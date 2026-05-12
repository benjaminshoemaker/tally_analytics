import { getUserFromRequest } from "../../../../../../../lib/auth/get-user";
import { findOwnedAnalyticsTaskById, updateOwnedAnalyticsTask } from "../../../../../../../lib/analytics/tasks/queries";
import { transitionAnalyticsTask } from "../../../../../../../lib/analytics/tasks/transitions";
import { getOwnedAnalyticsProject } from "../../../../../../../lib/db/queries/projects";

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.slice(0, maxLength);
}

function normalizeEventName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!EVENT_NAME_PATTERN.test(normalized)) return null;
  return normalized;
}

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> | { id: string; taskId: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  const taskId = params.taskId;
  if (!projectId || !taskId) return Response.json({ error: "Missing required ids" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({
    userId: user.id,
    projectId,
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const task = await loadOwnedTask({
    userId: user.id,
    projectId,
    taskId,
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(parsed)) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const action = typeof parsed.action === "string" ? parsed.action : "";

  if (action === "edit") {
    if (task.status !== "pending") {
      return Response.json({ error: "Only pending tasks can be edited" }, { status: 409 });
    }

    const title = normalizeText(parsed.title, 180);
    const eventName = normalizeEventName(parsed.eventName);
    const implementationNotes = normalizeText(parsed.implementationNotes, 600);

    const patch = {
      ...(title ? { title } : {}),
      ...(eventName ? { eventName } : {}),
      ...(implementationNotes ? { implementationGuidance: implementationNotes } : {}),
      updatedAt: new Date(),
    };

    const updated = await updateOwnedAnalyticsTask({
      userId: user.id,
      projectId,
      taskId,
      patch,
    });
    if (!updated) return Response.json({ error: "Task not found" }, { status: 404 });
    return Response.json({ status: "updated", task: updated }, { status: 200 });
  }

  if (action === "archive") {
    const transitioned = await transitionAnalyticsTask({
      userId: user.id,
      projectId,
      taskId,
      actorType: "user",
      toStatus: "archived",
      reason: "user_archived_task",
    });
    return Response.json({ status: transitioned.status, task: transitioned.task }, { status: 200 });
  }

  if (action === "reopen") {
    if (task.status !== "failed") {
      return Response.json({ error: "Only failed tasks can be reopened" }, { status: 409 });
    }
    const transitioned = await transitionAnalyticsTask({
      userId: user.id,
      projectId,
      taskId,
      actorType: "user",
      toStatus: "pending",
      reason: "user_reopened_task",
    });
    return Response.json({ status: transitioned.status, task: transitioned.task }, { status: 200 });
  }

  if (action === "cancel") {
    const transitioned = await transitionAnalyticsTask({
      userId: user.id,
      projectId,
      taskId,
      actorType: "user",
      toStatus: "cancelled",
      reason: "user_cancelled_task",
    });
    return Response.json({ status: transitioned.status, task: transitioned.task }, { status: 200 });
  }

  return Response.json({ error: "Unsupported task action" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> | { id: string; taskId: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  const taskId = params.taskId;
  if (!projectId || !taskId) return Response.json({ error: "Missing required ids" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({
    userId: user.id,
    projectId,
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const task = await loadOwnedTask({
    userId: user.id,
    projectId,
    taskId,
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  if (task.status !== "pending") {
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
