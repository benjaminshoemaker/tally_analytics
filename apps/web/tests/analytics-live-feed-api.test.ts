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

describe("GET /api/projects/[id]/analytics/live", () => {
  it("returns 401 when unauthenticated", async () => {
    const prevUrl = process.env.TINYBIRD_API_URL;
    const prevToken = process.env.TINYBIRD_ADMIN_TOKEN;
    process.env.TINYBIRD_API_URL = "https://api.example.tinybird.co";
    process.env.TINYBIRD_ADMIN_TOKEN = "tb_admin_token";

    try {
      vi.resetModules();
      getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
      selectSpy = vi.fn();

      const { GET } = await import("../app/api/projects/[id]/analytics/live/route");
      const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/live"), {
        params: { id: "proj_123" },
      });

      expect(response.status).toBe(401);
    } finally {
      if (prevUrl === undefined) delete process.env.TINYBIRD_API_URL;
      else process.env.TINYBIRD_API_URL = prevUrl;
      if (prevToken === undefined) delete process.env.TINYBIRD_ADMIN_TOKEN;
      else process.env.TINYBIRD_ADMIN_TOKEN = prevToken;
    }
  });

  it("returns 404 when the project does not belong to the user", async () => {
    process.env.TINYBIRD_API_URL = "https://api.example.tinybird.co";
    process.env.TINYBIRD_ADMIN_TOKEN = "tb_admin_token";

    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));

    const { GET } = await import("../app/api/projects/[id]/analytics/live/route");
    const response = await GET(new Request("http://localhost/api/projects/proj_123/analytics/live"), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(404);
  });

  it("proxies to Tinybird and returns normalized live feed data", async () => {
    process.env.TINYBIRD_API_URL = "https://api.example.tinybird.co";
    process.env.TINYBIRD_ADMIN_TOKEN = "tb_admin_token";

    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([{ id: "proj_123" }]) }) }));

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            event_type: "page_view",
            path: "/",
            referrer: "",
            timestamp: "2025-01-01T00:00:00.000Z",
            relative_time: "3 seconds ago",
          },
        ],
      }),
    } as unknown as Response);

    try {
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

      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/v0/pipes/live_feed.json"), expect.any(Object));
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("project_id=proj_123"), expect.any(Object));
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

