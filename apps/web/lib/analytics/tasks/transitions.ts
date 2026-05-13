import {
  createAnalyticsTaskStatusEvent,
  findOwnedAnalyticsTaskById,
  updateOwnedAnalyticsTask,
} from "./queries";
import {
  isActiveDuplicateTaskStatus,
  isUserCancellableTaskStatus,
} from "./status-rules";
import {
  ANALYTICS_TASK_EVENT_NAME_PATTERN,
  isRecord,
  normalizeTaskText,
} from "./route-validation";
import type {
  AnalyticsTaskLocalEventEvidence,
  AnalyticsTaskRecord,
  AnalyticsTaskStatus,
  AnalyticsTaskVerificationCommand,
  TransitionAnalyticsTaskInput,
  TransitionAnalyticsTaskResult,
} from "./types";

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

const allowedExactTransitions: Array<{
  from: AnalyticsTaskStatus;
  to: AnalyticsTaskStatus;
  actorType: TransitionAnalyticsTaskInput["actorType"];
}> = [
  { from: "pending", to: "in_progress", actorType: "agent" },
  { from: "pending", to: "cancelled", actorType: "user" },
  { from: "in_progress", to: "implemented_locally", actorType: "agent" },
  { from: "in_progress", to: "failed", actorType: "agent" },
  { from: "implemented_locally", to: "awaiting_deploy", actorType: "system" },
  { from: "implemented_locally", to: "verified", actorType: "system" },
  { from: "awaiting_deploy", to: "verified", actorType: "system" },
  { from: "failed", to: "pending", actorType: "user" },
];

function sanitizeCompactText(value: string, maxLength: number): string {
  return normalizeTaskText(value, maxLength) ?? "";
}

function normalizeRelativeEvidencePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!normalized || normalized.length > MAX_FILE_LENGTH) return null;
  if (normalized.startsWith("/") || normalized.startsWith("~")) return null;
  if (normalized.split("/").some((segment) => segment === "..")) return null;
  return /^[A-Za-z0-9._/-]+$/.test(normalized) ? normalized : null;
}

