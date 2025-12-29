import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MarketingFeatures from "../components/marketing/features";
import MarketingHero from "../components/marketing/hero";

describe("marketing copy", () => {
  it("uses accurate cookie language in hero section", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketingHero, {
        installUrl: "https://github.com/apps/tally-analytics-agent",
        docsUrl: "/docs",
        dashboardImageSrc: "/dashboard.png",
      }),
    );

    expect(html).toContain("No consent banner needed, no complex setup, just clean data.");
  });

  it("uses accurate cookie language in GDPR feature", () => {
    const html = renderToStaticMarkup(React.createElement(MarketingFeatures));

    expect(html).toContain(
      "No third-party cookies or personal data. First-party session tracking that&#x27;s fully anonymous and compliant by default.",
    );
  });
});
