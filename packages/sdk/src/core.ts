import type { AnalyticsEvent, InitOptions } from "./types";
import { getOrCreateSessionId } from "./session";
import {
  createPageViewEvent,
  createSessionStartEvent,
  postEvents,
} from "./tracker";
import { createEngagementTracker, type EngagementTracker } from "./engagement";
import { createScrollTracker, type ScrollTracker } from "./scroll";
import { getOrCreateVisitorId, type VisitorIdResult } from "./visitor";
import { captureUTMParams, type UTMParams } from "./utm";
import { setupCTATracking, type CTATracker } from "./cta";

const EVENTS_URL = "https://events.usetally.xyz/v1/track";

type SDKConfig = {
  projectId: string;
  respectDNT: boolean;
  debug: boolean;
};

let config: SDKConfig | null = null;
let identifiedUserId: string | null = null;
let sessionStartTracked = false;

// V2 tracking modules
let engagementTracker: EngagementTracker | null = null;
let scrollTracker: ScrollTracker | null = null;
let ctaTracker: CTATracker | null = null;
let visitorData: VisitorIdResult | null = null;
let utmParams: UTMParams | null = null;

function cleanupV2Modules() {
  if (engagementTracker) {
    engagementTracker.destroy();
    engagementTracker = null;
  }
  if (scrollTracker) {
    scrollTracker.destroy();
    scrollTracker = null;
  }
  if (ctaTracker) {
    ctaTracker.destroy();
    ctaTracker = null;
  }
  visitorData = null;
  utmParams = null;
}

function initV2Modules() {
  // Only initialize if DNT is not enabled
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1" && config?.respectDNT) {
    return;
  }

  // Initialize engagement and scroll trackers
  engagementTracker = createEngagementTracker();
  scrollTracker = createScrollTracker();
  ctaTracker = setupCTATracking();

  // Capture visitor ID and UTM params (one-time on init)
  visitorData = getOrCreateVisitorId();
  utmParams = captureUTMParams();

  // Register unload handlers to send final page data
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", sendFinalPageData);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
}

function onVisibilityChange() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    sendFinalPageData();
  }
}

function sendFinalPageData() {
  if (!config || !isEnabled()) return;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  const event = createPageViewEventWithV2Data({
    projectId: config.projectId,
    sessionId,
    path: getCurrentPath(),
    userId: identifiedUserId ?? undefined,
  });

  // Use sendBeacon for reliability during unload
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const url = EVENTS_URL;
    const data = JSON.stringify({ events: [event] });
    navigator.sendBeacon(url, data);
  }
}

export function init(options: InitOptions) {
  // Cleanup any previous initialization
  cleanupV2Modules();

  config = {
    projectId: options.projectId,
    respectDNT: options.respectDNT ?? true,
    debug: options.debug ?? false,
  };
  identifiedUserId = null;
  sessionStartTracked = false;

  // Initialize V2 tracking modules
  initV2Modules();
}

export function identify(userId: string) {
  if (typeof window === "undefined") return;
  identifiedUserId = userId;
}

export function isEnabled(): boolean {
  if (!config) return false;
  if (typeof window === "undefined") return false;

  if (
    config.respectDNT &&
    typeof navigator !== "undefined" &&
    navigator.doNotTrack === "1"
  ) {
    return false;
  }

  return true;
}

function getCurrentPath(): string {
  if (typeof window === "undefined") return "";
  const { pathname, search } = window.location;
  return `${pathname}${search ?? ""}`;
}

function createPageViewEventWithV2Data(options: {
  projectId: string;
  sessionId: string;
  path: string;
  userId?: string;
}): AnalyticsEvent {
  const baseEvent = createPageViewEvent(options);

  // Add V2 metrics
  return {
    ...baseEvent,
    engagement_time_ms: engagementTracker?.getEngagementTimeMs() ?? 0,
    scroll_depth: scrollTracker?.getMaxScrollDepth() ?? 0,
    cta_clicks: ctaTracker ? JSON.stringify(ctaTracker.getAndClearClicks()) : "[]",
  };
}

function createSessionStartEventWithV2Data(options: {
  projectId: string;
  sessionId: string;
  userId?: string;
}): AnalyticsEvent {
  const baseEvent = createSessionStartEvent(options);

  // Add V2 attribution data
  return {
    ...baseEvent,
    visitor_id: visitorData?.visitorId,
    is_returning: visitorData?.isReturning ? 1 : 0,
    utm_source: utmParams?.utm_source,
    utm_medium: utmParams?.utm_medium,
    utm_campaign: utmParams?.utm_campaign,
    utm_term: utmParams?.utm_term,
    utm_content: utmParams?.utm_content,
  };
}

export async function trackPageView(path?: string): Promise<void> {
  if (!config) return;
  if (!isEnabled()) return;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  const events: AnalyticsEvent[] = [];

  if (!sessionStartTracked) {
    sessionStartTracked = true;
    events.push(
      createSessionStartEventWithV2Data({
        projectId: config.projectId,
        sessionId,
        userId: identifiedUserId ?? undefined,
      }),
    );
  }

  events.push(
    createPageViewEventWithV2Data({
      projectId: config.projectId,
      sessionId,
      path: path ?? getCurrentPath(),
      userId: identifiedUserId ?? undefined,
    }),
  );

  await postEvents(EVENTS_URL, events, { respectDNT: config.respectDNT });

  // Reset trackers for next page view
  engagementTracker?.reset();
  scrollTracker?.reset();
}
