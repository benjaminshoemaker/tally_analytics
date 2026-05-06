import fs from 'node:fs';
import path from 'node:path';

export type Period = '24h' | '7d' | '30d';

type FixtureEvent = {
  project_id: string;
  session_id: string;
  event_type: 'page_view' | 'session_start';
  timestamp: string;
  url?: string;
  path?: string;
  referrer?: string;
  visitor_id?: string;
  is_returning?: number;
};

type ParsedFixtureEvent = FixtureEvent & {
  timestampMs: number;
};

export type E2EOverviewResponse = {
  period: Period;
  pageViews: { total: number; change: number; timeSeries: Array<{ date: string; count: number }> };
  sessions: { total: number; change: number };
  topPages: Array<{ path: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; count: number; percentage: number }>;
};

export type E2ESessionsResponse = {
  period: Period;
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{ date: string; newSessions: number; returningSessions: number }>;
};

export type E2ELiveFeedResponse = {
  events: Array<{
    id: string;
    eventType: string;
    path: string;
    referrer: string | null;
    timestamp: string;
    relativeTime: string;
  }>;
  hasMore: boolean;
};

export function isE2EAnalyticsFixtureMode(): boolean {
  return process.env.E2E_TEST_MODE === '1';
}

function appDirFromCwd(): string {
  return process.cwd().endsWith(`${path.sep}apps${path.sep}web`)
    ? process.cwd()
    : path.join(process.cwd(), 'apps', 'web');
}

function fixtureRoot(): string {
  return process.env.E2E_ANALYTICS_FIXTURE_DIR ?? path.join(appDirFromCwd(), '.e2e-fixtures');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseEvent(raw: unknown): ParsedFixtureEvent | null {
  if (!isRecord(raw)) return null;

  const projectId = raw.project_id;
  const sessionId = raw.session_id;
  const eventType = raw.event_type;
  const timestamp = raw.timestamp;

  if (typeof projectId !== 'string' || projectId.length === 0) return null;
  if (typeof sessionId !== 'string' || sessionId.length === 0) return null;
  if (eventType !== 'page_view' && eventType !== 'session_start') return null;
  if (typeof timestamp !== 'string' || timestamp.length === 0) return null;

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) return null;

  return {
    project_id: projectId,
    session_id: sessionId,
    event_type: eventType,
    timestamp,
    timestampMs,
    url: typeof raw.url === 'string' ? raw.url : undefined,
    path: typeof raw.path === 'string' ? raw.path : undefined,
    referrer: typeof raw.referrer === 'string' ? raw.referrer : undefined,
    visitor_id: typeof raw.visitor_id === 'string' ? raw.visitor_id : undefined,
    is_returning: typeof raw.is_returning === 'number' ? raw.is_returning : undefined,
  };
}

function readFixtureFile(filePath: string): ParsedFixtureEvent[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.events)) return [];
    return parsed.events.flatMap((event) => {
      const normalized = parseEvent(event);
      return normalized ? [normalized] : [];
    });
  } catch {
    return [];
  }
}

export function loadE2EAnalyticsEvents(projectId: string): ParsedFixtureEvent[] {
  const root = fixtureRoot();
  if (!fs.existsSync(root)) return [];

  const events: ParsedFixtureEvent[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const eventsPath = path.join(root, entry.name, 'events.json');
    if (!fs.existsSync(eventsPath)) continue;
    events.push(...readFixtureFile(eventsPath));
  }

  return events
    .filter((event) => event.project_id === projectId)
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function periodMs(period: Period): number {
  switch (period) {
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function fixtureNow(events: ParsedFixtureEvent[]): number {
  const explicit = process.env.E2E_ANALYTICS_NOW;
  if (explicit) {
    const parsed = Date.parse(explicit);
    if (Number.isFinite(parsed)) return parsed;
  }

  const max = Math.max(...events.map((event) => event.timestampMs), Number.NEGATIVE_INFINITY);
  return Number.isFinite(max) ? max + 1 : Date.now();
}

function eventsInWindow(
  events: ParsedFixtureEvent[],
  startMs: number,
  endMs: number
): ParsedFixtureEvent[] {
  return events.filter((event) => event.timestampMs >= startMs && event.timestampMs < endMs);
}

function dateKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function groupCountsByDate(events: ParsedFixtureEvent[]): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const date = dateKey(event.timestampMs);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function roundedPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count * 10000) / total) / 100;
}

