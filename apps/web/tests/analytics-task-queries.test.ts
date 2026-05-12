import { describe, expect, it, vi } from "vitest";

import { buildAnalyticsTaskDuplicateFingerprint } from "../lib/analytics/tasks/fingerprint";

let selectSpy: ReturnType<typeof vi.fn> | undefined;
let insertSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
  },
}));

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task_123",
    projectId: "proj_123",
    userId: "user_123",
    status: "pending",
    taskType: "track_click",
    title: "Track pricing CTA click",
    originalQuestion: "How many users clicked pricing CTA?",
    answerKind: "cannot_answer_yet",
    answerSummary: "Missing click event.",
    analyticsGap: "No click event for pricing CTA.",
    eventName: "pricing_cta_clicked",
    triggerDescription: "When user clicks pricing CTA.",
    propertiesSchema: { placement: "header" },
    targetSurface: "/pricing",
    implementationGuidance: "Track click in CTA handler.",
    verificationCriteria: { production: "event appears in Tinybird" },
    verificationSource: "production_event",
    duplicateFingerprint: "abc",
    duplicateOfTaskId: null,
    localVerification: null,
    implementationFingerprint: null,
    lastError: null,
    confirmedAt: new Date("2026-01-01T00:00:00.000Z"),
    claimedAt: null,
    implementedAt: null,
    verifiedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("analytics task fingerprint", () => {
  it("normalizes question intent, event text, and properties ordering", () => {
    const a = buildAnalyticsTaskDuplicateFingerprint({
      originalQuestion: "  How MANY users clicked pricing CTA? ",
      taskType: "track_click",
      eventName: "Pricing_CTA_Clicked",
      triggerDescription: "When user CLICKS pricing CTA",
      targetSurface: " /pricing ",
      propertiesSchema: {
        placement: "Header",
        nested: { b: "B", a: "A" },
      },
    });

    const b = buildAnalyticsTaskDuplicateFingerprint({
      originalQuestion: "how many users   clicked pricing cta?",
      taskType: "track_click",
      eventName: "pricing_cta_clicked",
      triggerDescription: "when user clicks pricing cta",
      targetSurface: "/pricing",
      propertiesSchema: {
        nested: { a: "a", b: "b" },
        placement: "header",
      },
    });

    expect(a).toBe(b);
  });
});

describe("analytics task queries", () => {
  it("creates a pending task and writes a status event", async () => {
    vi.resetModules();

    const limitSpy = vi.fn().mockResolvedValue([]);
    const whereSpy = vi.fn(() => ({ limit: limitSpy }));
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const created = makeTask();
    const taskReturningSpy = vi.fn().mockResolvedValue([created]);
    const taskValuesSpy = vi.fn(() => ({ returning: taskReturningSpy }));
    const eventReturningSpy = vi.fn().mockResolvedValue([
      {
        id: "tse_123",
        taskId: created.id,
        projectId: created.projectId,
        userId: created.userId,
        fromStatus: null,
        toStatus: "pending",
        actorType: "user",
        actorId: null,
        reason: null,
        details: { source: "dashboard_confirm" },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const eventValuesSpy = vi.fn(() => ({ returning: eventReturningSpy }));
    insertSpy = vi.fn().mockReturnValueOnce({ values: taskValuesSpy }).mockReturnValueOnce({ values: eventValuesSpy });

    const { createPendingAnalyticsTask } = await import("../lib/analytics/tasks/queries");
    const result = await createPendingAnalyticsTask({
      projectId: "proj_123",
      userId: "user_123",
      taskType: "track_click",
      title: "Track pricing CTA click",
      originalQuestion: "How many users clicked pricing CTA?",
      answerKind: "cannot_answer_yet",
      answerSummary: "Missing click event.",
      analyticsGap: "No click event for pricing CTA.",
      eventName: "pricing_cta_clicked",
      triggerDescription: "When user clicks pricing CTA.",
      propertiesSchema: { placement: "header" },
      targetSurface: "/pricing",
      verificationCriteria: { production: "event appears in Tinybird" },
    });

    expect(result.status).toBe("created");
    expect(result.task.id).toBe("task_123");
    expect(insertSpy).toHaveBeenCalledTimes(2);
    expect(taskValuesSpy).toHaveBeenCalledTimes(1);
    expect(eventValuesSpy).toHaveBeenCalledTimes(1);
    const taskInsertPayload = taskValuesSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(taskInsertPayload.userId).toBe("user_123");
    expect(taskInsertPayload.projectId).toBe("proj_123");
    expect(taskInsertPayload.duplicateFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns duplicate when active duplicate fingerprint already exists", async () => {
    vi.resetModules();

    const existing = makeTask({ id: "task_existing" });
    const limitSpy = vi.fn().mockResolvedValue([existing]);
    const whereSpy = vi.fn(() => ({ limit: limitSpy }));
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    insertSpy = vi.fn();

    const { createPendingAnalyticsTask } = await import("../lib/analytics/tasks/queries");
    const result = await createPendingAnalyticsTask({
      projectId: "proj_123",
      userId: "user_123",
      taskType: "track_click",
      title: "Track pricing CTA click",
      originalQuestion: "How many users clicked pricing CTA?",
      answerKind: "cannot_answer_yet",
      eventName: "pricing_cta_clicked",
      triggerDescription: "When user clicks pricing CTA.",
    });

    expect(result.status).toBe("duplicate");
    expect(result.task.id).toBe("task_existing");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("creates status events through a single helper", async () => {
    vi.resetModules();

    selectSpy = vi.fn();
    const eventRow = {
      id: "tse_123",
      taskId: "task_123",
      projectId: "proj_123",
      userId: "user_123",
      fromStatus: "pending",
      toStatus: "in_progress",
      actorType: "agent",
      actorId: "codex",
      reason: null,
      details: { note: "started" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const returningSpy = vi.fn().mockResolvedValue([eventRow]);
    const valuesSpy = vi.fn(() => ({ returning: returningSpy }));
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { createAnalyticsTaskStatusEvent } = await import("../lib/analytics/tasks/queries");
    const created = await createAnalyticsTaskStatusEvent({
      taskId: "task_123",
      projectId: "proj_123",
      userId: "user_123",
      fromStatus: "pending",
      toStatus: "in_progress",
      actorType: "agent",
      actorId: "codex",
      details: { note: "started" },
    });

    expect(created.id).toBe("tse_123");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(valuesSpy).toHaveBeenCalledTimes(1);
  });

  it("lists only owned tasks for the requested project", async () => {
    vi.resetModules();

    const rows = [
      makeTask({ id: "task_1", projectId: "proj_123", userId: "user_123" }),
      makeTask({ id: "task_2", projectId: "proj_999", userId: "user_123" }),
      makeTask({ id: "task_3", projectId: "proj_123", userId: "user_other" }),
    ];
    const whereSpy = vi.fn().mockResolvedValue(rows);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    insertSpy = vi.fn();

    const { listOwnedAnalyticsTasksForProject } = await import("../lib/analytics/tasks/queries");
    const tasks = await listOwnedAnalyticsTasksForProject({
      userId: "user_123",
      projectId: "proj_123",
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe("task_1");
  });
});
