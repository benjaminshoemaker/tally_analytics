import {
  createAnalyticsTaskStatusEvent,
  findOwnedAnalyticsTaskById,
  updateOwnedAnalyticsTask,
} from "./queries";
import type {
  AnalyticsTaskLocalEventEvidence,
  AnalyticsTaskRecord,
  AnalyticsTaskStatus,
  AnalyticsTaskStatusEventRecord,
  AnalyticsTaskVerificationCommand,
  TransitionAnalyticsTaskInput,
  TransitionAnalyticsTaskResult,
} from "./types";

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

const MAX_CHANGED_FILES = 50;
const MAX_FILE_LENGTH = 260;
const MAX_COMMANDS = 20;
const MAX_COMMAND_LENGTH = 240;
const MAX_COMMAND_SUMMARY_LENGTH = 280;
const MAX_LOCAL_EVENTS = 30;
const MAX_EVENT_PROPERTIES = 25;
const MAX_PROPERTY_KEY_LENGTH = 80;
const MAX_PROPERTY_STRING_LENGTH = 200;
const MAX_ERROR_LENGTH = 320;

const activeStatuses: AnalyticsTaskStatus[] = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "failed",
  "verified",
  "duplicate",
];

const activeNonVerifiedStatuses: AnalyticsTaskStatus[] = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "failed",
  "duplicate",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeCompactText(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeChangedFiles(changedFiles: string[] | undefined): string[] {
  if (!changedFiles?.length) return [];

  const output: string[] = [];
  for (const entry of changedFiles) {
    if (typeof entry !== "string") continue;
    const normalized = entry.replace(/\\/g, "/").replace(/^\.\/+/, "");
    if (!normalized || normalized.length > MAX_FILE_LENGTH) continue;
    if (normalized.startsWith("/") || normalized.startsWith("~")) continue;

    const segments = normalized.split("/");
    if (segments.some((segment) => segment === "..")) continue;
    if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) continue;

    if (!output.includes(normalized)) output.push(normalized);
    if (output.length >= MAX_CHANGED_FILES) break;
  }

  return output;
}

function sanitizeVerificationCommands(
  commands: AnalyticsTaskVerificationCommand[] | undefined,
): AnalyticsTaskVerificationCommand[] {
  if (!commands?.length) return [];

  const output: AnalyticsTaskVerificationCommand[] = [];
  for (const command of commands) {
    if (!command || typeof command.command !== "string") continue;
    const sanitizedCommand = sanitizeCompactText(command.command, MAX_COMMAND_LENGTH);
    if (!sanitizedCommand) continue;

    const exitCode = Number.isInteger(command.exitCode) ? command.exitCode : 0;
    const sanitizedSummary =
      typeof command.summary === "string"
        ? sanitizeCompactText(command.summary, MAX_COMMAND_SUMMARY_LENGTH)
        : "";

    output.push({
      command: sanitizedCommand,
      exitCode,
      ...(sanitizedSummary ? { summary: sanitizedSummary } : {}),
    });
    if (output.length >= MAX_COMMANDS) break;
  }

  return output;
}

function sanitizeEventProperties(properties: unknown): Record<string, unknown> | undefined {
  if (!isRecord(properties)) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (Object.keys(sanitized).length >= MAX_EVENT_PROPERTIES) break;

    const normalizedKey = sanitizeCompactText(key, MAX_PROPERTY_KEY_LENGTH);
    if (!normalizedKey || !/^[A-Za-z0-9_.-]+$/.test(normalizedKey)) continue;

    if (typeof value === "string") {
      sanitized[normalizedKey] = value.slice(0, MAX_PROPERTY_STRING_LENGTH);
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[normalizedKey] = value;
      continue;
    }
    if (typeof value === "boolean" || value === null) {
      sanitized[normalizedKey] = value;
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}

function sanitizeLocalEventEvidence(
  evidence: AnalyticsTaskLocalEventEvidence[] | undefined,
): AnalyticsTaskLocalEventEvidence[] {
  if (!evidence?.length) return [];

  const output: AnalyticsTaskLocalEventEvidence[] = [];
  for (const row of evidence) {
    if (!row || typeof row.eventName !== "string") continue;
    const eventName = sanitizeCompactText(row.eventName.toLowerCase(), 100);
    if (!EVENT_NAME_PATTERN.test(eventName)) continue;

    const sanitizedProperties = sanitizeEventProperties(row.properties);
    output.push({
      eventName,
      ...(sanitizedProperties ? { properties: sanitizedProperties } : {}),
    });

    if (output.length >= MAX_LOCAL_EVENTS) break;
  }

  return output;
}

function sanitizeImplementationFingerprint(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return FINGERPRINT_PATTERN.test(normalized) ? normalized : null;
}

function sanitizeErrorSummary(value: string | null | undefined): string | null {
  if (!value) return null;
  const sanitized = sanitizeCompactText(value, MAX_ERROR_LENGTH);
  return sanitized || null;
}

type SanitizedEvidence = {
  changedFiles: string[];
  verificationCommands: AnalyticsTaskVerificationCommand[];
  localEventEvidence: AnalyticsTaskLocalEventEvidence[];
  implementationFingerprint: string | null;
  errorSummary: string | null;
};

function sanitizeEvidence(input: TransitionAnalyticsTaskInput): SanitizedEvidence {
  return {
    changedFiles: sanitizeChangedFiles(input.changedFiles),
    verificationCommands: sanitizeVerificationCommands(input.verificationCommands),
    localEventEvidence: sanitizeLocalEventEvidence(input.localEventEvidence),
    implementationFingerprint: sanitizeImplementationFingerprint(input.implementationFingerprint),
    errorSummary: sanitizeErrorSummary(input.errorSummary),
  };
}

function localVerificationFromEvidence(
  task: AnalyticsTaskRecord,
  evidence: SanitizedEvidence,
): Record<string, unknown> | null {
  const current = isRecord(task.localVerification) ? task.localVerification : {};
  const next: Record<string, unknown> = { ...current };

  if (evidence.changedFiles.length) next.changedFiles = evidence.changedFiles;
  if (evidence.verificationCommands.length) next.verificationCommands = evidence.verificationCommands;
  if (evidence.localEventEvidence.length) next.localEventEvidence = evidence.localEventEvidence;

  return Object.keys(next).length ? next : null;
}

function shallowStableJson(value: unknown): string {
  if (!isRecord(value)) return JSON.stringify(value);
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) ordered[key] = value[key];
  return JSON.stringify(ordered);
}

