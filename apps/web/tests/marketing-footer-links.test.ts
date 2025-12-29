import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MarketingFooter from "../components/marketing/footer";

describe("marketing footer links", () => {
  it("links to privacy, terms, support, twitter, github", () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketingFooter, {
        githubUrl: "https://github.com/apps/tally-analytics-agent",
      }),
    );

    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="https://github.com/your-org/tally-analytics/issues"');

    const privacyIndex = html.indexOf("Privacy Policy");
    const termsIndex = html.indexOf("Terms of Service");
    const supportIndex = html.indexOf("Support");
    const twitterIndex = html.indexOf("Twitter");

    expect(privacyIndex).toBeGreaterThan(-1);
    expect(termsIndex).toBeGreaterThan(privacyIndex);
    expect(supportIndex).toBeGreaterThan(termsIndex);
    expect(twitterIndex).toBeGreaterThan(supportIndex);
  });
});

