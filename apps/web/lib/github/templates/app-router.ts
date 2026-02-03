export type RenderAnalyticsTemplateOptions = {
  projectId: string;
  eventsUrl: string;
};

export function renderAppRouterAnalyticsComponent(options: RenderAnalyticsTemplateOptions): string {
  const eventsUrl = new URL("/v1/track", options.eventsUrl).toString().replace(/\/$/, "");

  return `// GENERATED FILE: components/fast-pr-analytics.tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const PROJECT_ID = '${options.projectId}';
const EVENTS_URL = '${eventsUrl}';

const COOKIE_MAX_AGE_SECONDS = 31536000;
const IDLE_TIMEOUT_MS = 30000;
const TICK_INTERVAL_MS = 100;
const MAX_UTM_LENGTH = 100;
const MAX_CTA_TEXT_LENGTH = 30;

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const CTA_SELECTORS = [
  'button[type="submit"]',
  'a[href*="signup"]',
  'a[href*="register"]',
  'a[href*="pricing"]',
  'a[href*="demo"]',
  'a[href*="trial"]',
  'a[href*="contact"]',
  'a[href*="get-started"]',
  '[data-tally-cta]',
];

let isInitialized = false;
let sessionId: string | null = null;
let engagementTracker: ReturnType<typeof createEngagementTracker> | null = null;
let scrollTracker: ReturnType<typeof createScrollTracker> | null = null;
let ctaTracker: ReturnType<typeof setupCTATracking> | null = null;
let visitorData: { visitorId: string; isReturning: boolean } | null = null;
let utmParams: Record<string, string | undefined> | null = null;

function isDntEnabled(): boolean {
  return typeof navigator !== 'undefined' && navigator.doNotTrack === '1';
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = name + '=';
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(prefix))
    ?.slice(prefix.length);

  return cookie ?? null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = name + '=' + value + '; max-age=' + COOKIE_MAX_AGE_SECONDS + '; path=/; SameSite=Lax' + secure;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  if (sessionId) return sessionId;

  const existing = getCookie('tally_sid');
  if (existing) {
    sessionId = existing;
    return sessionId;
  }

  sessionId = crypto.randomUUID();
  setCookie('tally_sid', sessionId);
  return sessionId;
}

function getOrCreateVisitorId(): { visitorId: string; isReturning: boolean } | null {
  if (typeof document === 'undefined') return null;

  const existing = getCookie('tally_vid');
  if (existing) {
    return { visitorId: existing, isReturning: true };
  }

  const visitorId = crypto.randomUUID();
  setCookie('tally_vid', visitorId);

  return { visitorId, isReturning: false };
}

function captureUTMParams(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {};
  const searchParams = new URLSearchParams(window.location.search);
  const result: Record<string, string | undefined> = {};

  for (const param of UTM_PARAMS) {
    const value = searchParams.get(param);
    if (value) {
      result[param] = value.slice(0, MAX_UTM_LENGTH);
    }
  }

  return result;
}

function createEngagementTracker() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      getEngagementTimeMs: () => 0,
      reset: () => {},
      destroy: () => {},
    };
  }

  let totalEngagementMs = 0;
  let lastTickTime = Date.now();
  let lastActivityTime = Date.now();
  let isVisible = document.visibilityState === 'visible';
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  function onActivity() {
    lastActivityTime = Date.now();
  }

  function onVisibilityChange() {
    isVisible = document.visibilityState === 'visible';
    if (isVisible) {
      lastTickTime = Date.now();
    }
  }

  function tick() {
    const now = Date.now();
    const isActive = now - lastActivityTime < IDLE_TIMEOUT_MS;

    if (isVisible && isActive) {
      totalEngagementMs += now - lastTickTime;
    }

    lastTickTime = now;
  }

  const activityEvents = ['scroll', 'click', 'keydown', 'mousemove'];
  for (const event of activityEvents) {
    window.addEventListener(event, onActivity, { passive: true });
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  tickInterval = setInterval(tick, TICK_INTERVAL_MS);

  return {
    getEngagementTimeMs(): number {
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

      if (typeof window !== 'undefined') {
        for (const event of activityEvents) {
          window.removeEventListener(event, onActivity);
        }
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    },
  };
}

function createScrollTracker() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      getMaxScrollDepth: () => 0,
      reset: () => {},
      destroy: () => {},
    };
  }

  let maxScrollDepth = 0;

  function calculateScrollDepth(): number {
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const viewportHeight = window.innerHeight;
    const scrollableHeight = docHeight - viewportHeight;

    if (scrollableHeight <= 0) return 100;

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

  window.addEventListener('scroll', onScroll, { passive: true });
  maxScrollDepth = calculateScrollDepth();

  return {
    getMaxScrollDepth(): number {
      return maxScrollDepth;
    },
    reset(): void {
      maxScrollDepth = 0;
    },
    destroy(): void {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', onScroll);
      }
    },
  };
}

function getElementType(el: Element): 'button' | 'link' | 'other' {
  const tagName = el.tagName.toUpperCase();
  if (tagName === 'BUTTON') return 'button';
  if (tagName === 'A') return 'link';
  return 'other';
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
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.slice(0, MAX_CTA_TEXT_LENGTH);
}

function matchesCTASelector(el: Element): boolean {
  for (const selector of CTA_SELECTORS) {
    try {
      if (el.matches(selector)) return true;
    } catch {
      // ignore invalid selectors
    }
  }
  return false;
}

function isElement(target: unknown): target is Element {
  return (
    target !== null &&
    typeof target === 'object' &&
    'tagName' in target &&
    'matches' in target &&
    typeof (target as Element).matches === 'function'
  );
}

function findCTAElement(target: EventTarget | null): Element | null {
  if (!isElement(target)) return null;
  if (matchesCTASelector(target)) return target;

  for (const selector of CTA_SELECTORS) {
    try {
      const ancestor = target.closest(selector);
      if (ancestor) return ancestor;
    } catch {
      // ignore invalid selectors
    }
  }

  return null;
}

function setupCTATracking() {
  if (typeof window === 'undefined') {
    return {
      getAndClearClicks: () => [],
      destroy: () => {},
    };
  }

  const clickQueue: Array<{ elementType: string; text: string; domain?: string }> = [];

  function onClick(event: Event) {
    const ctaElement = findCTAElement(event.target);
    if (!ctaElement) return;

    const elementType = getElementType(ctaElement);
    const text = truncateText(ctaElement.textContent ?? '');
    const href = ctaElement.getAttribute('href') ?? '';
    const domain = extractDomain(href);

    clickQueue.push({ elementType, text, domain });
  }

  window.addEventListener('click', onClick, { capture: true });

  return {
    getAndClearClicks() {
      const clicks = [...clickQueue];
      clickQueue.length = 0;
      return clicks;
    },
    destroy(): void {
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', onClick, { capture: true });
      }
    },
  };
}

function initializeV2Tracking() {
  if (isDntEnabled()) return;
  engagementTracker = createEngagementTracker();
  scrollTracker = createScrollTracker();
  ctaTracker = setupCTATracking();
  visitorData = getOrCreateVisitorId();
  utmParams = captureUTMParams();

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', sendFinalPageMetrics);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
}

function onVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    sendFinalPageMetrics();
  }
}

function getCurrentPath(): string {
  if (typeof window === 'undefined') return '';
  const { pathname, search } = window.location;
  return pathname + (search ?? '');
}

function createSessionStartEvent() {
  return {
    project_id: PROJECT_ID,
    session_id: getSessionId(),
    event_type: 'session_start',
    timestamp: new Date().toISOString(),
    url: typeof window === 'undefined' ? undefined : window.location.href,
    referrer: typeof document === 'undefined' ? null : document.referrer || null,
    user_agent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    visitor_id: visitorData?.visitorId,
    is_returning: visitorData ? (visitorData.isReturning ? 1 : 0) : undefined,
    utm_source: utmParams?.utm_source,
    utm_medium: utmParams?.utm_medium,
    utm_campaign: utmParams?.utm_campaign,
    utm_term: utmParams?.utm_term,
    utm_content: utmParams?.utm_content,
  };
}

function createPageViewEvent(path: string) {
  return {
    project_id: PROJECT_ID,
    session_id: getSessionId(),
    event_type: 'page_view',
    timestamp: new Date().toISOString(),
    url: typeof window === 'undefined' ? undefined : window.location.href,
    path,
    referrer: typeof document === 'undefined' ? null : document.referrer || null,
    user_agent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    screen_width: typeof window === 'undefined' ? undefined : window.innerWidth,
    engagement_time_ms: engagementTracker?.getEngagementTimeMs() ?? 0,
    scroll_depth: scrollTracker?.getMaxScrollDepth() ?? 0,
    cta_clicks: ctaTracker ? JSON.stringify(ctaTracker.getAndClearClicks()) : '[]',
  };
}

function sendEvents(events: unknown[], useBeacon?: boolean) {
  if (typeof window === 'undefined') return;
  if (isDntEnabled()) return;

  const payload = JSON.stringify({ events });

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(EVENTS_URL, payload);
    return;
  }

  fetch(EVENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  if (isDntEnabled()) return;

  const event = createPageViewEvent(path);
  sendEvents([event]);

  engagementTracker?.reset();
  scrollTracker?.reset();
}

function sendFinalPageMetrics() {
  if (!isInitialized) return;
  if (typeof window === 'undefined') return;
  if (isDntEnabled()) return;

  const event = createPageViewEvent(getCurrentPath());
  sendEvents([event], true);
}

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      initializeV2Tracking();
      sendEvents([createSessionStartEvent()]);
    }

    const search = searchParams.toString();
    const path = pathname + (search ? '?' + search : '');
    trackPageView(path);
  }, [pathname, searchParams]);

  return null;
}

export function FastPrAnalytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
`;
}
