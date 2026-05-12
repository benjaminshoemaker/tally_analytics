import { describe, expect, it, vi } from "vitest";

import type { AnalyticsTaskRecord, TransitionAnalyticsTaskResult } from "../lib/analytics/tasks/types";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;
let listOwnedAnalyticsTasksForProjectSpy: ReturnType<typeof vi.fn> | undefined;
let createPendingAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;
let findOwnedAnalyticsTaskByIdSpy: ReturnType<typeof vi.fn> | undefined;
let updateOwnedAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;
let refreshAnalyticsTaskListVerificationSpy: ReturnType<typeof vi.fn> | undefined;
let transitionAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/get-user", () => ({
  getUserFromRequest: (...args: unknown[]) => {
    if (!getUserFromRequestSpy) throw new Error("getUserFromRequestSpy not initialized");
    return getUserFromRequestSpy(...args);
  },
}));

vi.mock("../lib/db/queries/projects", () => ({
  getOwnedAnalyticsProject: (...args: unknown[]) => {
    if (!getOwnedAnalyticsProjectSpy) throw new Error("getOwnedAnalyticsProjectSpy not initialized");
    return getOwnedAnalyticsProjectSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/queries", () => ({
  listOwnedAnalyticsTasksForProject: (...args: unknown[]) => {
    if (!listOwnedAnalyticsTasksForProjectSpy) throw new Error("listOwnedAnalyticsTasksForProjectSpy not initialized");
    return listOwnedAnalyticsTasksForProjectSpy(...args);
  },
  createPendingAnalyticsTask: (...args: unknown[]) => {
    if (!createPendingAnalyticsTaskSpy) throw new Error("createPendingAnalyticsTaskSpy not initialized");
    return createPendingAnalyticsTaskSpy(...args);
  },
  findOwnedAnalyticsTaskById: (...args: unknown[]) => {
    if (!findOwnedAnalyticsTaskByIdSpy) throw new Error("findOwnedAnalyticsTaskByIdSpy not initialized");
    return findOwnedAnalyticsTaskByIdSpy(...args);
  },
  updateOwnedAnalyticsTask: (...args: unknown[]) => {
    if (!updateOwnedAnalyticsTaskSpy) throw new Error("updateOwnedAnalyticsTaskSpy not initialized");
    return updateOwnedAnalyticsTaskSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/verification", () => ({
  refreshAnalyticsTaskListVerification: (...args: unknown[]) => {
    if (!refreshAnalyticsTaskListVerificationSpy) {
      throw new Error("refreshAnalyticsTaskListVerificationSpy not initialized");
    }
    return refreshAnalyticsTaskListVerificationSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/transitions", () => ({
  transitionAnalyticsTask: (...args: unknown[]) => {
    if (!transitionAnalyticsTaskSpy) throw new Error("transitionAnalyticsTaskSpy not initialized");
    return transitionAnalyticsTaskSpy(...args);
  },
}));

function makeTask(overrides: Partial<AnalyticsTaskRecord> = {}): AnalyticsTaskRecord {
  return {
    id: "task_123",
    projectId: "proj_123",
    userId: "user_123",
    status: "pending",
    taskType: "track_click",
    title: "Track pricing CTA clicks",
    originalQuestion: "How many users clicked pricing CTA?",
    answerKind: "cannot_answer_yet",
    answerSummary: "Missing click event.",
    analyticsGap: "No click event.",
    eventName: "pricing_cta_clicked",
    triggerDescription: "When user clicks pricing CTA.",
    propertiesSchema: { required: ["surface"] },
    targetSurface: "/pricing",
    implementationGuidance: null,
    verificationCriteria: { productionEvent: "pricing_cta_clicked" },
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

function makeTransitionResult(task: AnalyticsTaskRecord): TransitionAnalyticsTaskResult {
  return {
    status: "transitioned",
    task,
    statusEvent: null,
  };
}

function mockOwnershipFound() {
  getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue({
    id: "proj_123",
    displayName: "repo",
    source: "mcp_codex",
    status: "active",
    lastEventAt: null,
    mcpRepoName: null,
    mcpAppRoot: null,
    mcpPackageManager: null,
    dashboardUrls: { project: "/projects/proj_123" },
  });
}

describe("analytics tasks APIs", () => {
  it("confirms a draft task via POST /tasks", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    createPendingAnalyticsTaskSpy = vi.fn().mockResolvedValue({ status: "created", task: makeTask() });
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    findOwnedAnalyticsTaskByIdSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    transitionAnalyticsTaskSpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/analytics/tasks/route");
    const response = await POST(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks", {
        method: "POST",
        body: JSON.stringify({
          draft: {
            originalQuestion: "How many users clicked pricing CTA?",
            answerKind: "cannot_answer_yet",
            answerSummary: "Missing click event.",
            analyticsGap: "No click event.",
            taskType: "track_click",
            title: "Track pricing CTA clicks",
            eventName: "pricing_cta_clicked",
            triggerDescription: "When user clicks pricing CTA.",
            propertiesSchema: { required: ["surface"] },
            targetSurface: "/pricing",
            implementationGuidance: "Track in button handler.",
            verificationCriteria: { productionEvent: "pricing_cta_clicked" },
            verificationSource: "production_event",
          },
        }),
      }),
      { params: { id: "proj_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "created", task: { id: "task_123" } });
    expect(createPendingAnalyticsTaskSpy).toHaveBeenCalledTimes(1);
  });

  it("returns duplicate when confirmation matches an existing active task", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    createPendingAnalyticsTaskSpy = vi.fn().mockResolvedValue({ status: "duplicate", task: makeTask({ id: "task_existing" }) });
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    findOwnedAnalyticsTaskByIdSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    transitionAnalyticsTaskSpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/analytics/tasks/route");
    const response = await POST(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks", {
        method: "POST",
        body: JSON.stringify({
          draft: {
            originalQuestion: "How many users clicked pricing CTA?",
            answerKind: "cannot_answer_yet",
            answerSummary: "Missing click event.",
            analyticsGap: "No click event.",
            taskType: "track_click",
            title: "Track pricing CTA clicks",
            eventName: "pricing_cta_clicked",
            triggerDescription: "When user clicks pricing CTA.",
            propertiesSchema: {},
            verificationCriteria: {},
            verificationSource: "production_event",
          },
        }),
      }),
      { params: { id: "proj_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "duplicate", task: { id: "task_existing" } });
  });

  it("lists tasks with verification refresh and hides history by default", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    listOwnedAnalyticsTasksForProjectSpy = vi.fn().mockResolvedValue([
      makeTask({ id: "task_pending", status: "pending" }),
      makeTask({ id: "task_verified", status: "verified" }),
    ]);
    refreshAnalyticsTaskListVerificationSpy = vi.fn().mockResolvedValue([
      makeTask({ id: "task_pending", status: "pending" }),
      makeTask({ id: "task_verified", status: "verified" }),
    ]);
    createPendingAnalyticsTaskSpy = vi.fn();
    findOwnedAnalyticsTaskByIdSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();
    transitionAnalyticsTaskSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/tasks/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/tasks"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { tasks: Array<{ id: string; status: string }> };
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0]).toMatchObject({ id: "task_pending", status: "pending" });
    expect(refreshAnalyticsTaskListVerificationSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps cancelled task history hidden by default and returned when includeHistory=1", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    listOwnedAnalyticsTasksForProjectSpy = vi.fn().mockResolvedValue([
      makeTask({ id: "task_pending", status: "pending" }),
      makeTask({ id: "task_cancelled", status: "cancelled", cancelledAt: new Date("2026-05-12T00:00:00.000Z") }),
    ]);
    refreshAnalyticsTaskListVerificationSpy = vi.fn().mockResolvedValue([
      makeTask({ id: "task_pending", status: "pending" }),
      makeTask({ id: "task_cancelled", status: "cancelled", cancelledAt: new Date("2026-05-12T00:00:00.000Z") }),
    ]);
    createPendingAnalyticsTaskSpy = vi.fn();
    findOwnedAnalyticsTaskByIdSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();
    transitionAnalyticsTaskSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/tasks/route");

    const activeResponse = await GET(new Request("http://localhost/api/projects/proj_123/analytics/tasks"), {
      params: { id: "proj_123" },
    });
    const activeBody = (await activeResponse.json()) as { tasks: Array<{ id: string; status: string }> };
    expect(activeResponse.status).toBe(200);
    expect(activeBody.tasks).toHaveLength(1);
    expect(activeBody.tasks[0]).toMatchObject({ id: "task_pending", status: "pending" });

    const historyResponse = await GET(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks?includeHistory=1"),
      { params: { id: "proj_123" } },
    );
    const historyBody = (await historyResponse.json()) as { tasks: Array<{ id: string; status: string }> };
    expect(historyResponse.status).toBe(200);
    expect(historyBody.tasks).toHaveLength(2);
    expect(historyBody.tasks.map((task) => task.status)).toEqual(["pending", "cancelled"]);
    expect(refreshAnalyticsTaskListVerificationSpy).toHaveBeenCalledTimes(2);
  });

  it("edits a pending task via PATCH /tasks/[taskId]", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "pending" }));
    updateOwnedAnalyticsTaskSpy = vi.fn().mockResolvedValue(
      makeTask({ title: "Track upgraded CTA", eventName: "upgrade_cta_clicked" }),
    );
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();
    transitionAnalyticsTaskSpy = vi.fn();

    const { PATCH } = await import("../app/api/projects/[id]/analytics/tasks/[taskId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks/task_123", {
        method: "PATCH",
        body: JSON.stringify({
          action: "edit",
          title: "Track upgraded CTA",
          eventName: "upgrade_cta_clicked",
        }),
      }),
      { params: { id: "proj_123", taskId: "task_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "updated", task: { eventName: "upgrade_cta_clicked" } });
  });

  it("deletes pending tasks by transitioning them to cancelled", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "pending" }));
    transitionAnalyticsTaskSpy = vi.fn().mockResolvedValue(
      makeTransitionResult(makeTask({ status: "cancelled", cancelledAt: new Date("2026-05-12T00:00:00.000Z") })),
    );
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();

    const { DELETE } = await import("../app/api/projects/[id]/analytics/tasks/[taskId]/route");
    const response = await DELETE(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks/task_123", { method: "DELETE" }),
      { params: { id: "proj_123", taskId: "task_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "transitioned", task: { status: "cancelled" } });
    expect(transitionAnalyticsTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: "cancelled", actorType: "user" }),
    );
  });

  it("archives tasks via PATCH action archive", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "in_progress" }));
    transitionAnalyticsTaskSpy = vi.fn().mockResolvedValue(
      makeTransitionResult(makeTask({ status: "archived", archivedAt: new Date("2026-05-12T00:00:00.000Z") })),
    );
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();

    const { PATCH } = await import("../app/api/projects/[id]/analytics/tasks/[taskId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks/task_123", {
        method: "PATCH",
        body: JSON.stringify({ action: "archive" }),
      }),
      { params: { id: "proj_123", taskId: "task_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ task: { status: "archived" } });
  });

  it("reopens failed tasks back to pending", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "failed" }));
    transitionAnalyticsTaskSpy = vi.fn().mockResolvedValue(makeTransitionResult(makeTask({ status: "pending" })));
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();

    const { PATCH } = await import("../app/api/projects/[id]/analytics/tasks/[taskId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks/task_123", {
        method: "PATCH",
        body: JSON.stringify({ action: "reopen" }),
      }),
      { params: { id: "proj_123", taskId: "task_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ task: { status: "pending" } });
  });

  it("returns conflict when deleting a non-pending task", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "implemented_locally" }));
    transitionAnalyticsTaskSpy = vi.fn();
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();

    const { DELETE } = await import("../app/api/projects/[id]/analytics/tasks/[taskId]/route");
    const response = await DELETE(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks/task_123", { method: "DELETE" }),
      { params: { id: "proj_123", taskId: "task_123" } },
    );

    expect(response.status).toBe(409);
    expect(transitionAnalyticsTaskSpy).not.toHaveBeenCalled();
  });

  it("does not expose task ids from other accounts", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    mockOwnershipFound();
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(null);
    transitionAnalyticsTaskSpy = vi.fn();
    listOwnedAnalyticsTasksForProjectSpy = vi.fn();
    refreshAnalyticsTaskListVerificationSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();
    updateOwnedAnalyticsTaskSpy = vi.fn();

    const { PATCH } = await import("../app/api/projects/[id]/analytics/tasks/[taskId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/projects/proj_123/analytics/tasks/task_foreign", {
        method: "PATCH",
        body: JSON.stringify({ action: "archive" }),
      }),
      { params: { id: "proj_123", taskId: "task_foreign" } },
    );

    expect(response.status).toBe(404);
    expect(transitionAnalyticsTaskSpy).not.toHaveBeenCalled();
  });
});
