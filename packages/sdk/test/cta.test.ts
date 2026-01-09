import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { setupCTATracking, CTAClick } from "../src/cta";

interface HandlerEntry {
  handler: EventListener;
  options?: AddEventListenerOptions | boolean;
}

function installClickEnvironment() {
  const handlers = new Map<string, Set<HandlerEntry>>();

  Object.defineProperty(globalThis, "window", {
    value: {
      addEventListener(type: string, handler: EventListener, options?: AddEventListenerOptions | boolean) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type)!.add({ handler, options });
      },
      removeEventListener(type: string, handler: EventListener) {
        const handlersSet = handlers.get(type);
        if (handlersSet) {
          for (const h of handlersSet) {
            if (h.handler === handler) {
              handlersSet.delete(h);
              break;
            }
          }
        }
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "document", {
    value: {},
    configurable: true,
  });

  return {
    dispatch(type: string, event: Partial<MouseEvent> & { target: HTMLElement }) {
      const mouseEvent = {
        type,
        target: event.target,
        ...event,
      } as MouseEvent;
      handlers.get(type)?.forEach(({ handler }) => handler(mouseEvent));
    },
    getHandlerCount(type: string) {
      return handlers.get(type)?.size ?? 0;
    },
    getHandlerOptions(type: string): AddEventListenerOptions | boolean | undefined {
      const handlersSet = handlers.get(type);
      if (!handlersSet || handlersSet.size === 0) return undefined;
      return Array.from(handlersSet)[0].options;
    },
  };
}

function createMockElement(options: {
  tagName: string;
  type?: string;
  textContent?: string;
  href?: string;
  dataset?: Record<string, string>;
  matches?: (selector: string) => boolean;
}): HTMLElement {
  const el = {
    tagName: options.tagName.toUpperCase(),
    getAttribute: (name: string) => {
      if (name === "type") return options.type ?? null;
      if (name === "href") return options.href ?? null;
      return null;
    },
    textContent: options.textContent ?? "",
    href: options.href ?? "",
    dataset: options.dataset ?? {},
    matches: options.matches ?? ((selector: string) => {
      // Simple selector matching for tests
      if (selector === 'button[type="submit"]') {
        return options.tagName.toUpperCase() === "BUTTON" && options.type === "submit";
      }
      if (selector.startsWith('a[href*="')) {
        const hrefPart = selector.match(/a\[href\*="([^"]+)"\]/)?.[1];
        return options.tagName.toUpperCase() === "A" && options.href?.includes(hrefPart ?? "");
      }
      if (selector === "[data-tally-cta]") {
        return "tallyCta" in (options.dataset ?? {});
      }
      return false;
    }),
    closest: function(selector: string): HTMLElement | null {
      if (this.matches(selector)) return this as unknown as HTMLElement;
      return null;
    },
  } as unknown as HTMLElement;

  return el;
}

describe("Task 1.1.E - CTA Click Tracker", () => {
  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window;
    // @ts-expect-error cleanup
    delete globalThis.document;
  });

  it("setupCTATracking returns object with getAndClearClicks and destroy methods", () => {
    installClickEnvironment();
    const tracker = setupCTATracking();

    expect(typeof tracker.getAndClearClicks).toBe("function");
    expect(typeof tracker.destroy).toBe("function");

    tracker.destroy();
  });

  it("detects clicks on button[type=submit]", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const button = createMockElement({
      tagName: "button",
      type: "submit",
      textContent: "Sign Up Now",
    });

    env.dispatch("click", { target: button });

    const clicks = tracker.getAndClearClicks();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].elementType).toBe("button");
    expect(clicks[0].text).toBe("Sign Up Now");

    tracker.destroy();
  });

  it("detects clicks on a[href*=signup], a[href*=register], a[href*=pricing], etc.", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const signupLink = createMockElement({
      tagName: "a",
      href: "https://example.com/signup",
      textContent: "Get Started",
    });

    env.dispatch("click", { target: signupLink });

    const clicks = tracker.getAndClearClicks();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].elementType).toBe("link");
    expect(clicks[0].text).toBe("Get Started");
    expect(clicks[0].domain).toBe("example.com");

    tracker.destroy();
  });

  it("detects clicks on [data-tally-cta]", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const customCTA = createMockElement({
      tagName: "div",
      textContent: "Custom CTA",
      dataset: { tallyCta: "" },
    });

    env.dispatch("click", { target: customCTA });

    const clicks = tracker.getAndClearClicks();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].elementType).toBe("other");
    expect(clicks[0].text).toBe("Custom CTA");

    tracker.destroy();
  });

  it("captures element type (button/link), text (max 30 chars), href domain only", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const longTextLink = createMockElement({
      tagName: "a",
      href: "https://sub.example.com/signup?ref=campaign&source=email",
      textContent: "This is a very long call to action button text that exceeds thirty characters",
    });

    env.dispatch("click", { target: longTextLink });

    const clicks = tracker.getAndClearClicks();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].text.length).toBeLessThanOrEqual(30);
    expect(clicks[0].domain).toBe("sub.example.com");
    // Should not contain full URL path
    expect(clicks[0].domain).not.toContain("/signup");
    expect(clicks[0].domain).not.toContain("?ref");

    tracker.destroy();
  });

  it("uses capture phase listener", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const options = env.getHandlerOptions("click") as AddEventListenerOptions;
    expect(options?.capture).toBe(true);

    tracker.destroy();
  });

  it("getAndClearClicks returns array and clears internal queue", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const button1 = createMockElement({
      tagName: "button",
      type: "submit",
      textContent: "Submit",
    });

    const button2 = createMockElement({
      tagName: "a",
      href: "https://example.com/register",
      textContent: "Register",
    });

    env.dispatch("click", { target: button1 });
    env.dispatch("click", { target: button2 });

    const clicks1 = tracker.getAndClearClicks();
    expect(clicks1).toHaveLength(2);

    const clicks2 = tracker.getAndClearClicks();
    expect(clicks2).toHaveLength(0);

    tracker.destroy();
  });

  it("destroy removes click listener", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    expect(env.getHandlerCount("click")).toBeGreaterThan(0);

    tracker.destroy();

    expect(env.getHandlerCount("click")).toBe(0);
  });

  it("handles SSR gracefully (returns empty tracker when window undefined)", () => {
    // @ts-expect-error testing undefined
    delete globalThis.window;

    const tracker = setupCTATracking();

    expect(tracker.getAndClearClicks()).toEqual([]);

    tracker.destroy(); // Should not throw
  });

  it("ignores clicks on non-CTA elements", () => {
    const env = installClickEnvironment();
    const tracker = setupCTATracking();

    const regularLink = createMockElement({
      tagName: "a",
      href: "https://example.com/about",
      textContent: "About Us",
    });

    env.dispatch("click", { target: regularLink });

    const clicks = tracker.getAndClearClicks();
    expect(clicks).toHaveLength(0);

    tracker.destroy();
  });
});
