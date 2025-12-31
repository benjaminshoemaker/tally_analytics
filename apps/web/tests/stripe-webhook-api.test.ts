import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

let selectSpy: ReturnType<typeof vi.fn> | undefined;
let updateSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
    update: (...args: unknown[]) => {
      if (!updateSpy) throw new Error("updateSpy not initialized");
      return updateSpy(...args);
    },
  },
}));

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when the Stripe signature header is missing", async () => {
    vi.resetModules();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

    selectSpy = vi.fn();
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify({ id: "evt_1" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("does not downgrade the user when the price id is unknown", async () => {
    vi.resetModules();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = JSON.stringify({
      id: "evt_1",
      object: "event",
      api_version: "2025-12-15.clover",
      created: now,
      livemode: false,
      pending_webhooks: 1,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          object: "subscription",
          customer: "cus_123",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: "1750000000",
          items: { data: [{ price: { id: "price_unknown" } }] },
        },
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
      timestamp: now,
    });

    const whereSpy = vi.fn().mockResolvedValue([
      {
        id: "u1",
        plan: "pro",
        stripeCustomerId: "cus_123",
        stripeLastWebhookEventId: null,
        stripeLastWebhookEventCreated: null,
      },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: payload,
      }),
    );

    expect(response.status).toBe(200);

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_unknown",
        stripeCurrentPeriodEnd: new Date(1_750_000_000 * 1000),
      }),
    );
    expect(setSpy).not.toHaveBeenCalledWith(expect.objectContaining({ plan: "free" }));
  });
});
