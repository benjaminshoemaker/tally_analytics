import { describe, expect, it, vi } from "vitest";

const appendEvents = vi.fn(async () => undefined);
const isProjectActive = vi.fn(async () => true);

vi.mock("../../events/lib/tinybird", () => ({
  createTinybirdClientFromEnv: () => ({ appendEvents }),
}));

vi.mock("../../events/lib/project-cache", () => ({
  createProjectCacheFromEnv: () => ({ isProjectActive }),
}));

describe("events track route - V2 schema (Task 2.1.A)", () => {
  const v1Event = {
    project_id: "proj_test",
    session_id: "sess_test",
    event_type: "page_view" as const,
    timestamp: "2025-01-01T00:00:00.000Z",
    url: "https://example.com/",
    path: "/",
  };

  const v2Fields = {
    engagement_time_ms: 5000,
    scroll_depth: 75,
    visitor_id: "vid_abc123",
    is_returning: 1,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "summer_sale",
    utm_term: "analytics",
    utm_content: "banner_1",
    cta_clicks: JSON.stringify([{ type: "button", text: "Sign Up", href: "/signup" }]),
  };

  it("accepts V1 events without new fields (backward compatibility)", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [v1Event] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, received: 1 });
    expect(appendEvents).toHaveBeenCalledWith([{ ...v1Event, environment: "test" }]);
  });

  it("accepts V2 events with all new fields", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const v2Event = { ...v1Event, ...v2Fields };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [v2Event] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, received: 1 });
    expect(appendEvents).toHaveBeenCalledWith([{ ...v2Event, environment: "test" }]);
  });

  it("accepts V2 events with partial new fields", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const partialV2Event = {
      ...v1Event,
      engagement_time_ms: 3000,
      utm_source: "twitter",
    };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [partialV2Event] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(appendEvents).toHaveBeenCalledWith([{ ...partialV2Event, environment: "test" }]);
  });

  it("accepts lower-snake-case custom event names with explicit environment and event_properties", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const customEvent = {
      ...v1Event,
      event_type: "signup_completed",
      environment: "development" as const,
      event_properties: JSON.stringify({ plan: "pro", step: 2 }),
    };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [customEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(appendEvents).toHaveBeenCalledWith([customEvent]);
  });

  it("serializes properties and defaults environment to test when omitted", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const sdkStyleEvent = {
      ...v1Event,
      event_type: "track_click",
      properties: { cta: "pricing", step: 3, isTrial: false, coupon: null },
    };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [sdkStyleEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(appendEvents).toHaveBeenCalledWith([
      {
        ...v1Event,
        event_type: "track_click",
        environment: "test",
        event_properties: JSON.stringify({ cta: "pricing", step: 3, isTrial: false, coupon: null }),
      },
    ]);
  });

  it("rejects invalid custom event names", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const invalidEvent = { ...v1Event, event_type: "Signup Completed" };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [invalidEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it("rejects oversized event_properties payloads", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const invalidEvent = {
      ...v1Event,
      event_type: "signup_completed",
      event_properties: "x".repeat(4097),
    };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [invalidEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it("rejects invalid engagement_time_ms (wrong type)", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const invalidEvent = { ...v1Event, engagement_time_ms: "not a number" };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [invalidEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it("rejects invalid scroll_depth (wrong type)", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const invalidEvent = { ...v1Event, scroll_depth: "75%" };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [invalidEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it("rejects invalid is_returning (wrong type)", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const invalidEvent = { ...v1Event, is_returning: "yes" };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [invalidEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it("rejects invalid visitor_id (wrong type)", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const invalidEvent = { ...v1Event, visitor_id: 12345 };

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [invalidEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).not.toHaveBeenCalled();
  });
});
