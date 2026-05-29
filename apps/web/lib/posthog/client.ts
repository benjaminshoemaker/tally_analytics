'use client';

import posthog from 'posthog-js';

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const PRODUCTION_HOST = 'usetally.xyz';

export type PostHogEventProperties = Record<string, string | number | boolean | null | undefined>;

let initialized = false;

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function appEnvironment(): 'production' | 'development' {
  if (typeof window === 'undefined') return 'development';
  const hostname = window.location.hostname;
  return hostname === PRODUCTION_HOST || hostname === `www.${PRODUCTION_HOST}` ? 'production' : 'development';
}

function cleanProperties(properties: PostHogEventProperties = {}): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined,
    ),
  );
}

function isPostHogEnabled(): boolean {
  return typeof window !== 'undefined' && Boolean(POSTHOG_KEY) && !isLocalHostname(window.location.hostname);
}

export function ensurePostHogInitialized(): boolean {
  if (initialized) return true;
  if (!isPostHogEnabled()) return false;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-01-30',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    loaded: (client) => {
      if (process.env.NODE_ENV === 'development') {
        client.debug();
      }
    },
  });
  initialized = true;
  return true;
}

export function capturePostHogPageview(currentUrl: string): void {
  if (!ensurePostHogInitialized()) return;

  posthog.capture('$pageview', {
    $current_url: currentUrl,
    app_environment: appEnvironment(),
  });
}

export function identifyPostHogUser(user: {
  id: string;
  email?: string | null;
  githubUsername?: string | null;
}): void {
  if (!ensurePostHogInitialized()) return;

  posthog.identify(
    user.id,
    cleanProperties({
      email: user.email ?? undefined,
      github_username: user.githubUsername ?? undefined,
      app_environment: appEnvironment(),
    }),
  );
}

export function trackPostHogEvent(eventName: string, properties?: PostHogEventProperties): void {
  if (!ensurePostHogInitialized()) return;

  posthog.capture(eventName, {
    ...cleanProperties(properties),
    app_environment: appEnvironment(),
  });
}
