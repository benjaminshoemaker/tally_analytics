import { afterEach, describe, expect, it, vi } from "vitest";

const envKeys = ["E2E_TEST_MODE", "E2E_STRIPE_FAKE", "STRIPE_SECRET_KEY", "STRIPE_PRICE_PRO"] as const;

function snapshotEnv(): Partial<Record<(typeof envKeys)[number], string>> {
  return Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Partial<Record<(typeof envKeys)[number], string>>): void {
  for (const key of envKeys) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

afterEach(() => {
  vi.resetModules();
});

describe("Stripe client", () => {
  it("pins the Stripe API version", async () => {
    const { STRIPE_API_VERSION } = await import("../lib/stripe/client");
    expect(STRIPE_API_VERSION).toBe("2025-12-15.clover");
  });

  it("uses the E2E fake Stripe client only when explicitly enabled", async () => {
    const env = snapshotEnv();
    try {
      process.env.E2E_TEST_MODE = "1";
      process.env.E2E_STRIPE_FAKE = "1";
      process.env.STRIPE_SECRET_KEY = "sk_test_e2e_dummy";
      process.env.STRIPE_PRICE_PRO = "price_e2e_pro";

      vi.resetModules();
      const { getStripe } = await import("../lib/stripe/client");
      const stripe = getStripe() as any;

      const customer = await stripe.customers.create({ email: "e2e@example.com", metadata: { userId: "user-123" } });
      expect(customer.id).toMatch(/^cus_e2e_/);

      const checkout = await stripe.checkout.sessions.create({
        customer: customer.id,
        line_items: [{ price: "price_e2e_pro" }],
        subscription_data: { metadata: { userId: "user-123" } },
        success_url: "http://localhost:3000/settings?checkout_session_id={CHECKOUT_SESSION_ID}",
      });
      expect(checkout.url).toContain(checkout.id);

      const retrieved = await stripe.checkout.sessions.retrieve(checkout.id);
      expect(retrieved.customer.id).toBe(customer.id);
      expect(retrieved.subscription.metadata.userId).toBe("user-123");

      const subscriptions = await stripe.subscriptions.list({ customer: customer.id });
      expect(subscriptions.data).toHaveLength(1);

      const portal = await stripe.billingPortal.sessions.create({ customer: customer.id });
      expect(portal.url).toContain("billing.stripe.test");
    } finally {
      restoreEnv(env);
    }
  });
});
