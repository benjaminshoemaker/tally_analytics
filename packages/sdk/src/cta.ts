const MAX_TEXT_LENGTH = 30;

// CTA selectors to match
const CTA_SELECTORS = [
  'button[type="submit"]',
  'a[href*="signup"]',
  'a[href*="register"]',
  'a[href*="pricing"]',
  'a[href*="demo"]',
  'a[href*="trial"]',
  'a[href*="contact"]',
  'a[href*="get-started"]',
  "[data-tally-cta]",
] as const;

export interface CTAClick {
  elementType: "button" | "link" | "other";
  text: string;
  domain?: string;
}

export interface CTATracker {
  getAndClearClicks(): CTAClick[];
  destroy(): void;
}

function getElementType(el: Element): "button" | "link" | "other" {
  const tagName = el.tagName.toUpperCase();
  if (tagName === "BUTTON") return "button";
  if (tagName === "A") return "link";
  return "other";
}

function extractDomain(href: string): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return url.hostname;
  } catch {
    return undefined;
  }
}

function truncateText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}

function matchesCTASelector(el: Element): boolean {
  for (const selector of CTA_SELECTORS) {
    try {
      if (el.matches(selector)) return true;
    } catch {
      // Invalid selector or element doesn't support matches
    }
  }
  return false;
}

function isElement(target: unknown): target is Element {
  return (
    target !== null &&
    typeof target === "object" &&
    "tagName" in target &&
    "matches" in target &&
    typeof (target as Element).matches === "function"
  );
}

function findCTAElement(target: EventTarget | null): Element | null {
  if (!isElement(target)) return null;

  // Check if the clicked element matches
  if (matchesCTASelector(target)) return target;

  // Check ancestors
  for (const selector of CTA_SELECTORS) {
    try {
      const ancestor = target.closest(selector);
      if (ancestor) return ancestor;
    } catch {
      // Invalid selector
    }
  }

  return null;
}

export function setupCTATracking(): CTATracker {
  // SSR guard
  if (typeof window === "undefined") {
    return {
      getAndClearClicks: () => [],
      destroy: () => {},
    };
  }

  const clickQueue: CTAClick[] = [];

  function onClick(event: Event) {
    const ctaElement = findCTAElement(event.target);
    if (!ctaElement) return;

    const elementType = getElementType(ctaElement);
    const text = truncateText(ctaElement.textContent ?? "");
    const href = ctaElement.getAttribute("href") ?? "";
    const domain = extractDomain(href);

    clickQueue.push({
      elementType,
      text,
      domain,
    });
  }

  // Use capture phase to catch events before they might be stopped
  window.addEventListener("click", onClick, { capture: true });

  return {
    getAndClearClicks(): CTAClick[] {
      const clicks = [...clickQueue];
      clickQueue.length = 0;
      return clicks;
    },

    destroy(): void {
      if (typeof window !== "undefined") {
        window.removeEventListener("click", onClick, { capture: true });
      }
    },
  };
}
