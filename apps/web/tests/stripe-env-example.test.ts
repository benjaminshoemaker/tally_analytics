import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

describe("Stripe env example", () => {
  it("documents required Stripe environment variables", () => {
    const envExamplePath = path.join(__dirname, "..", ".env.example");
    const envExample = fs.readFileSync(envExamplePath, "utf8");

    expect(envExample).toContain("# Stripe");

    expect(envExample).toContain("STRIPE_SECRET_KEY=");
    expect(envExample).toContain("STRIPE_WEBHOOK_SECRET=");
    expect(envExample).toContain("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=");

    expect(envExample).toContain("STRIPE_PRICE_PRO=");
    expect(envExample).toContain("STRIPE_PRICE_TEAM=");
    expect(envExample).toContain("STRIPE_BILLING_PORTAL_CONFIG_ID=");
  });
});

