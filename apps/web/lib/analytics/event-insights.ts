import { loadE2EAnalyticsEvents } from './e2e-fixtures';
import {
  toTinybirdDateTime64String,
  type ResolvedAnalyticsDataWindow,
} from './periods';
import {
  createAnalyticsTinybirdClient,
  escapeAnalyticsSqlString,
  runAnalyticsTinybirdQuery,
} from './tinybird';
import type {
  AnalyticsEventSchema,
  AnalyticsEventSummary,
  AnalyticsPathCoverage,
  AnalyticsPathSummary,
  AnalyticsRecommendation,
} from './types';
import {
  boundAnalyticsString,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsUrl,
} from './urls';
import type {
  DashboardOverviewResponse,
  NextEventRecommendationsSuccessResult,
  PathsToEventSuccessResult,
} from './service';

export function normalizeTimestamp(value: unknown): string {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (raw.includes('T')) return raw;

  const iso = raw.replace(' ', 'T');
  return iso.endsWith('Z') ? iso : `${iso}Z`;
}

const PROPERTY_NAME_MAP: Record<string, string> = {
  session_id: 'sessionId',
  user_id: 'userId',
  visitor_id: 'visitorId',
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
  engagement_time_ms: 'engagementTimeMs',
  scroll_depth: 'scrollDepth',
  cta_clicks: 'ctaClicks',
  screen_width: 'screenWidth',
  is_returning: 'isReturning',
  signup_method: 'signupMethod',
};

const RAW_IDENTIFIER_PROPERTY_NAMES = new Set([
  'project_id',
  'projectId',
  'session_id',
  'sessionId',
  'visitor_id',
  'visitorId',
  'user_id',
  'userId',
  'event_type',
  'eventType',
  'timestamp',
  'user_agent',
  'userAgent',
]);

type AnalyticsFixtureEventRow = Record<string, unknown> & { event_type: string; timestampMs: number };

const PATH_TARGET_EVENT_QUERY_CAP = 1000;
const PATH_PAGE_VIEW_QUERY_CAP = 10000;

export function fixtureEventRows(projectId: string): AnalyticsFixtureEventRow[] {
  return loadE2EAnalyticsEvents(projectId).flatMap((event) => {
    const eventType = event.event_type;
    const timestampMs = event.timestampMs;
    if (typeof eventType !== 'string' || !Number.isFinite(timestampMs)) return [];
    return [{ ...event, event_type: eventType, timestampMs }];
  });
}

function camelCasePropertyName(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function normalizeEventPropertyName(name: string): string {
  return PROPERTY_NAME_MAP[name] ?? camelCasePropertyName(name);
}

function safeEventPropertyValue(name: string, value: unknown, limit = 128): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (name === 'url') return boundAnalyticsString(sanitizeAnalyticsUrl(value), limit);
  if (name === 'path') return boundAnalyticsString(sanitizeAnalyticsPath(value), limit);
  if (name === 'referrer') return boundAnalyticsString(sanitizeAnalyticsReferrer(value), limit);
  return boundAnalyticsString(value, limit);
}

function safeEventProperties(event: Record<string, unknown>): Map<string, string> {
  const properties = new Map<string, string>();

  for (const [rawName, rawValue] of Object.entries(event)) {
    const normalizedName = normalizeEventPropertyName(rawName);
    if (RAW_IDENTIFIER_PROPERTY_NAMES.has(rawName) || RAW_IDENTIFIER_PROPERTY_NAMES.has(normalizedName)) {
      continue;
    }

    const value = safeEventPropertyValue(rawName, rawValue);
    if (!value) continue;
    properties.set(normalizedName, value);
  }

  return properties;
}

export function eventsInDataWindow(
  events: AnalyticsFixtureEventRow[],
  dataWindow: ResolvedAnalyticsDataWindow
): AnalyticsFixtureEventRow[] {
  return events.filter(
    (event) =>
      event.timestampMs >= dataWindow.start.getTime() && event.timestampMs < dataWindow.end.getTime()
  );
}

