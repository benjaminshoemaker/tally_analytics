import { readRequiredEnv } from "../env/read-required-env";

import type { PaidPlan } from "./plans";

export function getPriceIdForPlan(plan: PaidPlan): string {
  switch (plan) {
    case "pro":
      return readRequiredEnv("STRIPE_PRICE_PRO");
    case "team":
      return readRequiredEnv("STRIPE_PRICE_TEAM");
  }
}

export function getPlanForPriceId(priceId: string): PaidPlan | null {
  const pro = process.env.STRIPE_PRICE_PRO;
  if (typeof pro === "string" && pro.length > 0 && priceId === pro) return "pro";

  const team = process.env.STRIPE_PRICE_TEAM;
  if (typeof team === "string" && team.length > 0 && priceId === team) return "team";

  return null;
}

