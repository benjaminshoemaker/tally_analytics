import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    githubUserId: bigint("github_user_id", { mode: "bigint" }).unique(),
    githubUsername: varchar("github_username", { length: 39 }),
    githubAvatarUrl: text("github_avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

    plan: varchar("plan", { length: 20 }).notNull().default("free"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripeSubscriptionStatus: varchar("stripe_subscription_status", { length: 32 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", { withTimezone: true }),
    stripeCancelAtPeriodEnd: boolean("stripe_cancel_at_period_end"),
    stripeLastWebhookEventId: varchar("stripe_last_webhook_event_id", { length: 255 }),
    stripeLastWebhookEventCreated: bigint("stripe_last_webhook_event_created", { mode: "bigint" }),
  },
  (table) => [
    check("email_lowercase", sql`${table.email} = lower(${table.email})`),
    check("users_plan_check", sql`${table.plan} in ('free','pro','team')`),
    index("idx_users_email").on(table.email),
    index("idx_users_github_user_id").on(table.githubUserId),
    index("idx_users_stripe_subscription_id").on(table.stripeSubscriptionId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ],
);

export const magicLinks = pgTable(
  "magic_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_magic_links_token").on(table.token), index("idx_magic_links_email").on(table.email)],
);

export const projects = pgTable(
  "projects",
  {
    id: varchar("id", { length: 20 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    githubRepoId: bigint("github_repo_id", { mode: "bigint" }).notNull(),
    githubRepoFullName: varchar("github_repo_full_name", { length: 255 }).notNull(),
    githubInstallationId: bigint("github_installation_id", { mode: "bigint" }).notNull(),

    status: varchar("status", { length: 30 }).notNull().default("pending"),

    prNumber: integer("pr_number"),
    prUrl: varchar("pr_url", { length: 500 }),

    detectedFramework: varchar("detected_framework", { length: 50 }),
    detectedAnalytics: text("detected_analytics").array(),

    eventsThisMonth: bigint("events_this_month", { mode: "bigint" }).notNull().default(sql`0`),
    eventsMonthResetAt: timestamp("events_month_reset_at", { withTimezone: true }),

    // V2 Conversion tracking fields
    conversionPath: varchar("conversion_path", { length: 255 }),
    conversionLabel: varchar("conversion_label", { length: 100 }),
    conversionConfiguredAt: timestamp("conversion_configured_at", { withTimezone: true }),
    conversionPromptDismissedAt: timestamp("conversion_prompt_dismissed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "projects_status_check",
      sql`${table.status} in ('pending','analyzing','analysis_failed','pr_pending','pr_closed','active','unsupported')`,
    ),
    uniqueIndex("projects_github_repo_id_unique").on(table.githubRepoId),
    index("idx_projects_user_id").on(table.userId),
    index("idx_projects_github_repo_id").on(table.githubRepoId),
    index("idx_projects_status").on(table.status),
  ],
);

export const githubTokens = pgTable(
  "github_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    installationId: bigint("installation_id", { mode: "bigint" }).notNull(),
    installationAccessToken: text("installation_access_token"),
    installationTokenExpiresAt: timestamp("installation_token_expires_at", { withTimezone: true }),

    userAccessToken: text("user_access_token"),
    userRefreshToken: text("user_refresh_token"),
    userTokenExpiresAt: timestamp("user_token_expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("github_tokens_installation_id_unique").on(table.installationId),
    index("idx_github_tokens_user_id").on(table.userId),
    index("idx_github_tokens_installation_id").on(table.installationId),
  ],
);

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    framework: varchar("framework", { length: 100 }),
    githubRepoFullName: varchar("github_repo_full_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("waitlist_email_framework_unique").on(table.email, table.framework)],
);

export const regenerateRequests = pgTable(
  "regenerate_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: varchar("project_id", { length: 20 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_regenerate_requests_project_id").on(table.projectId),
    index("idx_regenerate_requests_created_at").on(table.createdAt),
  ],
);