export function summarizeEvents(
  events: AnalyticsFixtureEventRow[]
): AnalyticsEventSummary[] {
  const summaries = new Map<
    string,
    { count: number; firstSeenMs: number; lastSeenMs: number; propertyCounts: Map<string, number> }
  >();

  for (const event of events) {
    const current =
      summaries.get(event.event_type) ??
      {
        count: 0,
        firstSeenMs: event.timestampMs,
        lastSeenMs: event.timestampMs,
        propertyCounts: new Map<string, number>(),
      };

    current.count += 1;
    current.firstSeenMs = Math.min(current.firstSeenMs, event.timestampMs);
    current.lastSeenMs = Math.max(current.lastSeenMs, event.timestampMs);
    for (const propertyName of safeEventProperties(event).keys()) {
      current.propertyCounts.set(propertyName, (current.propertyCounts.get(propertyName) ?? 0) + 1);
    }
    summaries.set(event.event_type, current);
  }

  return Array.from(summaries.entries())
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([eventName, summary]) => ({
      eventName,
      count: summary.count,
      firstSeenAt: new Date(summary.firstSeenMs).toISOString(),
      lastSeenAt: new Date(summary.lastSeenMs).toISOString(),
      commonProperties: Array.from(summary.propertyCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12)
        .map(([propertyName]) => propertyName),
    }));
}

export function buildEventSchema(
  eventName: string,
  events: AnalyticsFixtureEventRow[]
): AnalyticsEventSchema | null {
  const matching = events.filter((event) => event.event_type === eventName);
  if (matching.length === 0) return null;

  const propertySummaries = new Map<string, { observedCount: number; examples: string[] }>();
  for (const event of matching) {
    for (const [propertyName, value] of safeEventProperties(event).entries()) {
      const current = propertySummaries.get(propertyName) ?? { observedCount: 0, examples: [] };
      current.observedCount += 1;
      if (!current.examples.includes(value) && current.examples.length < 3) {
        current.examples.push(value);
      }
      propertySummaries.set(propertyName, current);
    }
  }

  const timestamps = matching.map((event) => event.timestampMs);
  return {
    eventName,
    count: matching.length,
    firstSeenAt: new Date(Math.min(...timestamps)).toISOString(),
    lastSeenAt: new Date(Math.max(...timestamps)).toISOString(),
    properties: Array.from(propertySummaries.entries())
      .sort((a, b) => b[1].observedCount - a[1].observedCount || a[0].localeCompare(b[0]))
      .map(([name, property]) => ({ name, ...property })),
  };
}

export function validateAnalyticsEventName(value: string): string | null {
  const bounded = boundAnalyticsString(value, 129);
  if (!bounded || bounded.length > 128) return null;
  return bounded;
}

function eventSessionId(event: AnalyticsFixtureEventRow): string | null {
  const sessionId = event.session_id;
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
}

function eventPath(event: AnalyticsFixtureEventRow): string {
  return sanitizeAnalyticsPath(event.path);
}

function roundedAnalyticsPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count * 10000) / total) / 100;
}

function suggestedEventsForTarget(targetEvent: string): AnalyticsRecommendation[] {
  const lower = targetEvent.toLowerCase();
  const reason = lower.includes('signup')
    ? 'Needed to answer which pages users visit before signup.'
    : `Needed to answer which pages users visit before ${targetEvent}.`;

  return [{ eventName: targetEvent, reason, priority: 'high' }];
}

export function buildPathsToEvent(params: {
  events: AnalyticsFixtureEventRow[];
  targetEvent: string;
  maxSteps: number;
  limit: number;
}): Pick<
  PathsToEventSuccessResult,
  'status' | 'summary' | 'paths' | 'coverage' | 'limitations' | 'suggestedEvents'
