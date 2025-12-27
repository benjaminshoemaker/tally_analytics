import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LandingPage, { dynamic } from "../app/(marketing)/page";

describe("marketing landing page", () => {
  it("renders hero copy and the GitHub install CTA", () => {
    const html = renderToStaticMarkup(React.createElement(LandingPage));

    expect(html).toContain("Analytics for Next.js, installed in one click");
    expect(html).toContain("Add Tally to your GitHub repo");
    expect(html).toContain('href="https://github.com/apps/tally-analytics-agent"');
    expect(html).toContain(">Add to GitHub<");
  });

  it("renders a features section", () => {
    const html = renderToStaticMarkup(React.createElement(LandingPage));

    expect(html).toContain("One-click install");
    expect(html).toContain("Privacy-first");
    expect(html).toContain("Real-time dashboard");
  });

  it("is configured for static generation", () => {
    expect(dynamic).toBe("force-static");
  });
});

