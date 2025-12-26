import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/get-user", () => ({
  getUserFromRequest: (...args: unknown[]) => {
    if (!getUserFromRequestSpy) throw new Error("getUserFromRequestSpy not initialized");
    return getUserFromRequestSpy(...args);
  },
}));

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
  },
}));

describe("GET /api/projects/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123"), { params: { id: "proj_123" } });

    expect(response.status).toBe(401);
  });

  it("returns 404 when project is not found", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn().mockImplementationOnce(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));

    const { GET } = await import("../app/api/projects/[id]/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123"), { params: { id: "proj_123" } });

    expect(response.status).toBe(404);
  });

  it("returns project details with quota info", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });

    const projectWhereSpy = vi.fn().mockResolvedValue([
      {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "analysis_failed",
        prNumber: 1,
        prUrl: "https://github.com/octo/repo/pull/1",
        detectedFramework: "nextjs-app",
        detectedAnalytics: ["posthog"],
        eventsThisMonth: 12n,
        lastEventAt: null,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    ]);
    const projectFromSpy = vi.fn(() => ({ where: projectWhereSpy }));

    const userWhereSpy = vi.fn().mockResolvedValue([{ plan: "free" }]);
    const userFromSpy = vi.fn(() => ({ where: userWhereSpy }));

    selectSpy = vi
      .fn()
      .mockImplementationOnce(() => ({ from: projectFromSpy }))
      .mockImplementationOnce(() => ({ from: userFromSpy }));

    const { GET } = await import("../app/api/projects/[id]/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123"), { params: { id: "proj_123" } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "analysis_failed",
        prNumber: 1,
        prUrl: "https://github.com/octo/repo/pull/1",
        detectedFramework: "nextjs-app",
        detectedAnalytics: ["posthog"],
        eventsThisMonth: 12,
        lastEventAt: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
      quotaLimit: 10000,
      quotaUsed: 12,
      isOverQuota: false,
    });
  });
});

