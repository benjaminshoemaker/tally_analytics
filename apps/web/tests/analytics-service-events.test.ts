import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  boundAnalyticsString,
  getEventSchema,
  listEvents,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsUrl,
} from '../lib/analytics/service';

let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock('../lib/db/queries/projects', () => ({
  getOwnedAnalyticsProject: (...args: unknown[]) => {
    if (!getOwnedAnalyticsProjectSpy) throw new Error('getOwnedAnalyticsProjectSpy not initialized');
    return getOwnedAnalyticsProjectSpy(...args);
  },
}));

function writeFixture(root: string): void {
  const scenarioDir = path.join(root, 'analytics-service-events');
  fs.mkdirSync(scenarioDir, { recursive: true });
  fs.writeFileSync(
    path.join(scenarioDir, 'events.json'),
    `${JSON.stringify(
      {
        scenarioId: 'analytics-service-events',
        events: [
          {
            project_id: 'proj_events',
            session_id: 'sess_001',
            event_type: 'session_start',
            timestamp: '2026-05-01T12:00:00.000Z',
            path: '/',
            visitor_id: 'visitor_001',
            user_id: 'user_private_001',
          },
          {
            project_id: 'proj_events',
            session_id: 'sess_001',
            event_type: 'page_view',
            timestamp: '2026-05-01T12:00:10.000Z',
            path: '/pricing?token=secret',
            referrer: 'https://google.com/search?q=tally#private',
            visitor_id: 'visitor_001',
            user_id: 'user_private_001',
            utm_source: 'google',
            engagement_time_ms: 18000,
            scroll_depth: 70,
            cta_clicks: '["pricing_signup"]',
          },
          {
            project_id: 'proj_events',
            session_id: 'sess_001',
            event_type: 'signup_started',
            timestamp: '2026-05-01T12:01:00.000Z',
            path: '/signup',
            visitor_id: 'visitor_001',
          },
          {
            project_id: 'proj_events',
            session_id: 'sess_001',
            event_type: 'signup_completed',
            timestamp: '2026-05-01T12:02:00.000Z',
            path: '/signup?email=private@example.com',
            visitor_id: 'visitor_001',
            user_id: 'user_private_001',
            plan: 'free',
            signup_method: 'email',
            experiment: 'x'.repeat(180),
          },
          {
            project_id: 'proj_events',
            session_id: 'sess_002',
            event_type: 'signup_completed',
            timestamp: '2026-05-01T12:03:00.000Z',
            path: '/signup',
            visitor_id: 'visitor_002',
            plan: 'pro',
            signup_method: 'github',
          },
          {
            project_id: 'proj_events',
            session_id: 'sess_003',
            event_type: 'signup_completed',
            timestamp: '2026-05-01T12:04:00.000Z',
            path: '/signup',
            visitor_id: 'visitor_003',
            plan: 'team',
            signup_method: 'google',
          },
          {
            project_id: 'proj_events',
            session_id: 'sess_004',
            event_type: 'signup_completed',
            timestamp: '2026-05-01T12:05:00.000Z',
            path: '/signup',
            visitor_id: 'visitor_004',
            plan: 'enterprise',
            signup_method: 'sso',
          },
        ],
      },
      null,
      2
    )}\n`
  );
}

