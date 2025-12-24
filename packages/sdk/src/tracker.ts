import type { AnalyticsEvent } from "./types";

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1";
}

export async function postEvents(
  eventsUrl: string,
  events: AnalyticsEvent[],
  options?: { respectDNT?: boolean },
): Promise<void> {
  if (!events.length) return;
  if (typeof fetch === "undefined") return;
  const respectDNT = options?.respectDNT ?? true;
  if (respectDNT && isDoNotTrackEnabled()) return;

  try {
    await fetch(eventsUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Silently fail - analytics should never break the app
  }
}

export function createPageViewEvent(options: {
  projectId: string;
  sessionId: string;
  path: string;
  userId?: string;
}): AnalyticsEvent {
  const url =
    typeof window === "undefined" ? undefined : window.location.href || undefined;
  const referrer =
    typeof document === "undefined"
      ? undefined
      : document.referrer || undefined;

  return {
    project_id: options.projectId,
    session_id: options.sessionId,
    event_type: "page_view",
    timestamp: new Date().toISOString(),
    url,
    path: options.path,
    referrer,
    user_id: options.userId,
  };
}

export function createSessionStartEvent(options: {
  projectId: string;
  sessionId: string;
  userId?: string;
}): AnalyticsEvent {
  const url =
    typeof window === "undefined" ? undefined : window.location.href || undefined;
  const referrer =
    typeof document === "undefined"
      ? undefined
      : document.referrer || undefined;

  return {
    project_id: options.projectId,
    session_id: options.sessionId,
    event_type: "session_start",
    timestamp: new Date().toISOString(),
    url,
    referrer,
    user_id: options.userId,
  };
}
