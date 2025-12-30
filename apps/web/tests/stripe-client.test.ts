import { describe, expect, it } from "vitest";

describe("Stripe client", () => {
  it("pins the Stripe API version", async () => {
    const { STRIPE_API_VERSION } = await import("../lib/stripe/client");
    expect(STRIPE_API_VERSION).toBe("2025-12-15.clover");
  });
});
