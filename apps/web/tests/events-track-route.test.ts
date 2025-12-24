import { describe, expect, it, vi } from "vitest";

const appendEvents = vi.fn(async () => undefined);

vi.mock("../../events/lib/tinybird", () => ({
  createTinybirdClientFromEnv: () => ({ appendEvents }),
}));

describe("events track route (Task 4.2.A)", () => {
  const validEvent = {
    project_id: "proj_test",
    session_id: "sess_test",
    event_type: "page_view",
    timestamp: "2025-01-01T00:00:00.000Z",
    url: "https://example.com/",
    path: "/",
  };

  it("accepts 1-10 events and forwards them to Tinybird", async () => {
    vi.resetModules();
    appendEvents.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [validEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, received: 1 });
    expect(appendEvents).toHaveBeenCalledTimes(1);
    expect(appendEvents).toHaveBeenCalledWith([validEvent]);
  });

  it("rejects invalid payloads via Zod validation", async () => {
    vi.resetModules();
    appendEvents.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [{ ...validEvent, project_id: 123 }] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).toHaveBeenCalledTimes(0);
  });

  it("rejects empty batches and batches over 10", async () => {
    vi.resetModules();
    appendEvents.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");

    const emptyRequest = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [] }),
    });
    const emptyResponse = await POST(emptyRequest);
    expect(emptyResponse.status).toBe(400);

    const tooManyRequest = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: Array.from({ length: 11 }, () => validEvent) }),
    });
    const tooManyResponse = await POST(tooManyRequest);
    expect(tooManyResponse.status).toBe(400);

    expect(appendEvents).toHaveBeenCalledTimes(0);
  });
});

