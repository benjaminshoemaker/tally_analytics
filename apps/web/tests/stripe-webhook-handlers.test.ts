import Stripe from "stripe";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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

function createStripeWebhookPayload(params: {
  eventId: string;
  eventType: string;
  created: number;
  data: Record<string, unknown>;
}) {
  return JSON.stringify({
    id: params.eventId,
    object: "event",
    api_version: "2025-12-15.clover",
    created: params.created,
    livemode: false,
    pending_webhooks: 1,
    type: params.eventType,
    data: { object: params.data },
  });
}

function createTestRequest(payload: string, signature: string) {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
}

function setupDbMocks(user: Record<string, unknown> | null) {
  const whereSpy = vi.fn().mockResolvedValue(user ? [user] : []);
  const fromSpy = vi.fn(() => ({ where: whereSpy }));
  selectSpy = vi.fn(() => ({ from: fromSpy }));

  const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
  const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
  updateSpy = vi.fn(() => ({ set: setSpy }));

  return { whereSpy, fromSpy, setSpy, whereUpdateSpy };
}

describe("POST /api/webhooks/stripe - comprehensive", () => {
  let previousWebhookSecret: string | undefined;
  let previousStripeKey: string | undefined;
  let previousPricePro: string | undefined;
  let previousPriceTeam: string | undefined;

  beforeEach(() => {
    previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    previousStripeKey = process.env.STRIPE_SECRET_KEY;
    previousPricePro = process.env.STRIPE_PRICE_PRO;
    previousPriceTeam = process.env.STRIPE_PRICE_TEAM;

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_PRICE_PRO = "price_pro_123";
    process.env.STRIPE_PRICE_TEAM = "price_team_123";
  });

  afterEach(() => {
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
    if (previousStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripeKey;
    if (previousPricePro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = previousPricePro;
    if (previousPriceTeam === undefined) delete process.env.STRIPE_PRICE_TEAM;
    else process.env.STRIPE_PRICE_TEAM = previousPriceTeam;
  });

  it("returns 400 when Stripe signature verification fails", async () => {
    vi.resetModules();
    setupDbMocks(null);

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": "invalid_signature",
        },
        body: JSON.stringify({ id: "evt_1" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid Stripe signature");
  });

  it("returns 200 when customer ID is missing", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_no_customer",
      eventType: "customer.subscription.updated",
      created: now,
      data: { id: "sub_123", object: "subscription", status: "active" },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    setupDbMocks(null);

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
  });

  it("returns 200 when user is not found for customer ID", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_user_not_found",
      eventType: "customer.subscription.updated",
      created: now,
      data: { id: "sub_123", object: "subscription", customer: "cus_unknown", status: "active" },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    setupDbMocks(null);

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
  });

  it("ignores duplicate events with same event ID", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_duplicate",
      eventType: "customer.subscription.updated",
      created: now,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "active",
        items: { data: [{ price: { id: "price_pro_123" } }] },
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: "evt_duplicate",
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ignored).toBe(true);
  });

  it("ignores stale events with earlier created timestamp", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_stale",
      eventType: "customer.subscription.updated",
      created: now - 1000,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "active",
        items: { data: [{ price: { id: "price_pro_123" } }] },
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: "evt_previous",
      stripeLastWebhookEventCreated: BigInt(now),
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ignored).toBe(true);
  });

  it("handles checkout.session.completed with subscription ID", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_checkout",
      eventType: "checkout.session.completed",
      created: now,
      data: {
        id: "cs_123",
        object: "checkout.session",
        customer: "cus_123",
        subscription: "sub_new_123",
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "free",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: "sub_new_123",
        stripeLastWebhookEventId: "evt_checkout",
      }),
    );
  });

  it("handles checkout.session.completed without subscription ID", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_checkout_no_sub",
      eventType: "checkout.session.completed",
      created: now,
      data: {
        id: "cs_123",
        object: "checkout.session",
        customer: "cus_123",
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "free",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("handles customer.subscription.updated and upgrades to pro", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_upgrade_pro",
      eventType: "customer.subscription.updated",
      created: now,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: now + 86400 * 30,
        items: { data: [{ price: { id: "price_pro_123" } }] },
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "free",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionStatus: "active",
        stripePriceId: "price_pro_123",
        stripeCancelAtPeriodEnd: false,
      }),
    );
  });

  it("handles customer.subscription.updated and upgrades to team", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_upgrade_team",
      eventType: "customer.subscription.updated",
      created: now,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: now + 86400 * 30,
        items: { data: [{ price: { id: "price_team_123" } }] },
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "team",
        stripeSubscriptionStatus: "active",
        stripePriceId: "price_team_123",
      }),
    );
  });

  it("handles customer.subscription.deleted and downgrades to free", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_deleted",
      eventType: "customer.subscription.deleted",
      created: now,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "canceled",
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "free",
        stripeSubscriptionStatus: "canceled",
        stripeLastWebhookEventId: "evt_deleted",
      }),
    );
  });

  it("handles invoice.payment_failed and sets status to past_due", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_payment_failed",
      eventType: "invoice.payment_failed",
      created: now,
      data: {
        id: "in_123",
        object: "invoice",
        customer: "cus_123",
        subscription: "sub_123",
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionStatus: "past_due",
        stripeLastWebhookEventId: "evt_payment_failed",
      }),
    );
  });

  it("handles unhandled event types gracefully", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_unhandled",
      eventType: "customer.created",
      created: now,
      data: {
        id: "cus_123",
        object: "customer",
        customer: "cus_123",
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("handles expanded customer object with nested id", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);

    const payload = createStripeWebhookPayload({
      eventId: "evt_expanded_customer",
      eventType: "customer.subscription.deleted",
      created: now,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: { id: "cus_nested", name: "Test Customer" },
        status: "canceled",
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_nested",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ plan: "free" }));
  });

  it("handles subscription with scheduled cancellation (cancel_at set)", async () => {
    vi.resetModules();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const now = Math.floor(Date.now() / 1000);
    const cancelAt = now + 86400 * 30;

    const payload = createStripeWebhookPayload({
      eventId: "evt_scheduled_cancel",
      eventType: "customer.subscription.updated",
      created: now,
      data: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: "active",
        cancel_at: cancelAt,
        canceled_at: null,
        current_period_end: cancelAt,
        items: { data: [{ price: { id: "price_pro_123" } }] },
      },
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp: now,
    });

    const { setSpy } = setupDbMocks({
      id: "u1",
      plan: "pro",
      stripeCustomerId: "cus_123",
      stripeLastWebhookEventId: null,
      stripeLastWebhookEventCreated: null,
    });

    const { POST } = await import("../app/api/webhooks/stripe/route");
    const response = await POST(createTestRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCancelAtPeriodEnd: true,
        stripeCurrentPeriodEnd: new Date(cancelAt * 1000),
      }),
    );
  });
});
