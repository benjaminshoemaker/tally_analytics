import { isE2EAnalyticsFixtureMode, loadE2EAnalyticsEvents } from "../e2e-fixtures";
import {
  createAnalyticsTinybirdClient,
  escapeAnalyticsSqlString,
  runAnalyticsTinybirdQuery,
} from "../tinybird";
import { transitionAnalyticsTask } from "./transitions";
import { updateOwnedAnalyticsTask } from "./queries";
import type { AnalyticsTaskRecord, AnalyticsTaskType } from "./types";

export type AnalyticsVerificationEvent = {
  eventType: string;
  timestamp: string;
  environment?: string | null;
  eventProperties?: string | null;
};

export type AnalyticsTaskVerificationResult = {
  status: "verified" | "awaiting_deploy" | "unchanged";
  task: AnalyticsTaskRecord;
  missingProperties?: string[];
};

type ProductionEventsFetcher = (params: { task: AnalyticsTaskRecord }) => Promise<AnalyticsVerificationEvent[]>;
const MAX_MISSING_PROPERTY_KEYS = 20;
const MAX_MISSING_PROPERTY_KEY_LENGTH = 80;

function normalizeEnvironment(environment: string | null | undefined): string {
  const value = (environment ?? "").trim().toLowerCase();
  return value || "production";
}

export function isProductionVerificationEvent(event: AnalyticsVerificationEvent): boolean {
  return normalizeEnvironment(event.environment) === "production";
}

export function matchesPostImplementationEvent(task: AnalyticsTaskRecord, event: AnalyticsVerificationEvent): boolean {
  if (!task.implementedAt) return false;
  if (event.eventType !== task.eventName) return false;

  const eventTimestamp = Date.parse(event.timestamp);
  if (!Number.isFinite(eventTimestamp)) return false;
  return eventTimestamp > task.implementedAt.getTime();
}

export function requiredPropertyKeysForTask(task: AnalyticsTaskRecord): string[] {
  const schema = task.propertiesSchema;
  if (!schema || typeof schema !== "object") return [];

  const record = schema as Record<string, unknown>;
  if (Array.isArray(record.required)) {
    const required = record.required
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
    if (required.length) return Array.from(new Set(required));
  }

  return Object.keys(record).filter(Boolean);
}

function parseEventProperties(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function missingRequiredEventProperties(
  requiredProperties: string[],
  eventProperties: string | null | undefined,
): string[] {
  const parsed = parseEventProperties(eventProperties);
  return requiredProperties.filter((propertyName) => !(propertyName in parsed));
}

function sanitizeMissingPropertyName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MISSING_PROPERTY_KEY_LENGTH);
}

function missingPropertiesSummary(missing: string[]): string {
  const compact = missing
    .map((value) => sanitizeMissingPropertyName(value))
    .filter(Boolean)
    .slice(0, MAX_MISSING_PROPERTY_KEYS);
  if (!compact.length) return "";
  return `Missing required production event properties: ${Array.from(new Set(compact)).join(", ")}.`;
}

async function loadProductionVerificationEventsFromFixtures(
  task: AnalyticsTaskRecord,
): Promise<AnalyticsVerificationEvent[]> {
  return loadE2EAnalyticsEvents(task.projectId).map((event) => ({
    eventType: event.event_type,
    timestamp: event.timestamp,
    environment: event.environment,
    eventProperties: event.event_properties,
  }));
}

async function loadProductionVerificationEventsFromTinybird(
  task: AnalyticsTaskRecord,
): Promise<AnalyticsVerificationEvent[]> {
  if (!task.implementedAt) return [];

  const client = createAnalyticsTinybirdClient();
  const query = `
    SELECT
      event_type AS eventType,
      toString(timestamp) AS timestamp,
      coalesce(nullIf(environment, ''), 'production') AS environment,
      event_properties AS eventProperties
    FROM events
    WHERE project_id = '${escapeAnalyticsSqlString(task.projectId)}'
      AND event_type = '${escapeAnalyticsSqlString(task.eventName)}'
      AND timestamp > parseDateTimeBestEffort('${escapeAnalyticsSqlString(task.implementedAt.toISOString())}')
    ORDER BY timestamp DESC
    LIMIT 200
  `;

  const result = await runAnalyticsTinybirdQuery<AnalyticsVerificationEvent>(
    client,
    "refreshAnalyticsTaskVerification",
    query,
  );

  return result.data;
}

async function defaultProductionEventsFetcher(params: { task: AnalyticsTaskRecord }): Promise<AnalyticsVerificationEvent[]> {
  if (isE2EAnalyticsFixtureMode()) {
    return loadProductionVerificationEventsFromFixtures(params.task);
  }
  return loadProductionVerificationEventsFromTinybird(params.task);
}

