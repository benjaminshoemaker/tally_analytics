import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import QuotaDisplay from "../components/dashboard/quota-display";

describe("QuotaDisplay", () => {
  it("shows a warning at 80% usage", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuotaDisplay, { used: 80, limit: 100, isOverQuota: false, userPlan: "free" }),
    );
    expect(html).toContain("80 / 100");
    expect(html).toContain("80%");
    expect(html).toContain("Upgrade plan");
  });

  it("shows an over-quota banner when exceeded", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuotaDisplay, { used: 120, limit: 100, isOverQuota: true, userPlan: "team" }),
    );
    expect(html).toContain("Over quota");
    expect(html).not.toContain("Upgrade plan");
  });
});
