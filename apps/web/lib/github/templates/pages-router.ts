export type RenderAnalyticsTemplateOptions = {
  projectId: string;
  eventsUrl: string;
};

export function renderPagesRouterAnalyticsHook(options: RenderAnalyticsTemplateOptions): string {
  const eventsUrl = new URL("/v1/track", options.eventsUrl).toString().replace(/\/$/, "");

  return `// GENERATED FILE: components/tally-analytics.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const PROJECT_ID = '${options.projectId}';
const EVENTS_URL = '${eventsUrl}';

let isInitialized = false;
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  if (sessionId) return sessionId;

  const cookieName = 'tally_sid';
  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(cookieName + '='))
    ?.split('=')[1];

  if (existing) {
    sessionId = existing;
    return sessionId;
  }

  sessionId = crypto.randomUUID();
  document.cookie = \`\${cookieName}=\${sessionId}; max-age=31536000; path=/; samesite=lax\`;
  return sessionId;
}

function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  if (navigator.doNotTrack === '1') return;

  const event = {
    project_id: PROJECT_ID,
    session_id: getSessionId(),
    event_type: 'page_view',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    path,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
  };

  fetch(EVENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => {});
}

export function useTallyAnalytics() {
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      fetch(EVENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            project_id: PROJECT_ID,
            session_id: getSessionId(),
            event_type: 'session_start',
            timestamp: new Date().toISOString(),
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          }],
        }),
        keepalive: true,
      }).catch(() => {});
    }

    const handler = (url: string) => trackPageView(url);
    router.events.on('routeChangeComplete', handler);
    trackPageView(router.asPath);

    return () => {
      router.events.off('routeChangeComplete', handler);
    };
  }, [router]);
}
`;
}

