import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { identify, init, isEnabled, trackPageView } from "../src/core";

function installCookieDocument() {
  const jar = new Map<string, string>();

  Object.defineProperty(globalThis, "document", {
    value: {
      referrer: "https://referrer.example/",
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

describe("Task 3.2.C - Public API", () => {
  it("exports public API from src/index.ts", () => {
    const indexPath = path.join(__dirname, "..", "src", "index.ts");
    const src = fs.readFileSync(indexPath, "utf8");
    expect(src).toContain('export { identify, init, isEnabled, trackPageView }');
  });

  it("init(options) stores configuration and trackPageView sends a page_view", async () => {
    installCookieDocument();
    Object.defineProperty(globalThis, "window", {
      value: { location: { href: "https://example.com/a?b=c" } },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
    });

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    init({ projectId: "proj_123" });
    await trackPageView("/a?b=c");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, initArg] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://events.usetally.xyz/v1/track");
    const body = JSON.parse(initArg.body);
    expect(body.events.some((e: any) => e.event_type === "page_view")).toBe(true);
  });

  it("identify(userId) associates events with user", async () => {
    installCookieDocument();
    Object.defineProperty(globalThis, "window", {
      value: { location: { href: "https://example.com/" } },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "0" },
      configurable: true,
    });

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );

    init({ projectId: "proj_123" });
    identify("user_123");
    await trackPageView("/");

    const [, initArg] = fetchSpy.mock.calls[0];
    const body = JSON.parse(initArg.body);
    const pageView = body.events.find((e: any) => e.event_type === "page_view");
    expect(pageView.user_id).toBe("user_123");
  });

  it("isEnabled() respects Do Not Track by default", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { doNotTrack: "1" },
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: { location: { href: "https://example.com/" } },
      configurable: true,
    });

    init({ projectId: "proj_123" });
    expect(isEnabled()).toBe(false);

    init({ projectId: "proj_123", respectDNT: false });
    expect(isEnabled()).toBe(true);
  });

  it("guards for SSR (no window/document)", async () => {
    // @ts-expect-error test setup
    delete globalThis.window;
    // @ts-expect-error test setup
    delete globalThis.document;

    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error test stub
    globalThis.fetch = fetchSpy;

    init({ projectId: "proj_123" });
    await expect(trackPageView("/")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
