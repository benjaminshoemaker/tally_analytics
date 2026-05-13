import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsTaskRecord, AnalyticsTaskStatus } from "../lib/analytics/tasks/types";

let transitionAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;
let updateOwnedAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/analytics/tasks/transitions", () => ({
  transitionAnalyticsTask: (...args: unknown[]) => {
    if (!transitionAnalyticsTaskSpy) throw new Error("transitionAnalyticsTaskSpy not initialized");
    return transitionAnalyticsTaskSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/queries", () => ({
  updateOwnedAnalyticsTask: (...args: unknown[]) => {
    if (!updateOwnedAnalyticsTaskSpy) throw new Error("updateOwnedAnalyticsTaskSpy not initialized");
    return updateOwnedAnalyticsTaskSpy(...args);
  },
}));

vi.mock("../lib/analytics/e2e-fixtures", () => ({
  isE2EAnalyticsFixtureMode: () => false,
  loadE2EAnalyticsEvents: () => [],
}));

vi.mock("../lib/analytics/tinybird", () => ({
  createAnalyticsTinybirdClient: () => ({}),
  escapeAnalyticsSqlString: (value: string) => value.replaceAll("'", "''"),
  runAnalyticsTinybirdQuery: async () => ({ data: [] }),
}));

import {
  buildProductionVerificationEventsQuery,
  isProductionVerificationEvent,
  matchesPostImplementationEvent,
  missingRequiredEventProperties,
  refreshAnalyticsTaskListVerification,
  refreshAnalyticsTaskVerification,
} from "../lib/analytics/tasks/verification";

function makeTask(overrides: Partial<AnalyticsTaskRecord> = {}): AnalyticsTaskRecord {
  return {
    id: "task_123",
    projectId: "proj_123",
    userId: "11111111-1111-1111-1111-111111111111",
    status: "implemented_locally",
    taskType: "track_click",
    title: "Track pricing CTA click",
    originalQuestion: "How many users click pricing?",
    answerKind: "cannot_answer_yet",
    answerSummary: "Missing event.",
    analyticsGap: "No click event.",
    eventName: "pricing_cta_clicked",
    triggerDescription: "When pricing CTA is clicked.",
    propertiesSchema: {},
    targetSurface: "/pricing",
    implementationGuidance: null,
    verificationCriteria: {},
    verificationSource: "production_event",
    duplicateFingerprint: "abc123",
    duplicateOfTaskId: null,
    localVerification: null,
    implementationFingerprint: null,
    lastError: null,
    confirmedAt: new Date("2026-05-01T00:00:00.000Z"),
    claimedAt: null,
    implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    verifiedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-12T10:00:00.000Z"),
    ...overrides,
  };
}

function transitionedTask(
  task: AnalyticsTaskRecord,
  toStatus: AnalyticsTaskStatus,
  now: Date,
): AnalyticsTaskRecord {
  return {
    ...task,
    status: toStatus,
    updatedAt: now,
    verifiedAt: toStatus === "verified" ? now : task.verifiedAt,
  };
}

