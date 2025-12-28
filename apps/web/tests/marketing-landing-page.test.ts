import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MarketingLayout from "../app/(marketing)/layout";
import LandingPage, { dynamic } from "../app/(marketing)/page";

function renderLandingPage() {
  return renderToStaticMarkup(
    React.createElement(MarketingLayout, null, React.createElement(LandingPage)),
  );
}

describe("marketing landing page", () => {
  it("renders navbar links and primary CTA", () => {
    const html = renderLandingPage();

    expect(html).toContain("Documentation");
    expect(html).toContain("Pricing");
    expect(html).toContain("GitHub");
    expect(html).toContain("Get Started");
    expect(html).toContain('href="https://github.com/apps/tally-analytics-agent"');
  });

  it("renders the hero section", () => {
    const html = renderLandingPage();

    expect(html).toContain("V2.0 IS NOW LIVE");
    expect(html).toContain("Analytics for Next.js, installed in one click.");
    expect(html).toContain("Connect GitHub");
    expect(html).toContain("Read the Docs");
    expect(html).toContain('href="https://github.com/apps/tally-analytics-agent"');
  });

  it("renders social proof, features, how-it-works, testimonial, and CTA sections", () => {
    const html = renderLandingPage();

    expect(html).toContain("Trusted by developers building on the modern web");

    expect(html).toContain("Analytics without the headache");
    expect(html).toContain("Zero Configuration");
    expect(html).toContain("GDPR Compliant");
    expect(html).toContain("Ultra Lightweight");

    expect(html).toContain("How it works");
    expect(html).toContain("Connect Repository");
    expect(html).toContain("Merge the PR");
    expect(html).toContain("See Insights");

    expect(html).toContain("Finally, analytics that doesn");
    expect(html).toContain("feel like spyware");
    expect(html).toContain("Alex Chen");

    expect(html).toContain("Ready to respect your users?");
  });

  it("is configured for static generation", () => {
    expect(dynamic).toBe("force-static");
  });
});
