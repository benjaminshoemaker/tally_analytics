import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;
let interpretAnalyticsQuestionSpy: ReturnType<typeof vi.fn> | undefined;
let createPendingAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;

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

vi.mock("../lib/analytics/tasks/question", () => ({
  interpretAnalyticsQuestion: (...args: unknown[]) => {
    if (!interpretAnalyticsQuestionSpy) throw new Error("interpretAnalyticsQuestionSpy not initialized");
    return interpretAnalyticsQuestionSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/queries", () => ({
  createPendingAnalyticsTask: (...args: unknown[]) => {
    if (!createPendingAnalyticsTaskSpy) throw new Error("createPendingAnalyticsTaskSpy not initialized");
    return createPendingAnalyticsTaskSpy(...args);
  },
}));

describe("POST /api/projects/[id]/analytics/questions", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    getOwnedAnalyticsProjectSpy = vi.fn();
    interpretAnalyticsQuestionSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/analytics/questions/route");
    const response = await POST(
      new Request("http://localhost/api/projects/proj_123/analytics/questions", {
        method: "POST",
        body: JSON.stringify({ question: "How many users visited pricing this week?" }),
      }),
      { params: { id: "proj_123" } },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the user does not own the project", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
    getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue(null);
    interpretAnalyticsQuestionSpy = vi.fn();
    createPendingAnalyticsTaskSpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/analytics/questions/route");
    const response = await POST(
      new Request("http://localhost/api/projects/proj_123/analytics/questions", {
        method: "POST",
        body: JSON.stringify({ question: "How many users visited pricing this week?" }),
      }),
      { params: { id: "proj_123" } },
    );

    expect(response.status).toBe(404);
  });

  it("returns interpreted results and never persists a task directly", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user_123", email: "u@example.com" });
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
    interpretAnalyticsQuestionSpy = vi.fn().mockResolvedValue({
      kind: "answered",
      answer: {
        summary: "Pricing page visits are available.",
        metrics: [{ label: "Pricing page views", value: 42 }],
        window: { period: "7d", start: "2026-05-01T00:00:00.000Z", end: "2026-05-08T00:00:00.000Z" },
      },
      draft: null,
      existingTask: null,
    });
    createPendingAnalyticsTaskSpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/analytics/questions/route");
    const response = await POST(
      new Request("http://localhost/api/projects/proj_123/analytics/questions", {
        method: "POST",
        body: JSON.stringify({ question: "How many users visited pricing this week?", period: "7d" }),
      }),
      { params: { id: "proj_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ kind: "answered" });
    expect(interpretAnalyticsQuestionSpy).toHaveBeenCalledTimes(1);
    expect(createPendingAnalyticsTaskSpy).not.toHaveBeenCalled();
  });
});
