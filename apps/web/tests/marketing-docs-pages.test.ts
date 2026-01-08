import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DocsIndexPage, { dynamic as docsDynamic } from "../app/(marketing)/docs/page";
import DocsSetupPage, { dynamic as setupDynamic } from "../app/(marketing)/docs/setup/page";
import DocsSdkPage, { dynamic as sdkDynamic } from "../app/(marketing)/docs/sdk/page";

describe("marketing docs pages", () => {
  it("renders the docs landing page with links", () => {
    const html = renderToStaticMarkup(React.createElement(DocsIndexPage));
    expect(html).toContain("Documentation");
    expect(html).toContain('href="/docs/setup"');
    expect(html).toContain('href="/docs/sdk"');
  });

  it("renders the setup guide with the GitHub install link", () => {
    const html = renderToStaticMarkup(React.createElement(DocsSetupPage));
    expect(html).toContain("Getting started");
    expect(html).toContain("/api/auth/github");
  });

  it("renders the SDK docs with code examples", () => {
    const html = renderToStaticMarkup(React.createElement(DocsSdkPage));
    expect(html).toContain("SDK Reference");
    expect(html).toContain("@tally-analytics/sdk");
    expect(html).toContain("npm install @tally-analytics/sdk");
    expect(html).toContain("tally_session");
    expect(html).toContain("init(");
    expect(html).toContain("trackPageView(");
    expect(html).toContain("identify(");
  });

  it("is configured for static generation", () => {
    expect(docsDynamic).toBe("force-static");
    expect(setupDynamic).toBe("force-static");
    expect(sdkDynamic).toBe("force-static");
  });
});
