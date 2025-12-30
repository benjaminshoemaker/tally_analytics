import { describe, expect, it, vi } from "vitest";

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
  STRIPE_API_VERSION: "2024-11-20.acacia",
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

describe("POST /api/stripe/checkout", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/checkout/route");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid plan", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: null },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    updateSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "free");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(400);
  });

  it("returns 409 when an active subscription already exists", async () => {
    vi.resetModules();

    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "pro", stripeCustomerId: "cus_123" },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({
      data: [{ id: "sub_1", status: "active" }],
    });
    stripePortalSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://billing.example/portal" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Subscription already exists",
      manageUrl: "https://billing.example/portal",
    });

    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  it("redirects to Stripe Checkout and includes checkout_session_id placeholder in success_url", async () => {
    vi.resetModules();

    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const previousPro = process.env.STRIPE_PRICE_PRO;
    process.env.STRIPE_PRICE_PRO = "price_pro_test";

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: null },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const returningSpy = vi.fn().mockResolvedValue([
      { id: "u1", email: "u1@example.com", plan: "free", stripeCustomerId: "cus_new" },
    ]);
    const whereUpdateSpy = vi.fn(() => ({ returning: returningSpy }));
    const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    stripeCustomersCreateSpy = vi.fn().mockResolvedValue({ id: "cus_new" });
    stripeSubscriptionsListSpy = vi.fn().mockResolvedValue({ data: [] });
    stripeCheckoutSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://checkout.example/session" });

    const { POST } = await import("../app/api/stripe/checkout/route");
    const form = new FormData();
    form.set("plan", "pro");
    const response = await POST(new Request("http://localhost/api/stripe/checkout", { method: "POST", body: form }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.example/session");

    expect(stripeCheckoutSessionsCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining("checkout_session_id={CHECKOUT_SESSION_ID}"),
        cancel_url: "http://localhost:3000/settings",
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({ userId: "u1", plan: "pro" }),
        }),
      }),
    );

    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    if (previousPro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = previousPro;
  });
});
