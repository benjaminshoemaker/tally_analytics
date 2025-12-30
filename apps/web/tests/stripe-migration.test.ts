import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

describe("Stripe billing migration", () => {
  it("adds Stripe subscription fields to users", () => {
    const migrationPath = path.join(__dirname, "..", "drizzle", "migrations", "0002_stripe_billing.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("ALTER TABLE users");
    expect(sql).toContain("stripe_subscription_id");
    expect(sql).toContain("CREATE INDEX idx_users_stripe_subscription_id");

    expect(sql).toContain("stripe_subscription_status");
    expect(sql).toContain("stripe_price_id");
    expect(sql).toContain("stripe_current_period_end");
    expect(sql).toContain("stripe_cancel_at_period_end");
    expect(sql).toContain("stripe_last_webhook_event_id");
    expect(sql).toContain("stripe_last_webhook_event_created");
  });
});

