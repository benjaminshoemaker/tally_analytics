import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PricingPage, { dynamic } from "../app/(marketing)/pricing/page";

describe("marketing pricing page", () => {
  it("renders Free, Pro, and Team tiers with event limits", () => {
    const html = renderToStaticMarkup(React.createElement(PricingPage));

    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Team");

    expect(html).toContain("10,000 events/mo");
    expect(html).toContain("100,000 events/mo");
    expect(html).toContain("1,000,000 events/mo");
  });

  it("renders a feature comparison section", () => {
    const html = renderToStaticMarkup(React.createElement(PricingPage));
    expect(html).toContain("Compare plans");
    expect(html).toContain("Projects");
    expect(html).toContain("Retention");
    expect(html).toContain("Support");
  });

  it("is configured for static generation", () => {
    expect(dynamic).toBe("force-static");
  });
});

