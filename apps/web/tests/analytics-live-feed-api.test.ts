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

describe("GET /api/projects/[id]/analytics/live", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();
    createTinybirdClientFromEnvSpy = vi.fn();
    tinybirdSqlSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/live/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/live"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when the project does not belong to the user", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));
    createTinybirdClientFromEnvSpy = vi.fn();
    tinybirdSqlSpy = vi.fn();

    const { GET } = await import("../app/api/projects/[id]/analytics/live/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/live"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(404);
  });

  it("proxies to Tinybird and returns normalized live feed data", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: "proj_123" }]) }) }));

    createTinybirdClientFromEnvSpy = vi.fn().mockReturnValue({ apiUrl: "x", token: "y" });
    tinybirdSqlSpy = vi.fn().mockResolvedValue({
      data: [
        {
          event_type: "page_view",
          path: "/",
          referrer: "",
          timestamp: "2025-01-01T00:00:00.000Z",
          relative_time: "3 seconds ago",
        },
      ],
    });

    const { GET } = await import("../app/api/projects/[id]/analytics/live/route");
    const response = await GET(
      new Request("http://localhost/api/projects/proj_123/analytics/live?limit=1&since=2025-01-01T00:00:00.000Z"),
      { params: { id: "proj_123" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      events: [
        {
          id: expect.any(String),
          eventType: "page_view",
          path: "/",
          referrer: null,
          timestamp: "2025-01-01T00:00:00.000Z",
          relativeTime: "3 seconds ago",
        },
      ],
      hasMore: true,
    });

    expect(tinybirdSqlSpy).toHaveBeenCalledWith(
      { apiUrl: "x", token: "y" },
      expect.stringContaining("FROM events"),
    );
  });
});