> {
  const events = [...params.events].sort((a, b) => a.timestampMs - b.timestampMs);
  const coverage: AnalyticsPathCoverage = {
    targetEventTotal: 0,
    targetEventsWithPriorPath: 0,
  };

  if (events.length === 0) {
    return {
      status: 'no_events',
      summary: 'No analytics events were found.',
      paths: [],
      coverage,
    };
  }

  const targetEventsAll = events.filter((event) => event.event_type === params.targetEvent);
  coverage.targetEventTotal = targetEventsAll.length;

  if (targetEventsAll.length === 0) {
    return {
      status: 'insufficient_data',
      summary: `${params.targetEvent} was not observed in the selected period.`,
      paths: [],
      coverage,
      limitations: [`Target event "${params.targetEvent}" was not observed in the selected period.`],
      suggestedEvents: suggestedEventsForTarget(params.targetEvent),
    };
  }

  const pageViewsAll = events.filter((event) => event.event_type === 'page_view');
  const targetCapHit = targetEventsAll.length > PATH_TARGET_EVENT_QUERY_CAP;
  const pageViewCapHit = pageViewsAll.length > PATH_PAGE_VIEW_QUERY_CAP;
  const targetEvents = targetEventsAll.slice(0, PATH_TARGET_EVENT_QUERY_CAP);
  const pageViews = pageViewsAll.slice(0, PATH_PAGE_VIEW_QUERY_CAP);
  const pageViewsBySession = new Map<string, AnalyticsFixtureEventRow[]>();

  for (const pageView of pageViews) {
    const sessionId = eventSessionId(pageView);
    if (!sessionId) continue;
    const current = pageViewsBySession.get(sessionId) ?? [];
    current.push(pageView);
    pageViewsBySession.set(sessionId, current);
  }

  const pathCounts = new Map<string, { sequence: string[]; count: number }>();

  for (const targetEvent of targetEvents) {
    const sessionId = eventSessionId(targetEvent);
    if (!sessionId) continue;

    const priorPaths = (pageViewsBySession.get(sessionId) ?? [])
      .filter((event) => event.timestampMs < targetEvent.timestampMs)
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .slice(-params.maxSteps)
      .map(eventPath)
      .filter((path) => path.length > 0);

    if (priorPaths.length === 0) continue;

    coverage.targetEventsWithPriorPath += 1;
    const key = JSON.stringify(priorPaths);
    const current = pathCounts.get(key) ?? { sequence: priorPaths, count: 0 };
    current.count += 1;
    pathCounts.set(key, current);
  }

  const paths = Array.from(pathCounts.values())
    .sort(
      (a, b) =>
        b.count - a.count || a.sequence.join(' > ').localeCompare(b.sequence.join(' > '))
    )
    .slice(0, params.limit)
    .map((path) => ({
      sequence: path.sequence,
      targetEventCount: path.count,
      percentage: roundedAnalyticsPercentage(path.count, coverage.targetEventTotal),
    }));

  const coverageRate =
    coverage.targetEventTotal === 0
      ? 0
      : coverage.targetEventsWithPriorPath / coverage.targetEventTotal;
  const limitations: string[] = [];
  if (coverage.targetEventTotal < 5) {
    limitations.push('Fewer than 5 target events were observed in the selected period.');
  }
  if (coverageRate < 0.5) {
    limitations.push('Fewer than 50% of target events had a prior page path in the same session.');
  }
  if (targetCapHit) {
    limitations.push(
      `Target event result was capped at ${PATH_TARGET_EVENT_QUERY_CAP} events.`
    );
  }
  if (pageViewCapHit) {
    limitations.push(`Page-view result was capped at ${PATH_PAGE_VIEW_QUERY_CAP} events.`);
  }

  const status: PathsToEventSuccessResult['status'] =
    limitations.length > 0 ? 'partial_data' : 'ok';

  return {
    status,
    summary:
      status === 'ok'
        ? `${paths.length} paths to ${params.targetEvent} found.`
        : `Partial path data for ${params.targetEvent} found.`,
    paths,
    coverage,
    limitations: limitations.length > 0 ? limitations : undefined,
  };
}

type RecommendationCategory = 'signup' | 'onboarding' | 'pricing' | 'checkout' | 'featureUsage';

const RECOMMENDATION_TERMS: Array<{ category: RecommendationCategory; terms: string[] }> = [
  { category: 'signup', terms: ['signup', 'sign up', 'account', 'registration', 'funnel'] },
  { category: 'onboarding', terms: ['onboarding', 'onboard', 'activation'] },
  { category: 'pricing', terms: ['pricing', 'price', 'cta', 'button', 'conversion'] },
  { category: 'checkout', terms: ['checkout', 'payment', 'purchase', 'billing'] },
  { category: 'featureUsage', terms: ['feature', 'usage', 'used', 'engagement', 'dashboard'] },
];

