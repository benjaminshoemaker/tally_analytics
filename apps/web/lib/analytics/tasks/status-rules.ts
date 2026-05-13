import type { AnalyticsTaskStatus } from "./types";

export const analyticsTaskActiveDuplicateStatuses = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "verified",
  "failed",
  "duplicate",
] as const satisfies readonly AnalyticsTaskStatus[];

export const dashboardVisibleTaskStatuses = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "verified",
  "failed",
] as const satisfies readonly AnalyticsTaskStatus[];

export const transitionActiveStatuses = analyticsTaskActiveDuplicateStatuses;

export const transitionUserCancellableStatuses = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "failed",
  "duplicate",
] as const satisfies readonly AnalyticsTaskStatus[];

export const mcpPendingTaskStatuses = ["pending"] as const satisfies readonly AnalyticsTaskStatus[];
export const mcpInProgressTaskStatuses = ["pending", "in_progress"] as const satisfies readonly AnalyticsTaskStatus[];

export function isDashboardVisibleTaskStatus(status: AnalyticsTaskStatus): boolean {
  return (dashboardVisibleTaskStatuses as readonly AnalyticsTaskStatus[]).includes(status);
}

export function isActiveDuplicateTaskStatus(status: AnalyticsTaskStatus): boolean {
  return (analyticsTaskActiveDuplicateStatuses as readonly AnalyticsTaskStatus[]).includes(status);
}

export function isUserCancellableTaskStatus(status: AnalyticsTaskStatus): boolean {
  return (transitionUserCancellableStatuses as readonly AnalyticsTaskStatus[]).includes(status);
}

export function canEditAnalyticsTask(status: AnalyticsTaskStatus): boolean {
  return status === "pending";
}

export function canDeleteAnalyticsTask(status: AnalyticsTaskStatus): boolean {
  return status === "pending";
}

export function activeDuplicateStatusSqlList(): string {
  return analyticsTaskActiveDuplicateStatuses.map((status) => `'${status}'`).join(",");
}
