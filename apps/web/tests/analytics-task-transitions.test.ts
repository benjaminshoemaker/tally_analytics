import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsTaskRecord, AnalyticsTaskStatus, AnalyticsTaskStatusEventRecord } from "../lib/analytics/tasks/types";

let findOwnedAnalyticsTaskByIdSpy: ReturnType<typeof vi.fn> | undefined;
let updateOwnedAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;
let createAnalyticsTaskStatusEventSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/analytics/tasks/queries", () => ({
  findOwnedAnalyticsTaskById: (...args: unknown[]) => {
    if (!findOwnedAnalyticsTaskByIdSpy) throw new Error("findOwnedAnalyticsTaskByIdSpy not initialized");
    return findOwnedAnalyticsTaskByIdSpy(...args);
  },
  updateOwnedAnalyticsTask: (...args: unknown[]) => {
    if (!updateOwnedAnalyticsTaskSpy) throw new Error("updateOwnedAnalyticsTaskSpy not initialized");
    return updateOwnedAnalyticsTaskSpy(...args);
  },
  createAnalyticsTaskStatusEvent: (...args: unknown[]) => {
    if (!createAnalyticsTaskStatusEventSpy) throw new Error("createAnalyticsTaskStatusEventSpy not initialized");
    return createAnalyticsTaskStatusEventSpy(...args);
  },
}));