const RECOMMENDATIONS_BY_CATEGORY: Record<RecommendationCategory, AnalyticsRecommendation[]> = {
  signup: [
    {
      eventName: 'signup_started',
      reason: 'Helps measure how many visitors begin account creation.',
      priority: 'medium',
    },
    {
      eventName: 'signup_completed',
      reason: 'Needed to answer which pages users visit before signup.',
      priority: 'high',
    },
  ],
  onboarding: [
    {
      eventName: 'onboarding_started',
      reason: 'Helps measure how many new users begin onboarding.',
      priority: 'medium',
    },
    {
      eventName: 'onboarding_completed',
      reason: 'Needed to measure whether new users finish onboarding.',
      priority: 'high',
    },
  ],
  pricing: [
    {
      eventName: 'pricing_cta_clicked',
      reason: 'Useful for connecting pricing-page visits to signup intent.',
      priority: 'medium',
    },
  ],
  checkout: [
    {
      eventName: 'checkout_started',
      reason: 'Helps measure how many users begin checkout.',
      priority: 'medium',
    },
    {
      eventName: 'checkout_completed',
      reason: 'Needed to measure completed purchases or payments.',
      priority: 'high',
    },
  ],
  featureUsage: [
    {
      eventName: 'feature_used',
      reason: 'Needed to connect product usage to activation and engagement.',
      priority: 'medium',
    },
  ],
};

export function validateRecommendationGoal(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const bounded = boundAnalyticsString(value, 201);
  if (!bounded || bounded.length > 200) return null;
  return bounded;
}

function recommendationTextCorpus(params: {
  goal?: string;
  overview: DashboardOverviewResponse;
  events: AnalyticsEventSummary[];
}): string {
  return [
    params.goal ?? '',
    ...params.overview.topPages.map((page) => page.path),
    ...params.overview.topReferrers.map((referrer) => referrer.referrer),
    ...params.events.map((event) => event.eventName),
  ]
    .join(' ')
    .toLowerCase();
}

function matchedRecommendationCategories(params: {
  goal?: string;
  overview: DashboardOverviewResponse;
  events: AnalyticsEventSummary[];
}): RecommendationCategory[] {
  const corpus = recommendationTextCorpus(params);
  const matched = new Set<RecommendationCategory>();

  for (const matcher of RECOMMENDATION_TERMS) {
    if (matcher.terms.some((term) => corpus.includes(term))) {
      matched.add(matcher.category);
    }
  }

  return Array.from(matched);
}

function buildRecommendationEvidence(params: {
  overview: DashboardOverviewResponse;
  events: AnalyticsEventSummary[];
}): string[] {
  const evidence: string[] = [];
  const pageViews = params.overview.pageViews.total;
  const sessions = params.overview.sessions.total;

  if (pageViews > 0 || sessions > 0) {
    evidence.push(`Observed ${pageViews} page views and ${sessions} sessions in the selected period.`);
  }

  const topPages = params.overview.topPages
    .slice(0, 3)
    .map((page) => sanitizeAnalyticsPath(page.path))
    .filter(Boolean);
  if (topPages.length > 0) {
    evidence.push(`Top pages include ${topPages.join(', ')}.`);
  }

  const topReferrer = params.overview.topReferrers[0]?.referrer;
  if (topReferrer) {
    evidence.push(`Top referrer: ${sanitizeAnalyticsReferrer(topReferrer)}.`);
  }

  const observedEvents = params.events.slice(0, 6).map((event) => event.eventName);
  if (observedEvents.length > 0) {
    evidence.push(`Observed event names include ${observedEvents.join(', ')}.`);
  }

  return evidence;
}

export function buildNextEventRecommendations(params: {
  goal?: string;
  overview: DashboardOverviewResponse;
  events: AnalyticsEventSummary[];
}): Pick<
  NextEventRecommendationsSuccessResult,
  'status' | 'summary' | 'evidence' | 'recommendations' | 'limitations'
> {
  if (params.events.length === 0) {
    return {
      status: 'no_events',
      summary:
        'Tally needs production events before usage-based recommendations are available.',
      evidence: [],
      recommendations: [],
    };
  }

  const matchedCategories = matchedRecommendationCategories(params);
  const evidence = buildRecommendationEvidence(params);
  const observedEventNames = new Set(params.events.map((event) => event.eventName));
  const recommendations = matchedCategories
    .flatMap((category) => RECOMMENDATIONS_BY_CATEGORY[category])
    .filter((recommendation, index, allRecommendations) => {
      const firstIndex = allRecommendations.findIndex(
        (candidate) => candidate.eventName === recommendation.eventName
      );
      return firstIndex === index && !observedEventNames.has(recommendation.eventName);
    });

  if (matchedCategories.length === 0) {
    return {
      status: 'insufficient_data',
      summary: 'Current analytics data could not connect the requested goal to observed pages or events.',
      evidence,
      limitations: [
        'No observed page, referrer, or event pattern matched the requested analytics goal.',
      ],
      recommendations: observedEventNames.has('feature_used')
        ? []
        : [
            {
              eventName: 'feature_used',
              reason: 'Needed to connect product usage to the stated goal.',
              priority: 'low',
            },
          ],
    };
  }

  if (recommendations.length === 0) {
    return {
      status: 'ok',
      summary: 'Observed events already cover the selected recommendation pattern.',
      evidence,
      recommendations: [],
    };
  }

  return {
    status: 'partial_data',
    summary:
      'Current data can partially support the goal, but missing lifecycle events would make it more accurate.',
    evidence,
    limitations: [
      'Current analytics data is missing one or more lifecycle events needed for a more complete answer.',
    ],
    recommendations,
  };
}

