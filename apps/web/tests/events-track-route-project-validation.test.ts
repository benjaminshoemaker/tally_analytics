import { describe, expect, it, vi } from "vitest";

const appendEvents = vi.fn(async () => undefined);
const isProjectActive = vi.fn(async () => false);

vi.mock("../../events/lib/tinybird", () => ({
  createTinybirdClientFromEnv: () => ({ appendEvents }),
}));

vi.mock("../../events/lib/project-cache", () => ({
  createProjectCacheFromEnv: () => ({ isProjectActive }),
}));

describe("events track route project validation (Task 4.3.A)", () => {
  it("silently drops events for inactive projects (still returns 200)", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://example.com" },
      body: JSON.stringify({
        events: [
          {
            project_id: "proj_inactive",
            session_id: "sess_test",
            event_type: "page_view",
            timestamp: "2025-01-01T00:00:00.000Z",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, received: 1 });
    expect(isProjectActive).toHaveBeenCalledTimes(1);
    expect(appendEvents).toHaveBeenCalledTimes(0);
  });
});

