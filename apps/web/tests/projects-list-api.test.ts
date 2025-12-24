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

describe("GET /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();

    const { GET } = await import("../app/api/projects/route");
    const response = await GET(new Request("http://localhost/api/projects"));

    expect(response.status).toBe(401);
  });

  it("returns a list of projects for the current user", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });

    const orderBySpy = vi.fn().mockResolvedValue([
      {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
        prUrl: "https://github.com/octo/repo/pull/1",
        detectedFramework: "nextjs-app",
        eventsThisMonth: 42n,
        lastEventAt: new Date("2025-01-01T00:00:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ]);
    const whereSpy = vi.fn(() => ({ orderBy: orderBySpy }));
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const { GET } = await import("../app/api/projects/route");
    const response = await GET(new Request("http://localhost/api/projects"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      projects: [
        {
          id: "proj_123",
          githubRepoFullName: "octo/repo",
          status: "active",
          prUrl: "https://github.com/octo/repo/pull/1",
          detectedFramework: "nextjs-app",
          eventsThisMonth: 42,
          lastEventAt: "2025-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
  });
});

