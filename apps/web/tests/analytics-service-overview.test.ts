import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_PERIODS,
  createAnalyticsProvenance,
  parseAnalyticsPeriod,
  resolveAnalyticsDataWindow,
  serializeAnalyticsDataWindow,
  toTinybirdDateTime64String,
} from '../lib/analytics/service';

describe('analytics service overview primitives', () => {
  it('accepts only supported analytics periods and defaults missing values', () => {
    expect(ANALYTICS_PERIODS).toEqual(['24h', '7d', '30d']);
    expect(parseAnalyticsPeriod(null)).toBe('7d');
    expect(parseAnalyticsPeriod(undefined)).toBe('7d');
    expect(parseAnalyticsPeriod('')).toBe('7d');
    expect(parseAnalyticsPeriod('24h')).toBe('24h');
    expect(parseAnalyticsPeriod('7d')).toBe('7d');
    expect(parseAnalyticsPeriod('30d')).toBe('30d');
    expect(parseAnalyticsPeriod('1h')).toBeNull();
    expect(parseAnalyticsPeriod('14d')).toBeNull();
    expect(parseAnalyticsPeriod('7D')).toBeNull();
  });

  it('resolves rolling UTC windows with dataThrough set to the window end', () => {
    const now = new Date('2026-05-09T12:34:56.789Z');

    expect(serializeAnalyticsDataWindow(resolveAnalyticsDataWindow('24h', now))).toEqual({
      period: '24h',
      start: '2026-05-08T12:34:56.789Z',
      end: '2026-05-09T12:34:56.789Z',
      timezone: 'UTC',
      dataThrough: '2026-05-09T12:34:56.789Z',
    });

    expect(serializeAnalyticsDataWindow(resolveAnalyticsDataWindow('7d', now))).toMatchObject({
      period: '7d',
      start: '2026-05-02T12:34:56.789Z',
      end: '2026-05-09T12:34:56.789Z',
      dataThrough: '2026-05-09T12:34:56.789Z',
    });

    expect(serializeAnalyticsDataWindow(resolveAnalyticsDataWindow('30d', now))).toMatchObject({
      period: '30d',
      start: '2026-04-09T12:34:56.789Z',
      end: '2026-05-09T12:34:56.789Z',
      dataThrough: '2026-05-09T12:34:56.789Z',
    });
  });

  it('preserves previous rolling window boundaries for dashboard comparisons', () => {
    const window = resolveAnalyticsDataWindow('7d', new Date('2026-05-09T00:00:00.000Z'));

    expect(window.previousStart.toISOString()).toBe('2026-04-25T00:00:00.000Z');
    expect(window.previousEnd.toISOString()).toBe('2026-05-02T00:00:00.000Z');
    expect(toTinybirdDateTime64String(window.start)).toBe('2026-05-02 00:00:00.000');
  });

  it('creates project provenance for agent-readable responses', () => {
    const dataWindow = resolveAnalyticsDataWindow('7d', new Date('2026-05-09T12:00:00.000Z'));

    expect(
      createAnalyticsProvenance({
        projectName: 'Example App',
        tool: 'get_project_overview',
        semantics: 'dashboard_overview',
        dataWindow,
        generatedAt: new Date('2026-05-09T12:01:00.000Z'),
      })
    ).toEqual({
      projectName: 'Example App',
      generatedAt: '2026-05-09T12:01:00.000Z',
      dataWindow: {
        period: '7d',
        start: '2026-05-02T12:00:00.000Z',
        end: '2026-05-09T12:00:00.000Z',
        timezone: 'UTC',
        dataThrough: '2026-05-09T12:00:00.000Z',
      },
      queryBasis: {
        tool: 'get_project_overview',
        semantics: 'dashboard_overview',
      },
    });
  });
});