describe('analytics event discovery services', () => {
  let fixtureDir: string;
  let previousFixtureDir: string | undefined;
  let previousTestMode: string | undefined;

  beforeEach(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpa-event-service-'));
    writeFixture(fixtureDir);
    previousFixtureDir = process.env.E2E_ANALYTICS_FIXTURE_DIR;
    previousTestMode = process.env.E2E_TEST_MODE;
    process.env.E2E_ANALYTICS_FIXTURE_DIR = fixtureDir;
    process.env.E2E_TEST_MODE = '1';
    getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue({
      id: 'proj_events',
      displayName: 'Event Demo',
      source: 'mcp_codex',
      status: 'active',
      lastEventAt: null,
      mcpRepoName: 'event-demo',
      mcpAppRoot: '.',
      mcpPackageManager: 'pnpm',
      dashboardUrls: {
        project: 'https://usetally.xyz/projects/proj_events',
        overview: 'https://usetally.xyz/projects/proj_events/overview',
        live: 'https://usetally.xyz/projects/proj_events/live',
        sessions: 'https://usetally.xyz/projects/proj_events/sessions',
      },
    });
  });

  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    if (previousFixtureDir === undefined) delete process.env.E2E_ANALYTICS_FIXTURE_DIR;
    else process.env.E2E_ANALYTICS_FIXTURE_DIR = previousFixtureDir;
    if (previousTestMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = previousTestMode;
  });

  it('lists observed custom event names, counts, timestamps, and safe common properties', async () => {
    const result = await listEvents({
      userId: 'u1',
      projectId: 'proj_events',
      period: '30d',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'ok',
      events: [
        {
          eventName: 'signup_completed',
          count: 4,
          firstSeenAt: '2026-05-01T12:02:00.000Z',
          lastSeenAt: '2026-05-01T12:05:00.000Z',
          commonProperties: expect.arrayContaining(['path', 'plan', 'signupMethod']),
        },
        { eventName: 'page_view', count: 1 },
        { eventName: 'session_start', count: 1 },
        { eventName: 'signup_started', count: 1 },
      ],
      provenance: {
        projectName: 'Event Demo',
        queryBasis: { tool: 'list_events', semantics: 'event_discovery' },
      },
    });
    expect(JSON.stringify(result)).not.toContain('visitorId');
    expect(JSON.stringify(result)).not.toContain('userId');
  });

  it('returns no_events when a project has no observed event names', async () => {
    const result = await listEvents({
      userId: 'u1',
      projectId: 'proj_empty',
      period: '30d',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'no_events',
      events: [],
    });
  });

  it('returns safe event schema properties with bounded examples and no raw identifiers', async () => {
    const result = await getEventSchema({
      userId: 'u1',
      projectId: 'proj_events',
      period: '30d',
      eventName: 'signup_completed',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'ok',
      event: {
        eventName: 'signup_completed',
        count: 4,
        firstSeenAt: '2026-05-01T12:02:00.000Z',
        lastSeenAt: '2026-05-01T12:05:00.000Z',
      },
    });

    const properties = result.status === 'ok' ? result.event.properties : [];
    const propertyNames = properties.map((property) => property.name);
    expect(propertyNames).toEqual(expect.arrayContaining(['path', 'plan', 'signupMethod', 'experiment']));
    expect(propertyNames).not.toEqual(expect.arrayContaining(['sessionId', 'visitorId', 'userId']));

    const plan = properties.find((property) => property.name === 'plan');
    expect(plan?.examples).toEqual(['free', 'pro', 'team']);

    const experiment = properties.find((property) => property.name === 'experiment');
    expect(experiment?.examples[0]).toHaveLength(128);
  });

  it('requires exact event names instead of silently selecting among signup-like events', async () => {
    const result = await getEventSchema({
      userId: 'u1',
      projectId: 'proj_events',
      period: '30d',
      eventName: 'signup',
      now: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'invalid_event_name',
      summary: 'Exact event name was not found.',
      availableEvents: expect.arrayContaining(['signup_completed', 'signup_started']),
    });
  });
});

describe('analytics service event sanitization', () => {
  it('strips query strings and fragments from paths and URLs', () => {
    expect(sanitizeAnalyticsPath('/signup?email=user@example.com#plan')).toBe('/signup');
    expect(sanitizeAnalyticsPath('https://app.example.com/pricing?token=secret#faq')).toBe(
      '/pricing'
    );
    expect(sanitizeAnalyticsUrl('https://app.example.com/signup?token=secret#done')).toBe(
      'https://app.example.com/signup'
    );
  });

  it('bounds untrusted strings before returning agent-readable values', () => {
    const unsafe = `\u0000${'x'.repeat(300)}`;

    expect(boundAnalyticsString(unsafe)).toHaveLength(256);
    expect(boundAnalyticsString(unsafe)).not.toContain('\u0000');
  });

  it('converts referrers to safe display values', () => {
    expect(sanitizeAnalyticsReferrer('')).toBe('Direct');
    expect(sanitizeAnalyticsReferrer('https://google.com/search?q=tally#result')).toBe(
      'google.com'
    );
    expect(sanitizeAnalyticsReferrer('www.linkedin.com/feed/?trk=private')).toBe(
      'www.linkedin.com'
    );
    expect(sanitizeAnalyticsReferrer('newsletter?email=user@example.com#top')).toBe('newsletter');
  });
});
