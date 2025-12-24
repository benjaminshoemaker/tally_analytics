import { describe, expect, it, vi } from "vitest";

import { createPageViewEvent, postEvents } from "../src/tracker";

describe("Task 3.2.B - Event tracking", () => {
  it("sends events to ingestion endpoint with keepalive: true", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    await postEvents("https://events.example.com/v1/track", [
      {
        project_id: "proj_123",
        session_id: "sid_123",
        event_type: "page_view",
        timestamp: new Date().toISOString(),
      },
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.keepalive).toBe(true);
  });

  it("includes session_id, timestamp, url, path, referrer", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { href: "https://example.com/a?b=c" },
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, "document", {
      value: {
        referrer: "https://referrer.example/",
      },
      configurable: true,
    });

    const event = createPageViewEvent({
      projectId: "proj_123",
      sessionId: "sid_123",
      path: "/a?b=c",
    });

    expect(event.session_id).toBe("sid_123");
    expect(event.timestamp).toBeTypeOf("string");
    expect(event.url).toBe("https://example.com/a?b=c");
    expect(event.path).toBe("/a?b=c");
    expect(event.referrer).toBe("https://referrer.example/");
  });

  it("respects Do Not Track", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "1" },
      configurable: true,
    });

    await postEvents("https://events.example.com/v1/track", [
      {
        project_id: "proj_123",
        session_id: "sid_123",
        event_type: "page_view",
        timestamp: new Date().toISOString(),
      },
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("catches errors silently", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network");
    });
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    await expect(
      postEvents("https://events.example.com/v1/track", [
        {
          project_id: "proj_123",
          session_id: "sid_123",
          event_type: "page_view",
          timestamp: new Date().toISOString(),
        },
      ]),
    ).resolves.toBeUndefined();
  });
});