function sanitizeChangedFiles(changedFiles: string[] | undefined): string[] {
  if (!changedFiles?.length) return [];

  const output: string[] = [];
  for (const entry of changedFiles) {
    const normalized = normalizeRelativeEvidencePath(entry);
    if (!normalized) continue;

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

function sanitizeEventPropertyValue(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, MAX_PROPERTY_STRING_LENGTH);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean" || value === null) return value;
  return undefined;
}

function sanitizeEventProperties(properties: unknown): Record<string, unknown> | undefined {
  if (!isRecord(properties)) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (Object.keys(sanitized).length >= MAX_EVENT_PROPERTIES) break;

    const normalizedKey = sanitizeCompactText(key, MAX_PROPERTY_KEY_LENGTH);
    if (!normalizedKey || !/^[A-Za-z0-9_.-]+$/.test(normalizedKey)) continue;

    const sanitizedValue = sanitizeEventPropertyValue(value);
    if (sanitizedValue !== undefined) sanitized[normalizedKey] = sanitizedValue;
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
    if (!ANALYTICS_TASK_EVENT_NAME_PATTERN.test(eventName)) continue;

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

function isAllowedTransition(
  fromStatus: AnalyticsTaskStatus,
  toStatus: AnalyticsTaskStatus,
  actorType: TransitionAnalyticsTaskInput["actorType"],
): boolean {
  if (actorType === "user" && toStatus === "archived") {
    return isActiveDuplicateTaskStatus(fromStatus);
  }
  if (actorType === "user" && toStatus === "cancelled") {
    return isUserCancellableTaskStatus(fromStatus);
  }

  return allowedExactTransitions.some(
    (transition) =>
      transition.from === fromStatus &&
      transition.to === toStatus &&
      transition.actorType === actorType,
  );
}

function transitionError(message: string): never {
  throw new Error(message);
}

function isAgentReclaimingImplementedTask(
  task: AnalyticsTaskRecord,
  input: TransitionAnalyticsTaskInput,
): boolean {
  return (
    input.actorType === "agent" &&
    task.status === "implemented_locally" &&
    input.toStatus === "in_progress"
  );
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

type PatchBuilderParams = {
  task: AnalyticsTaskRecord;
  evidence: SanitizedEvidence;
  now: Date;
};

const transitionPatchBuilders: Partial<
  Record<AnalyticsTaskStatus, (params: PatchBuilderParams) => Partial<TaskPatch>>
> = {
  in_progress: ({ task, now }) => (task.claimedAt ? {} : { claimedAt: now }),
  implemented_locally: ({ task, evidence, now }) => ({
    ...(task.implementedAt ? {} : { implementedAt: now }),
    ...(evidence.implementationFingerprint
      ? { implementationFingerprint: evidence.implementationFingerprint }
      : {}),
    lastError: null,
  }),
  failed: ({ task, evidence }) => ({
    lastError: evidence.errorSummary ?? task.lastError,
  }),
  awaiting_deploy: () => ({ lastError: null }),
  verified: ({ task, now }) => ({
    ...(task.verifiedAt ? {} : { verifiedAt: now }),
    lastError: null,
  }),
  cancelled: ({ now }) => ({ cancelledAt: now }),
  archived: ({ now }) => ({ archivedAt: now }),
  pending: ({ task }) => (task.status === "failed" ? { lastError: null } : {}),
};

function buildTransitionPatch(params: {
  task: AnalyticsTaskRecord;
  input: TransitionAnalyticsTaskInput;
  evidence: SanitizedEvidence;
  localVerification: Record<string, unknown> | null;
  now: Date;
}): TaskPatch {
  const { task, input, evidence, localVerification, now } = params;
  const statusPatch = transitionPatchBuilders[input.toStatus]?.({ task, evidence, now }) ?? {};
  const patch: TaskPatch = { status: input.toStatus, updatedAt: now, ...statusPatch };

  if (localVerification && hasEvidenceChanged(task, localVerification)) {
    patch.localVerification = localVerification;
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

async function createTransitionStatusEvent(params: {
  task: AnalyticsTaskRecord;
  input: TransitionAnalyticsTaskInput;
  fromStatus: AnalyticsTaskStatus;
  evidence: SanitizedEvidence;
}) {
  return createAnalyticsTaskStatusEvent({
    taskId: params.task.id,
    projectId: params.task.projectId,
    userId: params.task.userId,
    fromStatus: params.fromStatus,
    toStatus: params.input.toStatus,
    actorType: params.input.actorType,
    actorId: params.input.actorId ?? null,
    reason: params.input.reason ?? null,
    details: statusEventDetails(params.evidence),
  });
}

async function transitionSameStatus(params: {
  task: AnalyticsTaskRecord;
  input: TransitionAnalyticsTaskInput;
  evidence: SanitizedEvidence;
  localVerification: Record<string, unknown> | null;
  sameStatus: SameStatusResult;
  now: Date;
}): Promise<TransitionAnalyticsTaskResult> {
  const updatedTask = await updateOwnedAnalyticsTask({
    userId: params.input.userId,
    taskId: params.input.taskId,
    projectId: params.input.projectId,
    patch: sameStatusPatch({
      task: params.task,
      input: params.input,
      evidence: params.evidence,
      localVerification: params.localVerification,
      now: params.now,
    }),
  });
  if (!updatedTask) transitionError("Task update failed.");

  if (!params.sameStatus.createEvent) {
    return {
      status: "idempotent",
      task: updatedTask,
      statusEvent: null,
    };
  }

  const statusEvent = await createTransitionStatusEvent({
    task: updatedTask,
    input: params.input,
    fromStatus: params.task.status,
    evidence: params.evidence,
  });

  return {
    status: "transitioned",
    task: updatedTask,
    statusEvent,
  };
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

  if (isAgentReclaimingImplementedTask(existingTask, input)) {
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
    return transitionSameStatus({
      task: existingTask,
      input,
      evidence,
      localVerification,
      sameStatus,
      now,
    });
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

  const statusEvent = await createTransitionStatusEvent({
    task: updatedTask,
    input,
    fromStatus: existingTask.status,
    evidence,
  });

  return {
    status: "transitioned",
    task: updatedTask,
    statusEvent,
  };
}