export async function listEventsFromTinybird(params: {
  projectId: string;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<AnalyticsEventSummary[]> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));

  const result = await runAnalyticsTinybirdQuery<{
    event_type: string;
    count: number;
    first_seen_at: string;
    last_seen_at: string;
  }>(
    client,
    'event_discovery',
    `
      SELECT
        event_type,
        count() AS count,
        toString(min(timestamp)) AS first_seen_at,
        toString(max(timestamp)) AS last_seen_at
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      GROUP BY event_type
      ORDER BY count DESC, event_type ASC
      LIMIT 100
    `.trim()
  );

  return result.data.map((row) => ({
    eventName: String(row.event_type),
    count: Number(row.count),
    firstSeenAt: normalizeTimestamp(row.first_seen_at),
    lastSeenAt: normalizeTimestamp(row.last_seen_at),
    commonProperties: [],
  }));
}

export async function eventSchemaFromTinybird(params: {
  projectId: string;
  eventName: string;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<AnalyticsEventSchema | null> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const eventNameSql = escapeAnalyticsSqlString(params.eventName);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));

  const result = await runAnalyticsTinybirdQuery<Record<string, unknown>>(
    client,
    'event_schema',
    `
      SELECT *
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND event_type = '${eventNameSql}'
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      ORDER BY timestamp DESC
      LIMIT 100
    `.trim()
  );

  const events: AnalyticsFixtureEventRow[] = result.data.flatMap((row) => {
    const timestamp = Date.parse(String(row.timestamp ?? ''));
    if (!Number.isFinite(timestamp)) return [];
    return [{ ...row, event_type: params.eventName, timestampMs: timestamp }];
  });

  return buildEventSchema(params.eventName, events);
}

export async function pathsToEventRowsFromTinybird(params: {
  projectId: string;
  targetEvent: string;
  dataWindow: ResolvedAnalyticsDataWindow;
}): Promise<AnalyticsFixtureEventRow[]> {
  const client = createAnalyticsTinybirdClient();
  const projectIdSql = escapeAnalyticsSqlString(params.projectId);
  const targetEventSql = escapeAnalyticsSqlString(params.targetEvent);
  const startSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.start));
  const endSql = escapeAnalyticsSqlString(toTinybirdDateTime64String(params.dataWindow.end));
  const limit = PATH_TARGET_EVENT_QUERY_CAP + PATH_PAGE_VIEW_QUERY_CAP + 2;

  const result = await runAnalyticsTinybirdQuery<{
    session_id: string;
    event_type: string;
    path: string;
    timestamp: string;
  }>(
    client,
    'paths_to_event_events',
    `
      SELECT
        ifNull(session_id, '') AS session_id,
        event_type,
        ifNull(path, '') AS path,
        toString(timestamp) AS timestamp
      FROM events
      WHERE project_id = '${projectIdSql}'
      AND (event_type = 'page_view' OR event_type = '${targetEventSql}')
      AND timestamp >= toDateTime64('${startSql}', 3)
      AND timestamp < toDateTime64('${endSql}', 3)
      ORDER BY timestamp ASC
      LIMIT ${limit}
    `.trim()
  );

  return result.data.flatMap((row) => {
    const timestampMs = Date.parse(normalizeTimestamp(row.timestamp));
    if (!Number.isFinite(timestampMs)) return [];
    return [
      {
        session_id: String(row.session_id ?? ''),
        event_type: String(row.event_type ?? ''),
        path: String(row.path ?? ''),
        timestamp: normalizeTimestamp(row.timestamp),
        timestampMs,
      },
    ];
  });
}