function hasEvidenceChanged(task: AnalyticsTaskRecord, nextLocalVerification: Record<string, unknown> | null): boolean {
  return shallowStableJson(task.localVerification ?? null) !== shallowStableJson(nextLocalVerification ?? null);
}

function isAllowedTransition(fromStatus: AnalyticsTaskStatus, toStatus: AnalyticsTaskStatus, actorType: TransitionAnalyticsTaskInput["actorType"]): boolean {
  if (fromStatus === "pending" && toStatus === "in_progress" && actorType === "agent") return true;
  if (fromStatus === "pending" && toStatus === "cancelled" && actorType === "user") return true;
  if (fromStatus === "in_progress" && toStatus === "implemented_locally" && actorType === "agent") return true;
  if (fromStatus === "in_progress" && toStatus === "failed" && actorType === "agent") return true;
  if (fromStatus === "implemented_locally" && toStatus === "awaiting_deploy" && actorType === "system") return true;
  if (fromStatus === "implemented_locally" && toStatus === "verified" && actorType === "system") return true;
  if (fromStatus === "awaiting_deploy" && toStatus === "verified" && actorType === "system") return true;
  if (fromStatus === "failed" && toStatus === "pending" && actorType === "user") return true;
  if (toStatus === "archived" && actorType === "user" && activeStatuses.includes(fromStatus)) return true;
  if (toStatus === "cancelled" && actorType === "user" && activeNonVerifiedStatuses.includes(fromStatus)) return true;

  return false;
}

function transitionError(message: string): never {
  throw new Error(message);
}

function statusEventDetails(evidence: SanitizedEvidence): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  if (evidence.changedFiles.length) details.changedFiles = evidence.changedFiles;
  if (evidence.verificationCommands.length) details.verificationCommands = evidence.verificationCommands;
  if (evidence.localEventEvidence.length) details.localEventEvidence = evidence.localEventEvidence;
  if (evidence.implementationFingerprint) details.implementationFingerprint = evidence.implementationFingerprint;
  if (evidence.errorSummary) details.errorSummary = evidence.errorSummary;
  return details;
}

type SameStatusResult = {
  idempotent: boolean;
  createEvent: boolean;
};

function evaluateSameStatusIdempotency(
  task: AnalyticsTaskRecord,
  input: TransitionAnalyticsTaskInput,
  evidence: SanitizedEvidence,
  evidenceChanged: boolean,
): SameStatusResult {
  if (task.status !== input.toStatus) return { idempotent: false, createEvent: true };

  if (input.toStatus === "in_progress") {
    return { idempotent: true, createEvent: evidenceChanged };
  }

  if (input.toStatus === "implemented_locally") {
    if (evidence.implementationFingerprint && evidence.implementationFingerprint === task.implementationFingerprint) {
      return { idempotent: true, createEvent: false };
    }
    return { idempotent: true, createEvent: evidenceChanged };
  }

  if (input.toStatus === "failed") {
    if (evidence.errorSummary && evidence.errorSummary === task.lastError) {
      return { idempotent: true, createEvent: false };
    }
    return { idempotent: true, createEvent: Boolean(evidence.errorSummary) && evidence.errorSummary !== task.lastError };
  }

  return { idempotent: false, createEvent: false };
}

type TaskPatch = Parameters<typeof updateOwnedAnalyticsTask>[0]["patch"];

