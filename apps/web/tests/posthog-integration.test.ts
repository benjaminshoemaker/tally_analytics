import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(__dirname, "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("PostHog production comparison integration", () => {
  it("keeps PostHog narrow and comparable to Tally", () => {
    const client = read("lib/posthog/client.ts");

    expect(client).toContain("posthog.init");
    expect(client).toContain("autocapture: false");
    expect(client).toContain("capture_pageview: false");
    expect(client).toContain("disable_session_recording: true");
    expect(client).toContain("posthog.capture('$pageview'");
    expect(client).toContain("posthog.identify");
    expect(client).toContain("NEXT_PUBLIC_POSTHOG_KEY");
  });

  it("mounts pageviews globally and identifies dashboard users", () => {
    expect(read("app/layout.tsx")).toContain("<PostHogAnalytics />");
    expect(read("app/(dashboard)/layout.tsx")).toContain("<PostHogUserIdentity");
  });

  it("tracks only explicit pricing product events", () => {
    const pricingPage = read("app/(marketing)/pricing/page.tsx");

    expect(pricingPage).toContain("pricing_cta_clicked");
    expect(pricingPage).toContain("checkout_started");
    expect(pricingPage).toContain("billing_portal_opened");
  });
});
