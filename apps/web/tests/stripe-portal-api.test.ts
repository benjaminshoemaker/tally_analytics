import { describe, expect, it, vi } from "vitest";

let validateSessionSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

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
  },
}));

vi.mock("../lib/stripe/client", () => ({
  STRIPE_API_VERSION: "2025-12-15.clover",
  getStripe: () => ({
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

describe("POST /api/stripe/portal", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();

    const { POST } = await import("../app/api/stripe/portal/route");
    const response = await POST(new Request("http://localhost/api/stripe/portal", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no Stripe customer", async () => {
    vi.resetModules();

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([{ id: "u1", stripeCustomerId: null }]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const { POST } = await import("../app/api/stripe/portal/route");
    const response = await POST(new Request("http://localhost/api/stripe/portal", { method: "POST" }));

    expect(response.status).toBe(400);
  });

  it("redirects to Stripe Billing Portal", async () => {
    vi.resetModules();

    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    validateSessionSpy = vi.fn().mockResolvedValue({ id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });

    const whereSpy = vi.fn().mockResolvedValue([{ id: "u1", stripeCustomerId: "cus_123" }]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    stripePortalSessionsCreateSpy = vi.fn().mockResolvedValue({ url: "https://billing.example/portal" });

    const { POST } = await import("../app/api/stripe/portal/route");
    const response = await POST(new Request("http://localhost/api/stripe/portal", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://billing.example/portal");

    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });
});
