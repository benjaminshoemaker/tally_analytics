import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import MarketingLayout from '../app/(marketing)/layout';
import LandingPage, { dynamic } from '../app/(marketing)/page';

function renderLandingPage() {
  return renderToStaticMarkup(
    React.createElement(MarketingLayout, null, React.createElement(LandingPage))
  );
}

describe('marketing landing page', () => {
  it('renders navbar links and primary CTA', () => {
    const html = renderLandingPage();

    expect(html).toContain('Documentation');
    expect(html).toContain('Pricing');
    expect(html).toContain('GitHub');
    expect(html).toContain('Get Started');
    expect(html).toContain('href="https://github.com/apps/tally-analytics-agent"');
  });

  it('renders the hero section', () => {
    const html = renderLandingPage();

    expect(html).toContain('V2.0 IS NOW LIVE');
    expect(html).toContain('Analytics for Next.js, installed in one click.');
    expect(html).toContain('Connect GitHub');
    expect(html).toContain('Read the Docs');
    expect(html).toContain('href="https://github.com/apps/tally-analytics-agent"');
  });

  it('renders features, what-you-get, how-it-works, set-and-forget, and CTA sections', () => {
    const html = renderLandingPage();

    expect(html).not.toContain('Trusted by developers building on the modern web');

    expect(html).toContain('Analytics without the headache');
    expect(html).toContain('Zero Configuration');
    expect(html).toContain('GDPR Compliant');
    expect(html).toContain('Ultra Lightweight');

    expect(html).toContain('Everything you need, nothing you don');
    expect(html).toContain(
      'A clean dashboard with the metrics that actually matter for early-stage apps.'
    );
    expect(html).toContain('Real-time Feed');
    expect(html).toContain('Traffic Over Time');
    expect(html).toContain('Top Pages');
    expect(html).toContain('Top Referrers');
    expect(html).toContain('Session Analytics');
    expect(html).toContain('Device');
    expect(html).toContain('Browser');

    expect(html).toContain('How it works');
    expect(html).toContain('Connect Repository');
    expect(html).toContain('Merge the PR');
    expect(html).toContain('See Insights');
    expect(html).toContain('Stay in Sync');

    expect(html).not.toContain('Finally, analytics that doesn');
    expect(html).not.toContain('feel like spyware');
    expect(html).not.toContain('Alex Chen');

    expect(html).toContain('Your analytics evolve with your app');
    expect(html).toContain('Most analytics tools break when you ship changes. Tally doesn');
    expect(html).toContain('Add a new page? We detect it automatically.');
    expect(html).toContain('Refactor your routes? Your tracking adapts.');
    expect(html).toContain(
      'No forgotten script tags. No broken dashboards. No weekend debugging sessions.'
    );
    expect(html).toContain('You focus on building.');
    expect(html).toContain('keep the data flowing.');

    expect(html).not.toContain('Ready to respect your users?');
    expect(html).toContain('All the analytics, no hassle.');
  });

  it('renders sections in the expected order', () => {
    const html = renderLandingPage();

    const heroIndex = html.indexOf('Analytics for Next.js, installed in one click.');
    const featuresIndex = html.indexOf('Analytics without the headache');
    const whatYouGetIndex = html.indexOf('Everything you need, nothing you don');
    const howItWorksIndex = html.indexOf('How it works');
    const setAndForgetIndex = html.indexOf('Your analytics evolve with your app');
    const ctaIndex = html.indexOf('All the analytics, no hassle.');

    expect(heroIndex).toBeGreaterThan(-1);
    expect(featuresIndex).toBeGreaterThan(heroIndex);
    expect(whatYouGetIndex).toBeGreaterThan(featuresIndex);
    expect(howItWorksIndex).toBeGreaterThan(whatYouGetIndex);
    expect(setAndForgetIndex).toBeGreaterThan(howItWorksIndex);
    expect(ctaIndex).toBeGreaterThan(setAndForgetIndex);
  });

  it('is configured for static generation', () => {
    expect(dynamic).toBe('force-static');
  });
});