describe("analytics task verification", () => {
  beforeEach(() => {
    transitionAnalyticsTaskSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();
  });

  it("marks matching production events after implemented_at as verified", async () => {
    const task = makeTask({
      status: "implemented_locally",
      implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    });
    const now = new Date("2026-05-12T11:00:00.000Z");

    transitionAnalyticsTaskSpy?.mockImplementation(
      async (input: { toStatus: AnalyticsTaskStatus; now?: Date }) => ({
        status: "transitioned",
        task: transitionedTask(task, input.toStatus, input.now ?? now),
        statusEvent: null,
      }),
    );

    const result = await refreshAnalyticsTaskVerification({
      task,
      now,
      fetchProductionEvents: async () => [
        {
          eventType: "pricing_cta_clicked",
          timestamp: "2026-05-12T10:15:00.000Z",
          environment: "production",
          eventProperties: "{\"placement\":\"hero\"}",
        },
      ],
    });

    expect(result.status).toBe("verified");
    expect(result.task.status).toBe("verified");
    expect(transitionAnalyticsTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: task.id,
        toStatus: "verified",
        actorType: "system",
      }),
    );
    expect(updateOwnedAnalyticsTaskSpy).not.toHaveBeenCalled();
  });

  it("keeps tasks unverified for local/test or pre-implementation evidence", async () => {
    const task = makeTask({
      status: "implemented_locally",
      implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    });
    const now = new Date("2026-05-12T11:00:00.000Z");

    transitionAnalyticsTaskSpy?.mockImplementation(
      async (input: { toStatus: AnalyticsTaskStatus; now?: Date }) => ({
        status: "transitioned",
        task: transitionedTask(task, input.toStatus, input.now ?? now),
        statusEvent: null,
      }),
    );

    const result = await refreshAnalyticsTaskVerification({
      task,
      now,
      fetchProductionEvents: async () => [
        {
          eventType: "pricing_cta_clicked",
          timestamp: "2026-05-12T10:20:00.000Z",
          environment: "test",
        },
        {
          eventType: "pricing_cta_clicked",
          timestamp: "2026-05-12T09:50:00.000Z",
          environment: "production",
        },
      ],
    });

    expect(result.status).toBe("awaiting_deploy");
    expect(result.task.status).toBe("awaiting_deploy");
    expect(transitionAnalyticsTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: task.id,
        toStatus: "awaiting_deploy",
        actorType: "system",
        reason: "production_event_not_found",
      }),
    );
  });

  it("keeps add_event_property tasks awaiting deploy with sanitized missing-property reason", async () => {
    const task = makeTask({
      status: "implemented_locally",
      taskType: "add_event_property",
      propertiesSchema: { required: ["plan", "source\t\nline"] },
      implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    });
    const now = new Date("2026-05-12T11:00:00.000Z");

    transitionAnalyticsTaskSpy?.mockImplementation(
      async (input: { toStatus: AnalyticsTaskStatus; now?: Date }) => ({
        status: "transitioned",
        task: transitionedTask(task, input.toStatus, input.now ?? now),
        statusEvent: null,
      }),
    );

    updateOwnedAnalyticsTaskSpy?.mockImplementation(async (input: { patch: Partial<AnalyticsTaskRecord> }) => ({
      ...task,
      ...input.patch,
    }));

    const result = await refreshAnalyticsTaskVerification({
      task,
      now,
      fetchProductionEvents: async () => [
        {
          eventType: "pricing_cta_clicked",
          timestamp: "2026-05-12T10:10:00.000Z",
          environment: "production",
          eventProperties: "{\"plan\":\"pro\"}",
        },
      ],
    });

    expect(result.status).toBe("awaiting_deploy");
    expect(result.task.status).toBe("awaiting_deploy");
    expect(result.task.lastError).toContain("Missing required production event properties:");
    expect(result.task.lastError).toContain("source line");
    expect(result.task.lastError).not.toContain("\n");
    expect(result.task.lastError).not.toContain("\t");
    expect(updateOwnedAnalyticsTaskSpy).toHaveBeenCalledTimes(1);
  });

  it("verifies add_event_property tasks when required properties exist in production events", async () => {
    const task = makeTask({
      status: "implemented_locally",
      taskType: "add_event_property",
      propertiesSchema: { required: ["plan"] },
    });
    const now = new Date("2026-05-12T11:00:00.000Z");

    transitionAnalyticsTaskSpy?.mockImplementation(
      async (input: { toStatus: AnalyticsTaskStatus; now?: Date }) => ({
        status: "transitioned",
        task: transitionedTask(task, input.toStatus, input.now ?? now),
        statusEvent: null,
      }),
    );

    const result = await refreshAnalyticsTaskVerification({
      task,
      now,
      fetchProductionEvents: async () => [
        {
          eventType: "pricing_cta_clicked",
          timestamp: "2026-05-12T10:10:00.000Z",
          environment: "production",
          eventProperties: "{\"plan\":\"pro\"}",
        },
      ],
    });

    expect(result.status).toBe("verified");
    expect(result.task.status).toBe("verified");
    expect(transitionAnalyticsTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: "verified",
        reason: "production_event_properties_verified",
      }),
    );
    expect(updateOwnedAnalyticsTaskSpy).not.toHaveBeenCalled();
  });

  it("refreshes task lists and moves implemented_locally to awaiting_deploy without production evidence", async () => {
    const implemented = makeTask({
      id: "task_implemented",
      status: "implemented_locally",
    });
    const pending = makeTask({
      id: "task_pending",
      status: "pending",
      implementedAt: null,
    });
    const now = new Date("2026-05-12T11:00:00.000Z");

    transitionAnalyticsTaskSpy?.mockImplementation(
      async (input: { taskId: string; toStatus: AnalyticsTaskStatus; now?: Date }) => ({
        status: "transitioned",
        task: transitionedTask(
          input.taskId === implemented.id ? implemented : pending,
          input.toStatus,
          input.now ?? now,
        ),
        statusEvent: null,
      }),
    );

    const tasks = await refreshAnalyticsTaskListVerification({
      tasks: [implemented, pending],
      now,
      fetchProductionEvents: async () => [],
    });

    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.status).toBe("awaiting_deploy");
    expect(tasks[1]?.status).toBe("pending");
    expect(transitionAnalyticsTaskSpy).toHaveBeenCalledTimes(1);
  });

  it("exports production/event matching helpers", () => {
    const task = makeTask({
      implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    });

    expect(isProductionVerificationEvent({ eventType: "x", timestamp: "2026-05-12T10:00:00.000Z" })).toBe(true);
    expect(
      isProductionVerificationEvent({
        eventType: "x",
        timestamp: "2026-05-12T10:00:00.000Z",
        environment: "test",
      }),
    ).toBe(false);

    expect(
      matchesPostImplementationEvent(task, {
        eventType: task.eventName,
        timestamp: "2026-05-12T10:00:01.000Z",
        environment: "production",
      }),
    ).toBe(true);
    expect(
      matchesPostImplementationEvent(task, {
        eventType: task.eventName,
        timestamp: "2026-05-12T09:59:59.000Z",
        environment: "production",
      }),
    ).toBe(false);

    expect(missingRequiredEventProperties(["plan", "source"], "{\"plan\":\"pro\"}")).toEqual(["source"]);
  });

  it("builds Tinybird verification queries with DateTime64 timestamp literals", () => {
    const query = buildProductionVerificationEventsQuery(
      makeTask({
        projectId: "proj_123",
        eventName: "upgrade_cta_clicked",
        implementedAt: new Date("2026-05-13T07:22:14.882Z"),
      }),
    );

    expect(query).toContain(
      "parseDateTimeBestEffort(timestamp) > toDateTime64('2026-05-13 07:22:14.882', 3)",
    );
    expect(query).not.toContain("event_properties");
    expect(query).not.toContain("environment");
  });

  it("selects event properties only for property-verification tasks", () => {
    const query = buildProductionVerificationEventsQuery(
      makeTask({
        taskType: "add_event_property",
        implementedAt: new Date("2026-05-13T07:22:14.882Z"),
      }),
    );

    expect(query).toContain("event_properties AS eventProperties");
  });
});
