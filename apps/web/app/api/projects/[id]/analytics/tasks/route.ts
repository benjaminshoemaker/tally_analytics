import { analyticsTaskTypes } from "../../../../../../lib/analytics/tasks/types";
import {
  createPendingAnalyticsTask,
  listOwnedAnalyticsTasksForProject,
} from "../../../../../../lib/analytics/tasks/queries";
import { isDashboardVisibleTaskStatus } from "../../../../../../lib/analytics/tasks/status-rules";
import { refreshAnalyticsTaskListVerification } from "../../../../../../lib/analytics/tasks/verification";
import {
  isRecord,
  normalizeJsonObject,
  normalizeTaskEventName,
  normalizeTaskText,
} from "../../../../../../lib/analytics/tasks/route-validation";
import {
  isRouteContextResponse,
  parseJsonRequestBody,
  requireOwnedProjectRouteContext,
} from "../../../../../../lib/analytics/route-context";

type NormalizedTaskDraft = {
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
};

function normalizeDraftTaskType(value: unknown): NormalizedTaskDraft["taskType"] | null {
  return typeof value === "string" && analyticsTaskTypes.includes(value as (typeof analyticsTaskTypes)[number])
    ? (value as NormalizedTaskDraft["taskType"])
    : null;
}

function normalizeDraftAnswerKind(value: unknown): NormalizedTaskDraft["answerKind"] | null {
  return value === "partial_answer" || value === "cannot_answer_yet" ? value : null;
}

function normalizeDraftTextFields(input: Record<string, unknown>) {
  return {
    title: normalizeTaskText(input.title, 180),
    originalQuestion: normalizeTaskText(input.originalQuestion, 500),
    answerSummary: normalizeTaskText(input.answerSummary, 400) ?? "",
    analyticsGap: normalizeTaskText(input.analyticsGap, 400) ?? "",
    eventName: normalizeTaskEventName(input.eventName),
    triggerDescription: normalizeTaskText(input.triggerDescription, 500),
    targetSurface: normalizeTaskText(input.targetSurface, 200),
    implementationGuidance: normalizeTaskText(input.implementationGuidance, 600),
  };
}

function normalizeDraft(input: unknown): NormalizedTaskDraft | null {
  if (!isRecord(input)) return null;

  const taskType = normalizeDraftTaskType(input.taskType);
  const answerKind = normalizeDraftAnswerKind(input.answerKind);
  const text = normalizeDraftTextFields(input);

  if (!taskType || !text.title || !text.originalQuestion || !answerKind || !text.eventName || !text.triggerDescription) {
    return null;
  }

  return {
    taskType,
    title: text.title,
    originalQuestion: text.originalQuestion,
    answerKind,
    answerSummary: text.answerSummary,
    analyticsGap: text.analyticsGap,
    eventName: text.eventName,
    triggerDescription: text.triggerDescription,
    propertiesSchema: normalizeJsonObject(input.propertiesSchema),
    targetSurface: text.targetSurface ?? null,
    implementationGuidance: text.implementationGuidance ?? null,
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

  const title = normalizeTaskText(input.title, 180);
  const eventName = normalizeTaskEventName(input.eventName);
  const implementationNotes = normalizeTaskText(input.implementationNotes, 600);

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
  const routeContext = await requireOwnedProjectRouteContext(request, context.params);
  if (isRouteContextResponse(routeContext)) return routeContext;

  const includeHistory = new URL(request.url).searchParams.get("includeHistory") === "1";

  const tasks = await listOwnedAnalyticsTasksForProject({
    userId: routeContext.user.id,
    projectId: routeContext.projectId,
  });
  const refreshed = await refreshAnalyticsTaskListVerification({
    tasks,
  });

  return Response.json(
    {
      tasks: includeHistory
        ? refreshed
        : refreshed.filter((task) => isDashboardVisibleTaskStatus(task.status)),
    },
    { status: 200 },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const routeContext = await requireOwnedProjectRouteContext(request, context.params);
  if (isRouteContextResponse(routeContext)) return routeContext;

  const parsed = await parseJsonRequestBody(request);
  if (isRouteContextResponse(parsed)) return parsed;

  if (!isRecord(parsed)) return Response.json({ error: "Invalid request body" }, { status: 400 });

  const draft = normalizeDraft(parsed.draft);
  if (!draft) return Response.json({ error: "Invalid task draft" }, { status: 400 });

  const edits = normalizeEdits(parsed.edits);

  const createResult = await createPendingAnalyticsTask({
    projectId: routeContext.projectId,
    userId: routeContext.user.id,
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
