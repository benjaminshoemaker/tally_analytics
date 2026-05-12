import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { analyticsTaskTypes } from "../../../../../../lib/analytics/tasks/types";
import {
  createPendingAnalyticsTask,
  listOwnedAnalyticsTasksForProject,
} from "../../../../../../lib/analytics/tasks/queries";
import { refreshAnalyticsTaskListVerification } from "../../../../../../lib/analytics/tasks/verification";
import { getOwnedAnalyticsProject } from "../../../../../../lib/db/queries/projects";

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;

const defaultVisibleStatuses = new Set([
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "failed",
]);

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

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function normalizeDraft(input: unknown): {
  taskType: "track_completion" | "track_click" | "add_event_property";
  title: string;
  originalQuestion: string;
  answerKind: "partial_answer" | "cannot_answer_yet";
  answerSummary: string;
  analyticsGap: string;
  eventName: string;
  triggerDescription: string;
  propertiesSchema: Record<string, unknown>;
  targetSurface: string | null;
  implementationGuidance: string | null;
  verificationCriteria: Record<string, unknown>;
  verificationSource: "production_event";
} | null {
  if (!isRecord(input)) return null;

  const taskTypeRaw = input.taskType;
  const taskType =
    typeof taskTypeRaw === "string" && analyticsTaskTypes.includes(taskTypeRaw as (typeof analyticsTaskTypes)[number])
      ? (taskTypeRaw as "track_completion" | "track_click" | "add_event_property")
      : null;

  const title = normalizeText(input.title, 180);
  const originalQuestion = normalizeText(input.originalQuestion, 500);
  const answerSummary = normalizeText(input.answerSummary, 400) ?? "";
  const analyticsGap = normalizeText(input.analyticsGap, 400) ?? "";
  const eventName = normalizeEventName(input.eventName);
  const triggerDescription = normalizeText(input.triggerDescription, 500);
  const targetSurface = normalizeText(input.targetSurface, 200);
  const implementationGuidance = normalizeText(input.implementationGuidance, 600);

  const answerKindRaw = input.answerKind;
  const answerKind =
    answerKindRaw === "partial_answer" || answerKindRaw === "cannot_answer_yet"
      ? answerKindRaw
      : null;

  if (!taskType || !title || !originalQuestion || !answerKind || !eventName || !triggerDescription) {
    return null;
  }

  return {
    taskType,
    title,
    originalQuestion,
    answerKind,
    answerSummary,
    analyticsGap,
    eventName,
    triggerDescription,
    propertiesSchema: normalizeJsonObject(input.propertiesSchema),
    targetSurface: targetSurface ?? null,
    implementationGuidance: implementationGuidance ?? null,
    verificationCriteria: normalizeJsonObject(input.verificationCriteria),
    verificationSource: "production_event",
  };
}

function normalizeEdits(input: unknown): {
  title?: string;
  eventName?: string;
  implementationNotes?: string;
} {
  if (!isRecord(input)) return {};

  const title = normalizeText(input.title, 180);
  const eventName = normalizeEventName(input.eventName);
  const implementationNotes = normalizeText(input.implementationNotes, 600);

  return {
    ...(title ? { title } : {}),
    ...(eventName ? { eventName } : {}),
    ...(implementationNotes ? { implementationNotes } : {}),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) return Response.json({ error: "Missing project id" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({
    userId: user.id,
    projectId,
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const includeHistory = new URL(request.url).searchParams.get("includeHistory") === "1";

  const tasks = await listOwnedAnalyticsTasksForProject({
    userId: user.id,
    projectId,
  });
  const refreshed = await refreshAnalyticsTaskListVerification({
    tasks,
  });

  return Response.json(
    {
      tasks: includeHistory
        ? refreshed
        : refreshed.filter((task) => defaultVisibleStatuses.has(task.status)),
    },
    { status: 200 },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) return Response.json({ error: "Missing project id" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({
    userId: user.id,
    projectId,
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(parsed)) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const draft = normalizeDraft(parsed.draft);
  if (!draft) return Response.json({ error: "Invalid task draft" }, { status: 400 });

  const edits = normalizeEdits(parsed.edits);

  const createResult = await createPendingAnalyticsTask({
    projectId,
    userId: user.id,
    taskType: draft.taskType,
    title: edits.title ?? draft.title,
    originalQuestion: draft.originalQuestion,
    answerKind: draft.answerKind,
    answerSummary: draft.answerSummary,
    analyticsGap: draft.analyticsGap,
    eventName: edits.eventName ?? draft.eventName,
    triggerDescription: draft.triggerDescription,
    propertiesSchema: draft.propertiesSchema,
    targetSurface: draft.targetSurface,
    implementationGuidance: edits.implementationNotes ?? draft.implementationGuidance,
    verificationCriteria: draft.verificationCriteria,
    verificationSource: draft.verificationSource,
  });

  return Response.json(
    {
      status: createResult.status,
      task: createResult.task,
    },
    { status: 200 },
  );
}