function makeTask(overrides: Partial<AnalyticsTaskRecord> = {}): AnalyticsTaskRecord {
  return {
    id: "task_123",
    projectId: "proj_123",
    userId: "11111111-1111-1111-1111-111111111111",
    status: "pending",
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
    implementedAt: null,
    verifiedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeStatusEvent(params: {
  fromStatus: AnalyticsTaskStatus | null;
  toStatus: AnalyticsTaskStatus;
}): AnalyticsTaskStatusEventRecord {
  return {
    id: "evt_123",
    taskId: "task_123",
    projectId: "proj_123",
    userId: "11111111-1111-1111-1111-111111111111",
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    actorType: "agent",
    actorId: "agent_1",
    reason: null,
    details: {},
    createdAt: new Date("2026-05-12T00:00:00.000Z"),
  };
}

describe("analytics task transitions", () => {
  let storedTask: AnalyticsTaskRecord;

  beforeEach(() => {
    storedTask = makeTask();

    findOwnedAnalyticsTaskByIdSpy = vi.fn(async () => storedTask);
    updateOwnedAnalyticsTaskSpy = vi.fn(async (input: { patch: Partial<AnalyticsTaskRecord> }) => {
      storedTask = {
        ...storedTask,
        ...input.patch,
      };
      return storedTask;
    });
    createAnalyticsTaskStatusEventSpy = vi.fn(async (input: { fromStatus: AnalyticsTaskStatus | null; toStatus: AnalyticsTaskStatus }) =>
      makeStatusEvent({ fromStatus: input.fromStatus, toStatus: input.toStatus }),
    );
  });

  it.each([
    { from: "pending", to: "in_progress", actorType: "agent" },
    { from: "pending", to: "cancelled", actorType: "user" },
    { from: "in_progress", to: "implemented_locally", actorType: "agent" },
    { from: "in_progress", to: "failed", actorType: "agent" },
    { from: "implemented_locally", to: "awaiting_deploy", actorType: "system" },
    { from: "implemented_locally", to: "verified", actorType: "system" },
    { from: "awaiting_deploy", to: "verified", actorType: "system" },
    { from: "failed", to: "pending", actorType: "user" },
    { from: "pending", to: "archived", actorType: "user" },
    { from: "in_progress", to: "cancelled", actorType: "user" },
  ])("allows $from -> $to for $actorType", async ({ from, to, actorType }) => {
    vi.resetModules();
    storedTask = makeTask({ status: from as AnalyticsTaskStatus });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);

    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");
    const result = await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: to as AnalyticsTaskStatus,
      actorType: actorType as "user" | "agent" | "system",
      now: new Date("2026-05-12T00:00:00.000Z"),
    });

    expect(result.status).toBe("transitioned");
    expect(result.task.status).toBe(to);
    expect(createAnalyticsTaskStatusEventSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported backward transitions", async () => {
    vi.resetModules();
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    storedTask = makeTask({ status: "awaiting_deploy" });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    await expect(
      transitionAnalyticsTask({
        taskId: storedTask.id,
        userId: storedTask.userId,
        toStatus: "in_progress",
        actorType: "agent",
      }),
    ).rejects.toThrow(/Unsupported transition/);

    storedTask = makeTask({ status: "verified" });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    await expect(
      transitionAnalyticsTask({
        taskId: storedTask.id,
        userId: storedTask.userId,
        toStatus: "pending",
        actorType: "user",
      }),
    ).rejects.toThrow(/Unsupported transition/);
  });

  it("is idempotent for repeated in_progress without evidence changes", async () => {
    vi.resetModules();
    storedTask = makeTask({
      status: "in_progress",
      localVerification: { changedFiles: ["src/track.ts"] },
    });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    const result = await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: "in_progress",
      actorType: "agent",
      changedFiles: ["src/track.ts"],
    });

    expect(result.status).toBe("idempotent");
    expect(result.task.status).toBe("in_progress");
    expect(createAnalyticsTaskStatusEventSpy).not.toHaveBeenCalled();
  });

  it("records a status event for repeated in_progress when evidence changes", async () => {
    vi.resetModules();
    storedTask = makeTask({
      status: "in_progress",
      localVerification: { changedFiles: ["src/track.ts"] },
    });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    const result = await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: "in_progress",
      actorType: "agent",
      changedFiles: ["src/track.ts", "src/new-track.ts"],
    });

    expect(result.status).toBe("transitioned");
    expect(result.task.status).toBe("in_progress");
    expect(createAnalyticsTaskStatusEventSpy).toHaveBeenCalledTimes(1);
  });

  it("is idempotent for repeated implemented_locally with same fingerprint and preserves implementedAt", async () => {
    vi.resetModules();
    const implementedAt = new Date("2026-05-10T10:00:00.000Z");
    const fingerprint = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    storedTask = makeTask({
      status: "implemented_locally",
      implementedAt,
      implementationFingerprint: fingerprint,
    });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    const result = await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: "implemented_locally",
      actorType: "agent",
      implementationFingerprint: fingerprint,
      changedFiles: ["src/track.ts"],
    });

    expect(result.status).toBe("idempotent");
    expect(result.task.implementedAt?.toISOString()).toBe(implementedAt.toISOString());
    expect(createAnalyticsTaskStatusEventSpy).not.toHaveBeenCalled();
  });

  it("is idempotent for repeated failed with same error summary", async () => {
    vi.resetModules();
    storedTask = makeTask({
      status: "failed",
      lastError: "Build failed at src/track.ts",
    });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    const result = await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: "failed",
      actorType: "agent",
      errorSummary: "Build failed at src/track.ts",
    });

    expect(result.status).toBe("idempotent");
    expect(result.task.status).toBe("failed");
    expect(createAnalyticsTaskStatusEventSpy).not.toHaveBeenCalled();
  });

  it("stores local verification evidence and never marks verified from local evidence", async () => {
    vi.resetModules();
    storedTask = makeTask({ status: "in_progress", verifiedAt: null });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    const result = await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: "implemented_locally",
      actorType: "agent",
      changedFiles: ["src/events.ts"],
      localEventEvidence: [{ eventName: "pricing_cta_clicked", properties: { placement: "hero" } }],
      implementationFingerprint: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(result.task.status).toBe("implemented_locally");
    expect(result.task.verifiedAt).toBeNull();
    expect(result.task.localVerification).toMatchObject({
      changedFiles: ["src/events.ts"],
      localEventEvidence: [{ eventName: "pricing_cta_clicked", properties: { placement: "hero" } }],
    });
  });

  it("sanitizes and bounds changed files, command summaries, local event evidence, and error summaries", async () => {
    vi.resetModules();
    storedTask = makeTask({ status: "in_progress" });
    findOwnedAnalyticsTaskByIdSpy?.mockResolvedValue(storedTask);
    const { transitionAnalyticsTask } = await import("../lib/analytics/tasks/transitions");

    await transitionAnalyticsTask({
      taskId: storedTask.id,
      userId: storedTask.userId,
      toStatus: "failed",
      actorType: "agent",
      changedFiles: ["/abs/path.ts", "../outside.ts", "src\\valid.ts", "src/also-valid.ts"],
      verificationCommands: [
        { command: "pnpm test", exitCode: 1, summary: "failed\u0000 with noisy output\nline2" },
        { command: "", exitCode: 0 },
      ],
      localEventEvidence: [
        { eventName: "Invalid Event Name", properties: { foo: "bar" } },
        { eventName: "signup_completed", properties: { plan: "pro", nested: { value: true }, ok: true } },
      ],
      errorSummary: `  Build failed in pipeline\n${"x".repeat(500)}  `,
    });

    const updateInput = updateOwnedAnalyticsTaskSpy?.mock.calls[0]?.[0] as { patch: Record<string, unknown> };
    expect(updateInput.patch.localVerification).toMatchObject({
      changedFiles: ["src/valid.ts", "src/also-valid.ts"],
      verificationCommands: [{ command: "pnpm test", exitCode: 1, summary: "failed with noisy output line2" }],
      localEventEvidence: [{ eventName: "signup_completed", properties: { plan: "pro", ok: true } }],
    });

    expect(updateInput.patch.lastError).toContain("Build failed in pipeline");
    expect(String(updateInput.patch.lastError).length).toBeLessThanOrEqual(320);
  });
});
