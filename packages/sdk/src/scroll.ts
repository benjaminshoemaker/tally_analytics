export interface ScrollTracker {
  getMaxScrollDepth(): number;
  reset(): void;
  destroy(): void;
}

export function createScrollTracker(): ScrollTracker {
  // SSR guard
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      getMaxScrollDepth: () => 0,
      reset: () => {},
      destroy: () => {},
    };
  }

  let maxScrollDepth = 0;

  function calculateScrollDepth(): number {
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const viewportHeight = window.innerHeight;
    const scrollableHeight = docHeight - viewportHeight;

    // If page fits in viewport, consider it 100% scrolled
    if (scrollableHeight <= 0) {
      return 100;
    }

    const scrollTop = window.scrollY;
    const percentage = Math.round((scrollTop / scrollableHeight) * 100);

    return Math.min(100, Math.max(0, percentage));
  }

  function onScroll() {
    const currentDepth = calculateScrollDepth();
    if (currentDepth > maxScrollDepth) {
      maxScrollDepth = currentDepth;
    }
  }

  // Register scroll listener with passive option for performance
  window.addEventListener("scroll", onScroll, { passive: true });

  // Check initial scroll position
  maxScrollDepth = calculateScrollDepth();

  return {
    getMaxScrollDepth(): number {
      return maxScrollDepth;
    },

    reset(): void {
      maxScrollDepth = 0;
    },

    destroy(): void {
      window.removeEventListener("scroll", onScroll);
    },
  };
}