function topCounts(
  events: ParsedFixtureEvent[],
  valueForEvent: (event: ParsedFixtureEvent) => string
): Array<{ label: string; count: number; percentage: number }> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const label = valueForEvent(event);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([label, count]) => ({
      label,
      count,
      percentage: roundedPercentage(count, events.length),
    }));
}

function referrerHost(referrer: string | undefined): string {
  if (!referrer) return 'Direct';
  try {
    return new URL(referrer).hostname || 'Direct';
  } catch {
    return referrer || 'Direct';
  }
}

export function buildE2EOverview(projectId: string, period: Period): E2EOverviewResponse {
  const events = loadE2EAnalyticsEvents(projectId);
  const now = fixtureNow(events);
  const duration = periodMs(period);
  const start = now - duration;
  const previousStart = start - duration;

  const currentEvents = eventsInWindow(events, start, now);
  const previousEvents = eventsInWindow(events, previousStart, start);

  const currentPageViews = currentEvents.filter((event) => event.event_type === 'page_view');
  const previousPageViews = previousEvents.filter((event) => event.event_type === 'page_view');
  const currentSessions = currentEvents.filter((event) => event.event_type === 'session_start');
  const previousSessions = previousEvents.filter((event) => event.event_type === 'session_start');

  const topPages = topCounts(currentPageViews, (event) => event.path ?? '').map((item) => ({
    path: item.label,
    views: item.count,
    percentage: item.percentage,
  }));

  const topReferrers = topCounts(currentPageViews, (event) => referrerHost(event.referrer)).map(
    (item) => ({
      referrer: item.label,
      count: item.count,
      percentage: item.percentage,
    })
  );

  return {
    period,
    pageViews: {
      total: currentPageViews.length,
      change: percentChange(currentPageViews.length, previousPageViews.length),
      timeSeries: groupCountsByDate(currentPageViews),
    },
    sessions: {
      total: currentSessions.length,
      change: percentChange(currentSessions.length, previousSessions.length),
    },
    topPages,
    topReferrers,
  };
}

export function buildE2ESessions(projectId: string, period: Period): E2ESessionsResponse {
  const events = loadE2EAnalyticsEvents(projectId);
  const now = fixtureNow(events);
  const start = now - periodMs(period);
  const sessions = eventsInWindow(events, start, now).filter(
    (event) => event.event_type === 'session_start'
  );

  const byDate = new Map<string, { newSessions: number; returningSessions: number }>();
  let newVisitors = 0;
  let returningVisitors = 0;

  for (const event of sessions) {
    const date = dateKey(event.timestampMs);
    const bucket = byDate.get(date) ?? { newSessions: 0, returningSessions: 0 };
    if (event.is_returning === 1) {
      bucket.returningSessions += 1;
      returningVisitors += 1;
    } else {
      bucket.newSessions += 1;
      newVisitors += 1;
    }
    byDate.set(date, bucket);
  }

  const timeSeries = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return {
    period,
    totalSessions: sessions.length,
    newVisitors,
    returningVisitors,
    timeSeries,
  };
}

function relativeTime(fromMs: number, toMs: number): string {
  const seconds = Math.max(0, Math.round((toMs - fromMs) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

export function buildE2ELiveFeed(params: {
  projectId: string;
  limit: number;
  since?: Date | null;
}): E2ELiveFeedResponse {
  const events = loadE2EAnalyticsEvents(params.projectId);
  const now = fixtureNow(events);
  const sinceMs =
    params.since && !Number.isNaN(params.since.getTime())
      ? params.since.getTime()
      : Date.parse('2024-01-01T00:00:00.000Z');

  const limited = events
    .filter((event) => event.timestampMs > sinceMs)
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, params.limit);

  return {
    events: limited.map((event, index) => ({
      id: `${event.timestamp}-${index}`,
      eventType: event.event_type,
      path: event.path ?? '',
      referrer: event.referrer && event.referrer.length > 0 ? event.referrer : null,
      timestamp: event.timestamp,
      relativeTime: relativeTime(event.timestampMs, now),
    })),
    hasMore: limited.length >= params.limit,
  };
}
