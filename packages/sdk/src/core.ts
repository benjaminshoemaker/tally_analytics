import type { AnalyticsEvent, InitOptions } from "./types";
import { getOrCreateSessionId } from "./session";
import {
  createPageViewEvent,
  createSessionStartEvent,
  postEvents,
} from "./tracker";

const EVENTS_URL = "https://events.productname.com/v1/track";

type SDKConfig = {
  projectId: string;
  respectDNT: boolean;
  debug: boolean;
};

let config: SDKConfig | null = null;
let identifiedUserId: string | null = null;
let sessionStartTracked = false;

export function init(options: InitOptions) {
  config = {
    projectId: options.projectId,
    respectDNT: options.respectDNT ?? true,
    debug: options.debug ?? false,
  };
  identifiedUserId = null;
  sessionStartTracked = false;
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

export async function trackPageView(path?: string): Promise<void> {
  if (!config) return;
  if (!isEnabled()) return;

  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  const events: AnalyticsEvent[] = [];

  if (!sessionStartTracked) {
    sessionStartTracked = true;
    events.push(
      createSessionStartEvent({
        projectId: config.projectId,
        sessionId,
        userId: identifiedUserId ?? undefined,
      }),
    );
  }

  events.push(
    createPageViewEvent({
      projectId: config.projectId,
      sessionId,
      path: path ?? getCurrentPath(),
      userId: identifiedUserId ?? undefined,
    }),
  );

  await postEvents(EVENTS_URL, events, { respectDNT: config.respectDNT });
}

