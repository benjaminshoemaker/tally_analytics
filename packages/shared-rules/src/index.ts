export const PROJECT_SOURCES = ["github_app", "mcp_codex"] as const;
export type ProjectSource = (typeof PROJECT_SOURCES)[number];

export const PROJECT_STATUSES = [
  "pending",
  "analyzing",
  "analysis_failed",
  "pr_pending",
  "pr_closed",
  "active",
  "unsupported",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const REGENERATABLE_PROJECT_STATUSES = ["analysis_failed", "pr_closed", "unsupported"] as const;

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function toProjectStatus(value: string): ProjectStatus {
  return isProjectStatus(value) ? value : "pending";
}

export function toProjectSource(value: string): ProjectSource {
  return value === "mcp_codex" ? "mcp_codex" : "github_app";
}

export function isIngestibleProjectStatus(status: string | null | undefined): boolean {
  return status === "active";
}

export function canRegenerateProject(project: {
  source: string;
  status: string;
  githubRepoId: bigint | number | string | null;
  githubRepoFullName: string | null;
  githubInstallationId: bigint | number | string | null;
}): project is {
  source: "github_app";
  status: string;
  githubRepoId: bigint | number | string;
  githubRepoFullName: string;
  githubInstallationId: bigint | number | string;
} {
  return (
    project.source === "github_app" &&
    (REGENERATABLE_PROJECT_STATUSES as readonly string[]).includes(project.status) &&
    project.githubRepoId !== null &&
    project.githubRepoFullName !== null &&
    project.githubInstallationId !== null
  );
}

export const USER_PLANS = ["free", "pro", "team"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

export const PAID_PLANS = ["pro", "team"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export const PLAN_METADATA: Record<
  UserPlan,
  {
    name: "Free" | "Pro" | "Team";
    priceLabel: string;
    priceSuffix: string;
    eventLimit: number;
    eventsLabel: string;
    projectLimit: number | null;
    projectsLabel: string;
    retentionLabel: string;
    supportLabel: string;
  }
> = {
  free: {
    name: "Free",
    priceLabel: "$0",
    priceSuffix: "forever",
    eventLimit: 10_000,
    eventsLabel: "10,000 events/mo",
    projectLimit: 3,
    projectsLabel: "3",
    retentionLabel: "90 days",
    supportLabel: "Community",
  },
  pro: {
    name: "Pro",
    priceLabel: "$9",
    priceSuffix: "/month",
    eventLimit: 100_000,
    eventsLabel: "100,000 events/mo",
    projectLimit: 10,
    projectsLabel: "10",
    retentionLabel: "Unlimited",
    supportLabel: "Email",
  },
  team: {
    name: "Team",
    priceLabel: "$29",
    priceSuffix: "/month",
    eventLimit: 1_000_000,
    eventsLabel: "1,000,000 events/mo",
    projectLimit: null,
    projectsLabel: "Unlimited",
    retentionLabel: "Unlimited",
    supportLabel: "Priority",
  },
};

export function isUserPlan(value: unknown): value is UserPlan {
  return value === "free" || value === "pro" || value === "team";
}

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "pro" || value === "team";
}

export function toUserPlan(value: unknown, fallback: UserPlan = "free"): UserPlan {
  return isUserPlan(value) ? value : fallback;
}

export function eventLimitForPlan(plan: unknown): number {
  return PLAN_METADATA[toUserPlan(plan)].eventLimit;
}
