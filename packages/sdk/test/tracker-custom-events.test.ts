import { describe, expect, it, vi } from "vitest";

import { init, track } from "../src/core";
import { createCustomEvent } from "../src/tracker";

function installCookieDocument() {
  const jar = new Map<string, string>();

  Object.defineProperty(globalThis, "document", {
    value: {
      referrer: "https://referrer.example/",
      visibilityState: "visible",
      documentElement: { scrollHeight: 1000 },
      body: { scrollHeight: 1000 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      get cookie() {
        return Array.from(jar.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join("; ");
      },
      set cookie(value: string) {
        const [pair] = value.split(";");
        const [name, cookieValue] = pair.split("=");
        jar.set(name.trim(), (cookieValue ?? "").trim());
      },
    },
    configurable: true,
  });
}

function installWindow() {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        href: "https://example.com/pricing?source=test",
        pathname: "/pricing",
        search: "?source=test",
        protocol: "https:",
      },
      innerHeight: 800,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });
}

describe("custom tracker events", () => {
  it("creates custom events with serialized properties", () => {
    installCookieDocument();
    installWindow();

    const event = createCustomEvent(
      "proj_123",
      "sid_123",
      "signup_completed",
      "user_123",
      { plan: "pro", seats: 3, trial: false, coupon: null },
    );

    expect(event.event_type).toBe("signup_completed");
    expect(event.properties).toEqual({
      plan: "pro",
      seats: 3,
      trial: false,
      coupon: null,
    });
  });

  it("track(eventName, properties) sends custom events when initialized", async () => {
    installCookieDocument();
    installWindow();
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
    });

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("dddddddd-dddd-4ddd-8ddd-dddddddddddd");

    init({ projectId: "proj_123" });
    await track("signup_completed", { plan: "pro", step: 4 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, initArg] = fetchSpy.mock.calls[0];
    const body = JSON.parse(initArg.body);
    const customEvent = body.events.find((e: { event_type: string }) => e.event_type === "signup_completed");
    expect(customEvent).toBeDefined();
    expect(customEvent.properties).toEqual({ plan: "pro", step: 4 });
  });

  it("track() no-ops for invalid custom event names", async () => {
    installCookieDocument();
    installWindow();
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
    });

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    init({ projectId: "proj_123" });
    await track("Signup Completed", { plan: "pro" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("track() no-ops when init() has not been called", async () => {
    installCookieDocument();
    installWindow();
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
    });

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    vi.resetModules();
    const { track: freshTrack } = await import("../src/core");
    await freshTrack("signup_completed", { plan: "pro" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("track() respects Do Not Track", async () => {
    installCookieDocument();
    installWindow();
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "1" },
      configurable: true,
    });

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    init({ projectId: "proj_123" });
    await track("signup_completed", { plan: "pro" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
