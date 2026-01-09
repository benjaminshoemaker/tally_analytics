import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createScrollTracker } from "../src/scroll";

function installScrollEnvironment(options: {
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
}) {
  const handlers: Map<string, Set<EventListener>> = new Map();

  let scrollTop = options.scrollTop ?? 0;
  const scrollHeight = options.scrollHeight ?? 2000;
  const clientHeight = options.clientHeight ?? 800;

  Object.defineProperty(globalThis, "window", {
    value: {
      scrollY: scrollTop,
      innerHeight: clientHeight,
      addEventListener(type: string, handler: EventListener, options?: AddEventListenerOptions | boolean) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type)!.add(handler);
      },
      removeEventListener(type: string, handler: EventListener) {
        handlers.get(type)?.delete(handler);
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "document", {
    value: {
      documentElement: {
        get scrollHeight() {
          return scrollHeight;
        },
        get clientHeight() {
          return clientHeight;
        },
      },
      body: {
        get scrollHeight() {
          return scrollHeight;
        },
      },
    },
    configurable: true,
  });

  return {
    setScrollPosition(position: number) {
      scrollTop = position;
      (globalThis.window as any).scrollY = position;
    },
    dispatch(type: string) {
      const event = { type } as Event;
      handlers.get(type)?.forEach((h) => h(event));
    },
    getHandlerCount(type: string) {
      return handlers.get(type)?.size ?? 0;
    },
  };
}

describe("Task 1.1.B - Scroll Depth Tracker", () => {
  it("createScrollTracker returns object with getMaxScrollDepth, reset, and destroy methods", () => {
    installScrollEnvironment({});
    const tracker = createScrollTracker();

    expect(typeof tracker.getMaxScrollDepth).toBe("function");
    expect(typeof tracker.reset).toBe("function");
    expect(typeof tracker.destroy).toBe("function");

    tracker.destroy();
  });

  it("scroll depth calculated as scrollTop / (docHeight - viewportHeight) * 100", () => {
    // Page height: 2000px, viewport: 800px, scrollable: 1200px
    const env = installScrollEnvironment({
      scrollHeight: 2000,
      clientHeight: 800,
    });
    const tracker = createScrollTracker();

    // Scroll to 600px (50% of scrollable area)
    env.setScrollPosition(600);
    env.dispatch("scroll");

    expect(tracker.getMaxScrollDepth()).toBe(50);

    // Scroll to 1200px (100% of scrollable area)
    env.setScrollPosition(1200);
    env.dispatch("scroll");

    expect(tracker.getMaxScrollDepth()).toBe(100);

    tracker.destroy();
  });

  it("returns 100% if page fits entirely in viewport (no scrollbar)", () => {
    // Page height: 500px, viewport: 800px (no scrolling possible)
    installScrollEnvironment({
      scrollHeight: 500,
      clientHeight: 800,
    });
    const tracker = createScrollTracker();

    // Should immediately be 100% since no scrolling is needed
    expect(tracker.getMaxScrollDepth()).toBe(100);

    tracker.destroy();
  });

  it("tracks maximum depth reached, not current position", () => {
    const env = installScrollEnvironment({
      scrollHeight: 2000,
      clientHeight: 800,
    });
    const tracker = createScrollTracker();

    // Scroll to 75%
    env.setScrollPosition(900);
    env.dispatch("scroll");
    expect(tracker.getMaxScrollDepth()).toBe(75);

    // Scroll back to 25%
    env.setScrollPosition(300);
    env.dispatch("scroll");

    // Should still report 75% (maximum reached)
    expect(tracker.getMaxScrollDepth()).toBe(75);

    // Scroll to 100%
    env.setScrollPosition(1200);
    env.dispatch("scroll");
    expect(tracker.getMaxScrollDepth()).toBe(100);

    tracker.destroy();
  });

  it("uses passive scroll event listener for performance", () => {
    const addEventListenerSpy = vi.fn();

    Object.defineProperty(globalThis, "window", {
      value: {
        scrollY: 0,
        innerHeight: 800,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, "document", {
      value: {
        documentElement: {
          scrollHeight: 2000,
          clientHeight: 800,
        },
        body: {
          scrollHeight: 2000,
        },
      },
      configurable: true,
    });

    const tracker = createScrollTracker();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      expect.objectContaining({ passive: true })
    );

    tracker.destroy();
  });

  it("reset() clears maximum scroll depth", () => {
    const env = installScrollEnvironment({
      scrollHeight: 2000,
      clientHeight: 800,
    });
    const tracker = createScrollTracker();

    env.setScrollPosition(600);
    env.dispatch("scroll");
    expect(tracker.getMaxScrollDepth()).toBe(50);

    tracker.reset();
    expect(tracker.getMaxScrollDepth()).toBe(0);

    tracker.destroy();
  });

  it("destroy() removes scroll event listener", () => {
    const env = installScrollEnvironment({});
    const tracker = createScrollTracker();

    expect(env.getHandlerCount("scroll")).toBeGreaterThan(0);

    tracker.destroy();

    expect(env.getHandlerCount("scroll")).toBe(0);
  });

  it("handles SSR gracefully (returns 0 when window undefined)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error testing undefined
    delete globalThis.window;

    const tracker = createScrollTracker();
    expect(tracker.getMaxScrollDepth()).toBe(0);

    tracker.destroy();

    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});
