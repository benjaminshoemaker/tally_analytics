import { describe, expect, it, vi } from "vitest";

const appendEvents = vi.fn(async () => undefined);

vi.mock("../../events/lib/tinybird", () => ({
  createTinybirdClientFromEnv: () => ({ appendEvents }),
}));

describe("events track route CORS (Task 4.2.B)", () => {
  it("returns CORS headers for OPTIONS preflight", async () => {
    vi.resetModules();

    const { OPTIONS } = await import("../../events/app/v1/track/route");
    const response = await OPTIONS(
      new Request("http://localhost/v1/track", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
  });

  it("includes Access-Control-Allow-Origin on POST responses", async () => {
    vi.resetModules();
    appendEvents.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://example.com" },
      body: JSON.stringify({
        events: [
          {
            project_id: "proj_test",
            session_id: "sess_test",
            event_type: "page_view",
            timestamp: "2025-01-01T00:00:00.000Z",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

