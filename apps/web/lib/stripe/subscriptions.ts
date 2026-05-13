export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid"] as const;

export type ActiveSubscriptionStatus = (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number];

export function isActiveSubscriptionStatus(status: string | null | undefined): status is ActiveSubscriptionStatus {
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status ?? "");
}
