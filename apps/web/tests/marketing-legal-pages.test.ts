import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("marketing legal pages", () => {
  it("renders the privacy page and is configured for static generation", async () => {
    const { default: PrivacyPage, dynamic } = await import("../app/(marketing)/privacy/page");
    const html = renderToStaticMarkup(React.createElement(PrivacyPage));

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Privacy policy coming soon.");
    expect(html).toContain("support@usetally.xyz");
    expect(dynamic).toBe("force-static");
  });

  it("renders the terms page and is configured for static generation", async () => {
    const { default: TermsPage, dynamic } = await import("../app/(marketing)/terms/page");
    const html = renderToStaticMarkup(React.createElement(TermsPage));

    expect(html).toContain("Terms of Service");
    expect(html).toContain("Terms of service coming soon.");
    expect(html).toContain("support@usetally.xyz");
    expect(dynamic).toBe("force-static");
  });
});

