import { describe, expect, it } from 'vitest';

import {
  boundAnalyticsString,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsUrl,
} from '../lib/analytics/service';

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
