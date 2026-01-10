const IDLE_TIMEOUT_MS = 30 * 1000; // 30 seconds
const TICK_INTERVAL_MS = 100; // Check every 100ms

export interface EngagementTracker {
  getEngagementTimeMs(): number;
  reset(): void;
  destroy(): void;
}

export function createEngagementTracker(): EngagementTracker {
  // SSR guard
  if (typeof document === "undefined" || typeof window === "undefined") {
    return {
      getEngagementTimeMs: () => 0,
      reset: () => {},
      destroy: () => {},
    };
  }

  let totalEngagementMs = 0;
  let lastTickTime = Date.now();
  let lastActivityTime = Date.now();
  let isVisible = document.visibilityState === "visible";
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  function onActivity() {
    lastActivityTime = Date.now();
  }

  function onVisibilityChange() {
    isVisible = document.visibilityState === "visible";
    if (isVisible) {
      // Reset tick time when becoming visible to avoid counting hidden time
      lastTickTime = Date.now();
    }
  }

  function tick() {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;
    const isActive = timeSinceLastActivity < IDLE_TIMEOUT_MS;

    if (isVisible && isActive) {
      totalEngagementMs += now - lastTickTime;
    }

    lastTickTime = now;
  }

  // Register activity listeners with passive option for performance
  const activityEvents = ["scroll", "click", "keydown", "mousemove"] as const;
  for (const event of activityEvents) {
    window.addEventListener(event, onActivity, { passive: true });
  }

  // Register visibility listener
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Start tick interval
  tickInterval = setInterval(tick, TICK_INTERVAL_MS);

  return {
    getEngagementTimeMs(): number {
      // Run a final tick to get up-to-date value
      tick();
      return totalEngagementMs;
    },

    reset(): void {
      totalEngagementMs = 0;
      lastTickTime = Date.now();
      lastActivityTime = Date.now();
    },

    destroy(): void {
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }

      // Guard for SSR or edge cases where window/document become undefined
      if (typeof window !== "undefined") {
        for (const event of activityEvents) {
          window.removeEventListener(event, onActivity);
        }
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    },
  };
}
