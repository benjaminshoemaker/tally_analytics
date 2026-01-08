import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let cookieGetSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (...args: unknown[]) => {
      if (!cookieGetSpy) throw new Error("cookieGetSpy not initialized");
      return cookieGetSpy(...args);
    },
  }),
}));

async function renderLandingPage(options: { loggedIn: boolean }) {
  vi.resetModules();

  const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
  cookieGetSpy = vi.fn((name: unknown) =>
    name === SESSION_COOKIE_NAME && options.loggedIn ? { value: "sess_123" } : undefined,
  );

  const { default: MarketingLayout, dynamic: layoutDynamic } = await import("../app/(marketing)/layout");
  const { default: LandingPage } = await import("../app/(marketing)/page");

  return {
    layoutDynamic,
    html: renderToStaticMarkup(
      React.createElement(MarketingLayout, null, React.createElement(LandingPage)),
    ),
  };
}

describe("marketing landing page", () => {
  it("renders navbar links and primary CTA", async () => {
    const { html } = await renderLandingPage({ loggedIn: false });

    expect(html).toContain("Documentation");
    expect(html).toContain("Pricing");
    expect(html).toContain("GitHub");
    expect(html).toContain("Sign in with GitHub");
    expect(html).toContain('href="/api/auth/github"');
  });

  it("shows Log in when not logged in", async () => {
    const { html } = await renderLandingPage({ loggedIn: false });
    expect(html).toContain('href="/login"');
    expect(html).toContain(">Log in<");
  });

  it("treats an empty session cookie value as logged out", async () => {
    vi.resetModules();

    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
    cookieGetSpy = vi.fn((name: unknown) => (name === SESSION_COOKIE_NAME ? { value: "" } : undefined));

    const { default: MarketingLayout } = await import("../app/(marketing)/layout");
    const { default: LandingPage } = await import("../app/(marketing)/page");

    const html = renderToStaticMarkup(React.createElement(MarketingLayout, null, React.createElement(LandingPage)));
    expect(html).toContain('href="/login"');
    expect(html).toContain(">Log in<");
    expect(html).not.toContain('href="/projects"');
  });

  it("shows Dashboard when logged in", async () => {
    const { html } = await renderLandingPage({ loggedIn: true });
    expect(html).toContain('href="/projects"');
    expect(html).toContain(">Dashboard<");
    expect(html).not.toContain('href="/login"');
  });

  it("renders the hero section", async () => {
    const { html } = await renderLandingPage({ loggedIn: false });

    expect(html).toContain("V2.0 IS NOW LIVE");
    expect(html).toContain("Analytics for Next.js, installed in one click.");
    expect(html).toContain("Sign in with GitHub");
    expect(html).toContain("Read the Docs");
    expect(html).toContain('href="/api/auth/github"');
  });

  it("renders features, what-you-get, how-it-works, set-and-forget, and CTA sections", async () => {
    const { html } = await renderLandingPage({ loggedIn: false });

    expect(html).not.toContain("Trusted by developers building on the modern web");

    expect(html).toContain("Analytics without the headache");
    expect(html).toContain("Zero Configuration");
    expect(html).toContain("GDPR Compliant");
    expect(html).toContain("Ultra Lightweight");

    expect(html).toContain("Everything you need, nothing you don");
    expect(html).toContain(
      "A clean dashboard with the metrics that actually matter for early-stage apps.",
    );
    expect(html).toContain("Real-time Feed");
    expect(html).toContain("Traffic Over Time");
    expect(html).toContain("Top Pages");
    expect(html).toContain("Top Referrers");
    expect(html).toContain("Session Analytics");
    expect(html).toContain("Device");
    expect(html).toContain("Browser");

    expect(html).toContain("How it works");
    expect(html).toContain("Connect Repository");
    expect(html).toContain("Merge the PR");
    expect(html).toContain("See Insights");
    expect(html).toContain("Stay in Sync");

    expect(html).not.toContain("Finally, analytics that doesn");
    expect(html).not.toContain("feel like spyware");
    expect(html).not.toContain("Alex Chen");

    expect(html).toContain("Your analytics evolve with your app");
    expect(html).toContain("Most analytics tools break when you ship changes. Tally doesn");
    expect(html).toContain("Add a new page? We detect it automatically.");
    expect(html).toContain("Refactor your routes? Your tracking adapts.");
    expect(html).toContain(
      "No forgotten script tags. No broken dashboards. No weekend debugging sessions.",
    );
    expect(html).toContain("You focus on building.");
    expect(html).toContain("keep the data flowing.");

    expect(html).not.toContain("Ready to respect your users?");
    expect(html).toContain("All the analytics, no hassle.");
  });

  it("renders sections in the expected order", async () => {
    const { html } = await renderLandingPage({ loggedIn: false });

    const heroIndex = html.indexOf("Analytics for Next.js, installed in one click.");
    const featuresIndex = html.indexOf("Analytics without the headache");
    const whatYouGetIndex = html.indexOf("Everything you need, nothing you don");
    const howItWorksIndex = html.indexOf("How it works");
    const setAndForgetIndex = html.indexOf("Your analytics evolve with your app");
    const ctaIndex = html.indexOf("All the analytics, no hassle.");

    expect(heroIndex).toBeGreaterThan(-1);
    expect(featuresIndex).toBeGreaterThan(heroIndex);
    expect(whatYouGetIndex).toBeGreaterThan(featuresIndex);
    expect(howItWorksIndex).toBeGreaterThan(whatYouGetIndex);
    expect(setAndForgetIndex).toBeGreaterThan(howItWorksIndex);
    expect(ctaIndex).toBeGreaterThan(setAndForgetIndex);
  });

  it("layout is configured for dynamic rendering to check session cookie", async () => {
    const { layoutDynamic } = await renderLandingPage({ loggedIn: false });
    expect(layoutDynamic).toBe("force-dynamic");
  });
});