function taskNeedsVerificationRefresh(task: AnalyticsTaskRecord): boolean {
  return task.status === "implemented_locally" || task.status === "awaiting_deploy";
}

function shouldUsePropertyVerification(taskType: AnalyticsTaskType): boolean {
  return taskType === "add_event_property";
}

export async function refreshAnalyticsTaskVerification(params: {
  task: AnalyticsTaskRecord;
  fetchProductionEvents?: ProductionEventsFetcher;
  now?: Date;
}): Promise<AnalyticsTaskVerificationResult> {
  const now = params.now ?? new Date();
  const task = params.task;

  if (!taskNeedsVerificationRefresh(task)) {
    return { status: "unchanged", task };
  }
  if (!task.implementedAt) {
    return { status: "unchanged", task };
  }

  const fetchEvents = params.fetchProductionEvents ?? defaultProductionEventsFetcher;
  const events = await fetchEvents({ task });
  const matchingProductionEvents = events.filter(
    (event) => isProductionVerificationEvent(event) && matchesPostImplementationEvent(task, event),
  );

  if (!matchingProductionEvents.length) {
    if (task.status === "implemented_locally") {
      const transitioned = await transitionAnalyticsTask({
        taskId: task.id,
        projectId: task.projectId,
        userId: task.userId,
        actorType: "system",
        toStatus: "awaiting_deploy",
        reason: "production_event_not_found",
        now,
      });
      return { status: "awaiting_deploy", task: transitioned.task };
    }
    return { status: "awaiting_deploy", task };
  }

  if (!shouldUsePropertyVerification(task.taskType)) {
    const transitioned = await transitionAnalyticsTask({
      taskId: task.id,
      projectId: task.projectId,
      userId: task.userId,
      actorType: "system",
      toStatus: "verified",
      reason: "production_event_verified",
      now,
    });
    return { status: "verified", task: transitioned.task };
  }

  const requiredProperties = requiredPropertyKeysForTask(task);
  if (!requiredProperties.length) {
    const transitioned = await transitionAnalyticsTask({
      taskId: task.id,
      projectId: task.projectId,
      userId: task.userId,
      actorType: "system",
      toStatus: "verified",
      reason: "production_event_verified",
      now,
    });
    return { status: "verified", task: transitioned.task };
  }

  let smallestMissing: string[] | null = null;
  for (const event of matchingProductionEvents) {
    const missing = missingRequiredEventProperties(requiredProperties, event.eventProperties);
    if (missing.length === 0) {
      const transitioned = await transitionAnalyticsTask({
        taskId: task.id,
        projectId: task.projectId,
        userId: task.userId,
        actorType: "system",
        toStatus: "verified",
        reason: "production_event_properties_verified",
        now,
      });
      return { status: "verified", task: transitioned.task };
    }
    if (!smallestMissing || missing.length < smallestMissing.length) {
      smallestMissing = missing;
    }
  }

  const missing = smallestMissing ?? requiredProperties;
  const errorSummary = missingPropertiesSummary(missing);

  let awaitingTask = task;
  if (task.status === "implemented_locally") {
    const transitioned = await transitionAnalyticsTask({
      taskId: task.id,
      projectId: task.projectId,
      userId: task.userId,
      actorType: "system",
      toStatus: "awaiting_deploy",
      reason: "production_event_properties_missing",
      now,
    });
    awaitingTask = transitioned.task;
  }

  const updated = await updateOwnedAnalyticsTask({
    taskId: awaitingTask.id,
    userId: awaitingTask.userId,
    projectId: awaitingTask.projectId,
    patch: {
      status: "awaiting_deploy",
      lastError: errorSummary,
      updatedAt: now,
    },
  });

  return {
    status: "awaiting_deploy",
    task: updated ?? { ...awaitingTask, status: "awaiting_deploy", lastError: errorSummary, updatedAt: now },
    missingProperties: missing,
  };
}

export async function refreshAnalyticsTaskListVerification(params: {
  tasks: AnalyticsTaskRecord[];
  fetchProductionEvents?: ProductionEventsFetcher;
  now?: Date;
}): Promise<AnalyticsTaskRecord[]> {
  const output: AnalyticsTaskRecord[] = [];
  for (const task of params.tasks) {
    if (!taskNeedsVerificationRefresh(task)) {
      output.push(task);
      continue;
    }

    const refreshed = await refreshAnalyticsTaskVerification({
      task,
      fetchProductionEvents: params.fetchProductionEvents,
      now: params.now,
    });
    output.push(refreshed.task);
  }
  return output;
}
