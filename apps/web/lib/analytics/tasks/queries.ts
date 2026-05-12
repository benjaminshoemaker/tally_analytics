import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { analyticsTaskStatusEvents, analyticsTasks } from "../../db/schema";
import { buildAnalyticsTaskDuplicateFingerprint } from "./fingerprint";
import { createAnalyticsTaskId, createAnalyticsTaskStatusEventId } from "./ids";
import type {
  AnalyticsTaskRecord,
  AnalyticsTaskStatus,
  AnalyticsTaskStatusEventRecord,
  CreateAnalyticsTaskStatusEventInput,
  CreatePendingAnalyticsTaskInput,
} from "./types";

const activeDuplicateStatuses: AnalyticsTaskStatus[] = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "verified",
  "failed",
  "duplicate",
];

const analyticsTaskSelect = {
  id: analyticsTasks.id,
  projectId: analyticsTasks.projectId,
  userId: analyticsTasks.userId,
  status: analyticsTasks.status,
  taskType: analyticsTasks.taskType,
  title: analyticsTasks.title,
  originalQuestion: analyticsTasks.originalQuestion,
  answerKind: analyticsTasks.answerKind,
  answerSummary: analyticsTasks.answerSummary,
  analyticsGap: analyticsTasks.analyticsGap,
  eventName: analyticsTasks.eventName,
  triggerDescription: analyticsTasks.triggerDescription,
  propertiesSchema: analyticsTasks.propertiesSchema,
  targetSurface: analyticsTasks.targetSurface,
  implementationGuidance: analyticsTasks.implementationGuidance,
  verificationCriteria: analyticsTasks.verificationCriteria,
  verificationSource: analyticsTasks.verificationSource,
  duplicateFingerprint: analyticsTasks.duplicateFingerprint,
  duplicateOfTaskId: analyticsTasks.duplicateOfTaskId,
  localVerification: analyticsTasks.localVerification,
  implementationFingerprint: analyticsTasks.implementationFingerprint,
  lastError: analyticsTasks.lastError,
  confirmedAt: analyticsTasks.confirmedAt,
  claimedAt: analyticsTasks.claimedAt,
  implementedAt: analyticsTasks.implementedAt,
  verifiedAt: analyticsTasks.verifiedAt,
  cancelledAt: analyticsTasks.cancelledAt,
  archivedAt: analyticsTasks.archivedAt,
  createdAt: analyticsTasks.createdAt,
  updatedAt: analyticsTasks.updatedAt,
};

const analyticsTaskStatusEventSelect = {
  id: analyticsTaskStatusEvents.id,
  taskId: analyticsTaskStatusEvents.taskId,
  projectId: analyticsTaskStatusEvents.projectId,
  userId: analyticsTaskStatusEvents.userId,
  fromStatus: analyticsTaskStatusEvents.fromStatus,
  toStatus: analyticsTaskStatusEvents.toStatus,
  actorType: analyticsTaskStatusEvents.actorType,
  actorId: analyticsTaskStatusEvents.actorId,
  reason: analyticsTaskStatusEvents.reason,
  details: analyticsTaskStatusEvents.details,
  createdAt: analyticsTaskStatusEvents.createdAt,
};

export async function listOwnedAnalyticsTasksForProject(params: {
  userId: string;
  projectId: string;
}): Promise<AnalyticsTaskRecord[]> {
  const rows = await db
    .select(analyticsTaskSelect)
    .from(analyticsTasks)
    .where(and(eq(analyticsTasks.userId, params.userId), eq(analyticsTasks.projectId, params.projectId)));

  return (rows as AnalyticsTaskRecord[]).filter(
    (row) => row.userId === params.userId && row.projectId === params.projectId,
  );
}

export async function findActiveTaskByDuplicateFingerprint(params: {
  userId: string;
  projectId: string;
  duplicateFingerprint: string;
}): Promise<AnalyticsTaskRecord | null> {
  const rows = await db
    .select(analyticsTaskSelect)
    .from(analyticsTasks)
    .where(
      and(
        eq(analyticsTasks.userId, params.userId),
        eq(analyticsTasks.projectId, params.projectId),
        eq(analyticsTasks.duplicateFingerprint, params.duplicateFingerprint),
        inArray(analyticsTasks.status, activeDuplicateStatuses),
      ),
    )
    .limit(1);

  const match = (rows as AnalyticsTaskRecord[])[0];
  return match ?? null;
}

export async function createAnalyticsTaskStatusEvent(
  input: CreateAnalyticsTaskStatusEventInput,
): Promise<AnalyticsTaskStatusEventRecord> {
  const id = createAnalyticsTaskStatusEventId();
  const inserted = await db
    .insert(analyticsTaskStatusEvents)
    .values({
      id,
      taskId: input.taskId,
      projectId: input.projectId,
      userId: input.userId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      reason: input.reason ?? null,
      details: input.details ?? {},
    })
    .returning(analyticsTaskStatusEventSelect);

  const row = (inserted as AnalyticsTaskStatusEventRecord[])[0];
  if (!row) throw new Error("Failed to create analytics task status event");
  return row;
}

export async function createPendingAnalyticsTask(
  input: CreatePendingAnalyticsTaskInput,
): Promise<{ status: "created" | "duplicate"; task: AnalyticsTaskRecord }> {
  const duplicateFingerprint = buildAnalyticsTaskDuplicateFingerprint({
    originalQuestion: input.originalQuestion,
    taskType: input.taskType,
    eventName: input.eventName,
    triggerDescription: input.triggerDescription,
    targetSurface: input.targetSurface ?? null,
    propertiesSchema: input.propertiesSchema ?? {},
  });

  const existing = await findActiveTaskByDuplicateFingerprint({
    userId: input.userId,
    projectId: input.projectId,
    duplicateFingerprint,
  });
  if (existing) return { status: "duplicate", task: existing };

  const taskId = createAnalyticsTaskId();
  const inserted = await db
    .insert(analyticsTasks)
    .values({
      id: taskId,
      projectId: input.projectId,
      userId: input.userId,
      status: "pending",
      taskType: input.taskType,
      title: input.title,
      originalQuestion: input.originalQuestion,
      answerKind: input.answerKind,
      answerSummary: input.answerSummary ?? null,
      analyticsGap: input.analyticsGap ?? null,
      eventName: input.eventName,
      triggerDescription: input.triggerDescription,
      propertiesSchema: input.propertiesSchema ?? {},
      targetSurface: input.targetSurface ?? null,
      implementationGuidance: input.implementationGuidance ?? null,
      verificationCriteria: input.verificationCriteria ?? {},
      verificationSource: input.verificationSource ?? "production_event",
      duplicateFingerprint,
      confirmedAt: new Date(),
    })
    .returning(analyticsTaskSelect);

  const created = (inserted as AnalyticsTaskRecord[])[0];
  if (!created) throw new Error("Failed to create analytics task");

  await createAnalyticsTaskStatusEvent({
    taskId: created.id,
    projectId: created.projectId,
    userId: created.userId,
    fromStatus: null,
    toStatus: "pending",
    actorType: "user",
    details: { source: "dashboard_confirm" },
  });

  return { status: "created", task: created };
}
