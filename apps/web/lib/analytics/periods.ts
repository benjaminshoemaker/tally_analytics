export const ANALYTICS_PERIODS = ['24h', '7d', '30d'] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type AnalyticsDataWindow = {
  period: AnalyticsPeriod;
  start: string;
  end: string;
  timezone: 'UTC';
  dataThrough: string;
};

export type ResolvedAnalyticsDataWindow = {
  period: AnalyticsPeriod;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  timezone: 'UTC';
  dataThrough: Date;
};

const PERIOD_TO_MS: Record<AnalyticsPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function isAnalyticsPeriod(value: unknown): value is AnalyticsPeriod {
  return value === '24h' || value === '7d' || value === '30d';
}

export function parseAnalyticsPeriod(
  raw: unknown,
  defaultPeriod: AnalyticsPeriod = '7d'
): AnalyticsPeriod | null {
  if (raw === null || raw === undefined || raw === '') return defaultPeriod;
  if (isAnalyticsPeriod(raw)) return raw;
  return null;
}

export function analyticsPeriodMs(period: AnalyticsPeriod): number {
  return PERIOD_TO_MS[period];
}

export function resolveAnalyticsDataWindow(
  period: AnalyticsPeriod,
  now: Date = new Date()
): ResolvedAnalyticsDataWindow {
  const duration = analyticsPeriodMs(period);
  const end = new Date(now.getTime());
  const start = new Date(end.getTime() - duration);

  return {
    period,
    start,
    end,
    previousStart: new Date(start.getTime() - duration),
    previousEnd: start,
    timezone: 'UTC',
    dataThrough: end,
  };
}

export function serializeAnalyticsDataWindow(
  window: ResolvedAnalyticsDataWindow
): AnalyticsDataWindow {
  return {
    period: window.period,
    start: window.start.toISOString(),
    end: window.end.toISOString(),
    timezone: window.timezone,
    dataThrough: window.dataThrough.toISOString(),
  };
}

export function toTinybirdDateTime64String(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}
