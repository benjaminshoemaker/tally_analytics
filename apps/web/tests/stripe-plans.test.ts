import { describe, expect, it } from "vitest";

describe("Stripe plan/price mapping", () => {
  it("maps known price ids to plans and leaves unknown price ids unmapped", async () => {
    const previousPro = process.env.STRIPE_PRICE_PRO;
    const previousTeam = process.env.STRIPE_PRICE_TEAM;
    process.env.STRIPE_PRICE_PRO = "price_pro_test";
    process.env.STRIPE_PRICE_TEAM = "price_team_test";

    const { getPlanForPriceId } = await import("../lib/stripe/constants");

    expect(getPlanForPriceId("price_pro_test")).toBe("pro");
    expect(getPlanForPriceId("price_team_test")).toBe("team");
    expect(getPlanForPriceId("price_unknown")).toBeNull();

    if (previousPro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = previousPro;
    if (previousTeam === undefined) delete process.env.STRIPE_PRICE_TEAM;
    else process.env.STRIPE_PRICE_TEAM = previousTeam;
  });
});

