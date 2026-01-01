import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

let validateSessionSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;
let updateSpy: ReturnType<typeof vi.fn> | undefined;

let stripeCustomersCreateSpy: ReturnType<typeof vi.fn> | undefined;
let stripeSubscriptionsListSpy: ReturnType<typeof vi.fn> | undefined;
let stripeCheckoutSessionsCreateSpy: ReturnType<typeof vi.fn> | undefined;
let stripePortalSessionsCreateSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/session", () => ({
  validateSession: (...args: unknown[]) => {
    if (!validateSessionSpy) throw new Error("validateSessionSpy not initialized");
    return validateSessionSpy(...args);
  },
}));

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

vi.mock("../lib/stripe/client", () => ({
  STRIPE_API_VERSION: "2025-12-15.clover",
  getStripe: () => ({
    customers: {
      create: (...args: unknown[]) => {
        if (!stripeCustomersCreateSpy) throw new Error("stripeCustomersCreateSpy not initialized");
        return stripeCustomersCreateSpy(...args);
      },
    },
    subscriptions: {
      list: (...args: unknown[]) => {
        if (!stripeSubscriptionsListSpy) throw new Error("stripeSubscriptionsListSpy not initialized");
        return stripeSubscriptionsListSpy(...args);
      },
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]) => {
          if (!stripeCheckoutSessionsCreateSpy) throw new Error("stripeCheckoutSessionsCreateSpy not initialized");
          return stripeCheckoutSessionsCreateSpy(...args);
        },
      },
    },
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => {
          if (!stripePortalSessionsCreateSpy) throw new Error("stripePortalSessionsCreateSpy not initialized");
          return stripePortalSessionsCreateSpy(...args);
        },
      },
    },
  }),
}));

describe("POST /api/stripe/checkout - additional coverage", () => {
  let previousAppUrl: string | undefined;
  let previousPricePro: string | undefined;
  let previousPriceTeam: string | undefined;

  beforeEach(() => {
    previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    previousPricePro = process.env.STRIPE_PRICE_PRO;
    previousPriceTeam = process.env.STRIPE_PRICE_TEAM;

    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.STRIPE_PRICE_PRO = "price_pro_test";
    process.env.STRIPE_PRICE_TEAM = "price_team_test";
  });

  afterEach(() => {
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    if (previousPricePro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = previousPricePro;
    if (previousPriceTeam === undefined) delete process.env.STRIPE_PRICE_TEAM;
    else process.env.STRIPE_PRICE_TEAM = previousPriceTeam;
  });

  it("returns 400 when form data is invalid", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    selectSpy = vi.fn();
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/checkout/route");
    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        body: "invalid form data",
        headers: { "content-type": "text/plain" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request" });
  });

  it("returns 404 when user is not found", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "User not found" });
  });

  it("returns 500 when customer creation fails", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: null },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeCustomersCreateSpy = vi.fn().mockRejectedValue(new Error("Stripe API error"));

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to start checkout" });
  });

  it("returns 500 when subscription list check fails", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockRejectedValue(new Error("Stripe API error"));

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to start checkout" });
  });

  it("returns 500 when checkout session has no URL", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({ data: [] });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockResolvedValue({ id: "cs_123", url: null });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to start checkout" });
  });

  it("returns 500 when checkout session creation fails", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({ data: [] });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockRejectedValue(new Error("Stripe checkout failed"));

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to start checkout" });
  });

  it("creates customer and updates user when stripeCustomerId is null", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: null },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    stripeCustomersCreateSpy = vi.fn().mockResolvedValue({ id: "cus_new_123" });
    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({ data: [] });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(303);
    expect(stripeCustomersCreateSpy).toHaveBeenCalledWith({
      email: "u1@example.com",
      metadata: { userId: "u1" },
    });
    expect(setSpy).toHaveBeenCalledWith({ stripeCustomerId: "cus_new_123" });
  });

  it("handles team plan checkout", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({ data: [] });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "team");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(303);
    expect(stripeCheckoutSessionsCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_team_test", quantity: 1 }],
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({ plan: "team" }),
        }),
      }),
    );
  });

  it("returns 409 with manage URL for trialing subscription", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "pro", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({
      data: [{ id: "sub_1", status: "trialing" }],
    });
    stripePortalSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "team");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Subscription already exists",
      manageUrl: "https://billing.stripe.com/portal",
    });
  });

  it("returns 409 with manage URL for past_due subscription", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "pro", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({
      data: [{ id: "sub_1", status: "past_due" }],
    });
    stripePortalSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(409);
  });

  it("allows checkout when all subscriptions are canceled", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({
      data: [
        { id: "sub_1", status: "canceled" },
        { id: "sub_2", status: "incomplete_expired" },
      ],
    });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/session");
  });

  it("normalizes app URL with trailing slash", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_existing" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({ data: [] });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(stripeCheckoutSessionsCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining("http://localhost:3000/settings"),
        cancel_url: "http://localhost:3000/settings",
      }),
    );
  });
});
