import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch
const mockFetch = vi.fn(async () => new Response(null, { status: 204 }));

// Track what events were sent
function getPostedEvents(): unknown[] {
  return mockFetch.mock.calls.map((call) => {
    const body = call[1]?.body;
    if (typeof body === "string") {
      return JSON.parse(body).events;
    }
    return [];
  }).flat();
}

describe("Task 2.2.B - Tracker V2 integration", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();

    // @ts-expect-error test stub
    globalThis.fetch = mockFetch;

    // Set up browser-like environment
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          href: "https://example.com/page?utm_source=google&utm_medium=cpc",
          pathname: "/page",
          search: "?utm_source=google&utm_medium=cpc",
          protocol: "https:",
        },
        innerHeight: 800,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "document", {
      value: {
        referrer: "https://google.com/",
        visibilityState: "visible",
        cookie: "",
        documentElement: { scrollHeight: 2000 },
        body: { scrollHeight: 2000 },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("init() creates engagement, scroll, and CTA trackers when DNT disabled", async () => {
    const { init, trackPageView } = await import("../src/core");

    init({ projectId: "proj_test" });
    await trackPageView();

    // Should have called fetch (trackers initialized)
    expect(mockFetch).toHaveBeenCalled();
  });

  it("session_start event includes visitor_id, is_returning, and UTM params", async () => {
    const { init, trackPageView } = await import("../src/core");

    init({ projectId: "proj_test" });
    await trackPageView();

    const events = getPostedEvents();
    const sessionStart = events.find((e: any) => e.event_type === "session_start");

    expect(sessionStart).toBeDefined();
    expect(sessionStart).toHaveProperty("visitor_id");
    expect(sessionStart).toHaveProperty("is_returning");
    expect(sessionStart).toHaveProperty("utm_source", "google");
    expect(sessionStart).toHaveProperty("utm_medium", "cpc");
  });

  it("page_view events include engagement_time_ms and scroll_depth", async () => {
    const { init, trackPageView } = await import("../src/core");

    init({ projectId: "proj_test" });
    await trackPageView();

    const events = getPostedEvents();
    const pageView = events.find((e: any) => e.event_type === "page_view");

    expect(pageView).toBeDefined();
    expect(pageView).toHaveProperty("engagement_time_ms");
    expect(pageView).toHaveProperty("scroll_depth");
  });

  it("page_view events include cta_clicks field", async () => {
    const { init, trackPageView } = await import("../src/core");

    init({ projectId: "proj_test" });
    await trackPageView();

    const events = getPostedEvents();
    const pageView = events.find((e: any) => e.event_type === "page_view");

    expect(pageView).toBeDefined();
    // cta_clicks should be present (empty string or JSON array)
    expect(pageView).toHaveProperty("cta_clicks");
  });

  it("DNT check skips V2 module initialization", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "1" },
      configurable: true,
      writable: true,
    });

    const { init, trackPageView } = await import("../src/core");

    init({ projectId: "proj_test", respectDNT: true });
    await trackPageView();

    // With DNT enabled, no fetch should happen
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("existing SDK tests still pass - basic page view works", async () => {
    const { init, trackPageView, isEnabled } = await import("../src/core");

    init({ projectId: "proj_test" });
    expect(isEnabled()).toBe(true);

    await trackPageView("/test-page");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const events = getPostedEvents();
    expect(events.length).toBe(2); // session_start + page_view
    expect(events[1]).toHaveProperty("path", "/test-page");
  });
});

describe("Task 2.2.B - beforeunload and visibilitychange", () => {
  let windowAddEventListener: ReturnType<typeof vi.fn>;
  let documentAddEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();

    // @ts-expect-error test stub
    globalThis.fetch = mockFetch;

    windowAddEventListener = vi.fn();
    documentAddEventListener = vi.fn();

    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          href: "https://example.com/page",
          pathname: "/page",
          search: "",
          protocol: "https:",
        },
        innerHeight: 800,
        addEventListener: windowAddEventListener,
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "document", {
      value: {
        referrer: "",
        visibilityState: "visible",
        cookie: "",
        documentElement: { scrollHeight: 2000 },
        body: { scrollHeight: 2000 },
        addEventListener: documentAddEventListener,
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
      writable: true,
    });
  });

  it("registers beforeunload listener on init", async () => {
    const { init } = await import("../src/core");

    init({ projectId: "proj_test" });

    // Check that beforeunload was registered
    const beforeunloadCalls = windowAddEventListener.mock.calls.filter(
      (call: unknown[]) => call[0] === "beforeunload"
    );
    expect(beforeunloadCalls.length).toBeGreaterThan(0);
  });

  it("registers visibilitychange listener on init", async () => {
    const { init } = await import("../src/core");

    init({ projectId: "proj_test" });

    // Check that visibilitychange was registered
    const visibilityChangeCalls = documentAddEventListener.mock.calls.filter(
      (call: unknown[]) => call[0] === "visibilitychange"
    );
    expect(visibilityChangeCalls.length).toBeGreaterThan(0);
  });
});
