import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

let createTinybirdClientFromEnvSpy: ReturnType<typeof vi.fn> | undefined;
let tinybirdSqlSpy: ReturnType<typeof vi.fn> | undefined;

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

vi.mock("../lib/tinybird/client", () => ({
  createTinybirdClientFromEnv: (...args: unknown[]) => {
    if (!createTinybirdClientFromEnvSpy) throw new Error("createTinybirdClientFromEnvSpy not initialized");
    return createTinybirdClientFromEnvSpy(...args);
  },
  tinybirdSql: (...args: unknown[]) => {
    if (!tinybirdSqlSpy) throw new Error("tinybirdSqlSpy not initialized");
    return tinybirdSqlSpy(...args);
  },
}));

describe("GET /api/projects/[id]/analytics/sessions", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();
    createTinybirdClientFromEnvSpy = vi.fn();
    tinybirdSqlSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/sessions/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/sessions"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when project is not found", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));
    createTinybirdClientFromEnvSpy = vi.fn();
    tinybirdSqlSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/sessions/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/sessions"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(404);
  });

  it("returns session totals and time series data", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: "proj_123" }]) }) }));

    createTinybirdClientFromEnvSpy = vi.fn().mockReturnValue({ apiUrl: "x", token: "y" });
    tinybirdSqlSpy = vi.fn().mockResolvedValue({
      data: [
        { date: "2025-01-01", sessions: 2 },
        { date: "2025-01-02", sessions: 3 },
      ],
    });

    const { GET } = await import("../app/api/projects/[id]/analytics/sessions/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/sessions?period=7d"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      period: "7d",
      totalSessions: 5,
      newVisitors: 5,
      returningVisitors: 0,
      timeSeries: [
        { date: "2025-01-01", newSessions: 2, returningSessions: 0 },
        { date: "2025-01-02", newSessions: 3, returningSessions: 0 },
      ],
    });
  });
});

