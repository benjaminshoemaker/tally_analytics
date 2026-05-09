import { describe, expect, it } from 'vitest';

import {
  boundAnalyticsString,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsUrl,
} from '../lib/analytics/service';

describe('analytics service recommendation sanitization', () => {
  it('strips private URL details from recommendation evidence', () => {
    expect(sanitizeAnalyticsUrl('https://app.example.com/checkout?session=secret#complete')).toBe(
      'https://app.example.com/checkout'
    );
    expect(sanitizeAnalyticsPath('/onboarding?invite=private#step-2')).toBe('/onboarding');
  });

  it('bounds recommendation goal text before it is echoed in tool results', () => {
    const goal = `Understand signup behavior ${'and conversion '.repeat(40)}`;

    expect(boundAnalyticsString(goal, 80)).toHaveLength(80);
    expect(boundAnalyticsString(goal, 80)).toMatch(/^Understand signup behavior/);
  });

  it('renders referrer evidence as display hosts rather than raw URLs', () => {
    expect(sanitizeAnalyticsReferrer('https://news.ycombinator.com/item?id=123#comments')).toBe(
      'news.ycombinator.com'
    );
  });
});
