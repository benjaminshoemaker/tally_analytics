import { describe, expect, it, vi } from "vitest";

let validateSessionSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;
let updateSpy: ReturnType<typeof vi.fn> | undefined;

let stripeCheckoutSessionsRetrieveSpy: ReturnType<typeof vi.fn> | undefined;

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
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]) => {
          if (!stripeCheckoutSessionsRetrieveSpy) throw new Error("stripeCheckoutSessionsRetrieveSpy not initialized");
          return stripeCheckoutSessionsRetrieveSpy(...args);
        },
      },
    },
  }),
}));

describe("POST /api/stripe/reconcile", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/reconcile/route");
    const response = await POST(new Request("http://localhost/api/stripe/reconcile", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 when checkout_session_id is missing", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    selectSpy = vi.fn();
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/reconcile/route");
    const response = await POST(
      new Request("http://localhost/api/stripe/reconcile", { method: "POST", body: JSON.stringify({}) }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 403 when checkout session does not belong to user", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([{ id: "u1", plan: "free", stripeCustomerId: "cus_user" }]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));
    updateSpy = vi.fn();

    stripeCheckoutSessionsRetrieveSpy = vi.fn().mockResolvedValue({
      id: "cs_123",
      customer: { id: "cus_other" },
      subscription: { id: "sub_123", metadata: { userId: "someone_else" } },
    });

    const { POST } = await import("../app/api/stripe/reconcile/route");
    const response = await POST(
      new Request("http://localhost/api/stripe/reconcile", {
        method: "POST",
        body: JSON.stringify({ checkout_session_id: "cs_123" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("updates the user plan and stripeSubscriptionId", async () => {
    vi.resetModules();

    const previousPro = process.env.STRIPE_PRICE_PRO;
    process.env.STRIPE_PRICE_PRO = "price_pro_test";

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([{ id: "u1", plan: "free", stripeCustomerId: "cus_user" }]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const returningSpy = vi.fn().mockResolvedValue([{ plan: "pro", stripeSubscriptionId: "sub_123" }]);
    const whereUpdateSpy = vi.fn(() => ({ returning: returningSpy }));
    const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    stripeCheckoutSessionsRetrieveSpy = vi.fn().mockResolvedValue({
      id: "cs_123",
      customer: { id: "cus_user" },
      subscription: {
        id: "sub_123",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: 1_750_000_000,
        items: { data: [{ price: { id: "price_pro_test" } }] },
        metadata: { userId: "u1" },
      },
    });

    const { POST } = await import("../app/api/stripe/reconcile/route");
    const response = await POST(
      new Request("http://localhost/api/stripe/reconcile", {
        method: "POST",
        body: JSON.stringify({ checkout_session_id: "cs_123" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ plan: "pro", stripeSubscriptionId: "sub_123" });

    if (previousPro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = previousPro;
  });
});
