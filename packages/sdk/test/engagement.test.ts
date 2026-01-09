import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createEngagementTracker } from "../src/engagement";

function installDocument() {
  const handlers: Map<string, Set<EventListener>> = new Map();

  Object.defineProperty(globalThis, "document", {
    value: {
      visibilityState: "visible",
      addEventListener(type: string, handler: EventListener) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type)!.add(handler);
      },
      removeEventListener(type: string, handler: EventListener) {
        handlers.get(type)?.delete(handler);
      },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, "window", {
    value: {
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

  return {
    dispatch(type: string, event?: Event) {
      const defaultEvent = { type } as Event;
      handlers.get(type)?.forEach((h) => h(event ?? defaultEvent));
    },
    setVisibilityState(state: "visible" | "hidden") {
      (globalThis.document as any).visibilityState = state;
    },
    getHandlerCount(type: string) {
      return handlers.get(type)?.size ?? 0;
    },
  };
}

describe("Task 1.1.A - Engagement Time Tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createEngagementTracker returns object with getEngagementTimeMs, reset, and destroy methods", () => {
    installDocument();
    const tracker = createEngagementTracker();

    expect(typeof tracker.getEngagementTimeMs).toBe("function");
    expect(typeof tracker.reset).toBe("function");
    expect(typeof tracker.destroy).toBe("function");

    tracker.destroy();
  });

  it("engagement time only accumulates when tab is visible AND user is active", () => {
    const doc = installDocument();
    const tracker = createEngagementTracker();

    // Simulate initial activity
    doc.dispatch("mousemove");

    // Advance 5 seconds while visible and active
    vi.advanceTimersByTime(5000);

    expect(tracker.getEngagementTimeMs()).toBe(5000);

    // Hide the tab
    doc.setVisibilityState("hidden");
    doc.dispatch("visibilitychange");

    // Advance 10 seconds while hidden
    vi.advanceTimersByTime(10000);

    // Time should not have increased
    expect(tracker.getEngagementTimeMs()).toBe(5000);

    tracker.destroy();
  });

  it("activity is detected via scroll, click, keydown, and mousemove events", () => {
    const doc = installDocument();
    const tracker = createEngagementTracker();

    // Check handlers are registered
    expect(doc.getHandlerCount("scroll")).toBeGreaterThan(0);
    expect(doc.getHandlerCount("click")).toBeGreaterThan(0);
    expect(doc.getHandlerCount("keydown")).toBeGreaterThan(0);
    expect(doc.getHandlerCount("mousemove")).toBeGreaterThan(0);

    // Each activity type should reset idle timer
    doc.dispatch("scroll");
    vi.advanceTimersByTime(1000);
    expect(tracker.getEngagementTimeMs()).toBe(1000);

    doc.dispatch("click");
    vi.advanceTimersByTime(1000);
    expect(tracker.getEngagementTimeMs()).toBe(2000);

    doc.dispatch("keydown");
    vi.advanceTimersByTime(1000);
    expect(tracker.getEngagementTimeMs()).toBe(3000);

    doc.dispatch("mousemove");
    vi.advanceTimersByTime(1000);
    expect(tracker.getEngagementTimeMs()).toBe(4000);

    tracker.destroy();
  });

  it("visibilitychange event pauses/resumes tracking correctly", () => {
    const doc = installDocument();
    const tracker = createEngagementTracker();

    doc.dispatch("mousemove");
    vi.advanceTimersByTime(2000);
    expect(tracker.getEngagementTimeMs()).toBe(2000);

    // Hide tab
    doc.setVisibilityState("hidden");
    doc.dispatch("visibilitychange");
    vi.advanceTimersByTime(5000);
    expect(tracker.getEngagementTimeMs()).toBe(2000);

    // Show tab again
    doc.setVisibilityState("visible");
    doc.dispatch("visibilitychange");
    doc.dispatch("mousemove"); // Activity resumes tracking
    vi.advanceTimersByTime(3000);
    expect(tracker.getEngagementTimeMs()).toBe(5000);

    tracker.destroy();
  });

  it("idle timeout of 30 seconds stops time accumulation", () => {
    const doc = installDocument();
    const tracker = createEngagementTracker();

    // Initial activity
    doc.dispatch("mousemove");
    vi.advanceTimersByTime(5000);
    expect(tracker.getEngagementTimeMs()).toBe(5000);

    // No activity for 30 seconds - time accumulates until idle threshold
    vi.advanceTimersByTime(30000);
    // After 30s of no activity from the last activity at t=5s,
    // we're now at t=35s, but idle started at t=35s (5s + 30s timeout)
    // So we should have accumulated from t=0 to t=35s = 35s,
    // but actually idle kicks in 30s after last activity
    // Last activity was at t=5s, so idle at t=35s means we tracked 5s + ~30s
    // Due to tick interval, accumulated time is approximately 30s (29.9s)
    // The tracker stops counting when idle, which happens ~30s after last activity
    expect(tracker.getEngagementTimeMs()).toBeGreaterThanOrEqual(29900);
    expect(tracker.getEngagementTimeMs()).toBeLessThanOrEqual(35100);

    const timeAtIdle = tracker.getEngagementTimeMs();

    // More time passes while idle - no accumulation
    vi.advanceTimersByTime(10000);
    expect(tracker.getEngagementTimeMs()).toBe(timeAtIdle);

    // Activity resumes
    doc.dispatch("mousemove");
    vi.advanceTimersByTime(5000);
    expect(tracker.getEngagementTimeMs()).toBe(timeAtIdle + 5000);

    tracker.destroy();
  });

  it("reset() clears accumulated time", () => {
    const doc = installDocument();
    const tracker = createEngagementTracker();

    doc.dispatch("mousemove");
    vi.advanceTimersByTime(5000);
    expect(tracker.getEngagementTimeMs()).toBe(5000);

    tracker.reset();
    expect(tracker.getEngagementTimeMs()).toBe(0);

    tracker.destroy();
  });

  it("destroy() removes all event listeners", () => {
    const doc = installDocument();
    const tracker = createEngagementTracker();

    // Listeners should be registered
    expect(doc.getHandlerCount("scroll")).toBeGreaterThan(0);

    tracker.destroy();

    // Listeners should be removed
    expect(doc.getHandlerCount("scroll")).toBe(0);
    expect(doc.getHandlerCount("click")).toBe(0);
    expect(doc.getHandlerCount("keydown")).toBe(0);
    expect(doc.getHandlerCount("mousemove")).toBe(0);
    expect(doc.getHandlerCount("visibilitychange")).toBe(0);
  });

  it("handles SSR gracefully (returns 0 when document undefined)", () => {
    // Remove document
    const originalDocument = globalThis.document;
    // @ts-expect-error testing undefined
    delete globalThis.document;

    const tracker = createEngagementTracker();
    expect(tracker.getEngagementTimeMs()).toBe(0);

    tracker.destroy();

    // Restore
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", {
        value: originalDocument,
        configurable: true,
      });
    }
  });
});
