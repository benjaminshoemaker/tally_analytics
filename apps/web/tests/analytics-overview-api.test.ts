import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

let createTinybirdClientFromEnvSpy: ReturnType<typeof vi.fn> | undefined;
let tinybirdPipeSpy: ReturnType<typeof vi.fn> | undefined;
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
  tinybirdPipe: (...args: unknown[]) => {
    if (!tinybirdPipeSpy) throw new Error("tinybirdPipeSpy not initialized");
    return tinybirdPipeSpy(...args);
  },
  tinybirdSql: (...args: unknown[]) => {
    if (!tinybirdSqlSpy) throw new Error("tinybirdSqlSpy not initialized");
    return tinybirdSqlSpy(...args);
  },
}));

describe("GET /api/projects/[id]/analytics/overview", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();
    createTinybirdClientFromEnvSpy = vi.fn();
    tinybirdPipeSpy = vi.fn();
    tinybirdSqlSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/overview/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/overview"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when project is not found", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));
    createTinybirdClientFromEnvSpy = vi.fn();
    tinybirdPipeSpy = vi.fn();
    tinybirdSqlSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/overview/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/overview"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(404);
  });

  it("aggregates Tinybird data and calculates change percentages", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: "proj_123" }]) }) }));

    createTinybirdClientFromEnvSpy = vi.fn().mockReturnValue({ apiUrl: "x", token: "y" });

    tinybirdPipeSpy = vi
      .fn()
      // current page views timeseries
      .mockResolvedValueOnce({
        data: [
          { date: "2025-01-01", count: 10 },
          { date: "2025-01-02", count: 20 },
        ],
      })
      // previous page views timeseries
      .mockResolvedValueOnce({
        data: [{ date: "2024-12-31", count: 15 }],
      })
      // top pages
      .mockResolvedValueOnce({
        data: [{ path: "/", views: 20, percentage: 66.67 }],
      })
      // top referrers
      .mockResolvedValueOnce({
        data: [{ referrer_host: "Direct", count: 5, percentage: 100 }],
      });

    tinybirdSqlSpy = vi
      .fn()
      // current sessions total
      .mockResolvedValueOnce({ data: [{ total: 5 }] })
      // previous sessions total
      .mockResolvedValueOnce({ data: [{ total: 10 }] });

    const { GET } = await import("../app/api/projects/[id]/analytics/overview/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/overview?period=7d"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      period: "7d",
      pageViews: {
        total: 30,
        change: 100,
        timeSeries: [
          { date: "2025-01-01", count: 10 },
          { date: "2025-01-02", count: 20 },
        ],
      },
      sessions: {
        total: 5,
        change: -50,
      },
      topPages: [{ path: "/", views: 20, percentage: 66.67 }],
      topReferrers: [{ referrer: "Direct", count: 5, percentage: 100 }],
    });
  });
});

