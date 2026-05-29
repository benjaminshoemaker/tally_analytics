'use client';

import { useEffect, useState } from 'react';
import { AnalyticsAppRouter, init } from '@tally-analytics/sdk';

const FALLBACK_DOGFOOD_PROJECT_ID = 'proj_76jzxBzq6mdXcXy';
const CONFIGURED_PROJECT_ID =
  process.env.NEXT_PUBLIC_TALLY_PROJECT_ID ??
  (process.env.NODE_ENV === 'production' ? FALLBACK_DOGFOOD_PROJECT_ID : '');
const PRODUCTION_HOST = 'usetally.xyz';

let analyticsInitialized = false;

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function dogfoodEnvironment(hostname: string) {
  return hostname === PRODUCTION_HOST || hostname === `www.${PRODUCTION_HOST}`
    ? 'production'
    : 'development';
}

export function TallyAnalytics() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (analyticsInitialized) {
      setReady(true);
      return;
    }

    const hostname = window.location.hostname;
    if (!CONFIGURED_PROJECT_ID || isLocalHostname(hostname)) return;

    init({
      projectId: CONFIGURED_PROJECT_ID,
      eventsUrl: process.env.NEXT_PUBLIC_TALLY_EVENTS_URL,
      environment: dogfoodEnvironment(hostname),
    });
    analyticsInitialized = true;
    setReady(true);
  }, []);

  return ready ? <AnalyticsAppRouter /> : null;
}