function buildTransitionPatch(params: {
  task: AnalyticsTaskRecord;
  input: TransitionAnalyticsTaskInput;
  evidence: SanitizedEvidence;
  localVerification: Record<string, unknown> | null;
  now: Date;
}): TaskPatch {
  const { task, input, evidence, localVerification, now } = params;
  const patch: TaskPatch = { status: input.toStatus, updatedAt: now };

  if (localVerification && hasEvidenceChanged(task, localVerification)) {
    patch.localVerification = localVerification;
  }

  if (input.toStatus === "in_progress" && !task.claimedAt) patch.claimedAt = now;
  if (input.toStatus === "implemented_locally") {
    if (!task.implementedAt) patch.implementedAt = now;
    if (evidence.implementationFingerprint) patch.implementationFingerprint = evidence.implementationFingerprint;
    patch.lastError = null;
  }
  if (input.toStatus === "failed") {
    patch.lastError = evidence.errorSummary ?? task.lastError;
  }
  if (input.toStatus === "awaiting_deploy") patch.lastError = null;
  if (input.toStatus === "verified") {
    if (!task.verifiedAt) patch.verifiedAt = now;
    patch.lastError = null;
  }
  if (input.toStatus === "cancelled") {
    patch.cancelledAt = now;
  }
  if (input.toStatus === "archived") {
    patch.archivedAt = now;
  }
  if (task.status === "failed" && input.toStatus === "pending") {
    patch.lastError = null;
  }

  return patch;
}

function sameStatusPatch(params: {
  task: AnalyticsTaskRecord;
  input: TransitionAnalyticsTaskInput;
  evidence: SanitizedEvidence;
  localVerification: Record<string, unknown> | null;
  now: Date;
}): TaskPatch {
  const { task, input, evidence, localVerification, now } = params;
  const patch: TaskPatch = { updatedAt: now };

  if (localVerification && hasEvidenceChanged(task, localVerification)) {
    patch.localVerification = localVerification;
  }
  if (input.toStatus === "implemented_locally" && evidence.implementationFingerprint) {
    patch.implementationFingerprint = evidence.implementationFingerprint;
  }
  if (input.toStatus === "failed" && evidence.errorSummary) {
    patch.lastError = evidence.errorSummary;
  }

  return patch;
}

export async function transitionAnalyticsTask(
  input: TransitionAnalyticsTaskInput,
): Promise<TransitionAnalyticsTaskResult> {
  const now = input.now ?? new Date();
  const existingTask = await findOwnedAnalyticsTaskById({
    userId: input.userId,
    taskId: input.taskId,
    projectId: input.projectId,
  });
  if (!existingTask) transitionError("Task not found or not owned by user.");

  if (
    input.actorType === "agent" &&
    existingTask.status === "implemented_locally" &&
    input.toStatus === "in_progress"
  ) {
    return {
      status: "idempotent",
      task: existingTask,
      statusEvent: null,
    };
  }

  const evidence = sanitizeEvidence(input);
  const localVerification = localVerificationFromEvidence(existingTask, evidence);
  const evidenceChanged = hasEvidenceChanged(existingTask, localVerification);
  const sameStatus = evaluateSameStatusIdempotency(existingTask, input, evidence, evidenceChanged);

  if (sameStatus.idempotent) {
    const updatedTask = await updateOwnedAnalyticsTask({
      userId: input.userId,
      taskId: input.taskId,
      projectId: input.projectId,
      patch: sameStatusPatch({
        task: existingTask,
        input,
        evidence,
        localVerification,
        now,
      }),
    });
    if (!updatedTask) transitionError("Task update failed.");

    if (!sameStatus.createEvent) {
      return {
        status: "idempotent",
        task: updatedTask,
        statusEvent: null,
      };
    }

    const statusEvent = await createAnalyticsTaskStatusEvent({
      taskId: updatedTask.id,
      projectId: updatedTask.projectId,
      userId: updatedTask.userId,
      fromStatus: existingTask.status,
      toStatus: input.toStatus,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      reason: input.reason ?? null,
      details: statusEventDetails(evidence),
    });

    return {
      status: "transitioned",
      task: updatedTask,
      statusEvent,
    };
  }

  if (!isAllowedTransition(existingTask.status, input.toStatus, input.actorType)) {
    transitionError(
      `Unsupported transition from ${existingTask.status} to ${input.toStatus} for ${input.actorType}.`,
    );
  }

  const updatedTask = await updateOwnedAnalyticsTask({
    userId: input.userId,
    taskId: input.taskId,
    projectId: input.projectId,
    patch: buildTransitionPatch({
      task: existingTask,
      input,
      evidence,
      localVerification,
      now,
    }),
  });
  if (!updatedTask) transitionError("Task update failed.");

  const statusEvent = await createAnalyticsTaskStatusEvent({
    taskId: updatedTask.id,
    projectId: updatedTask.projectId,
    userId: updatedTask.userId,
    fromStatus: existingTask.status,
    toStatus: input.toStatus,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    reason: input.reason ?? null,
    details: statusEventDetails(evidence),
  });

  return {
    status: "transitioned",
    task: updatedTask,
    statusEvent,
  };
}
