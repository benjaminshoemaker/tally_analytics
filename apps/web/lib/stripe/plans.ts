export const USER_PLANS = ["free", "pro", "team"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

export const PAID_PLANS = ["pro", "team"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "pro" || value === "team";
}

