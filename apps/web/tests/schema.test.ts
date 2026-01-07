import { describe, expect, expectTypeOf, it } from "vitest";

import { getTableConfig } from "drizzle-orm/pg-core";

import { githubTokens, magicLinks, projects, regenerateRequests, sessions, users, waitlist } from "../lib/db/schema";
import type {
  GithubToken,
  MagicLink,
  NewProject,
  Project,
  RegenerateRequest,
  Session,
  User,
  WaitlistEntry,
} from "../types/database";

describe("db schema", () => {
  it("defines all tables with expected core columns", () => {
    expect(getTableConfig(users).name).toBe("users");
    expect(getTableConfig(sessions).name).toBe("sessions");
    expect(getTableConfig(magicLinks).name).toBe("magic_links");
    expect(getTableConfig(projects).name).toBe("projects");
    expect(getTableConfig(githubTokens).name).toBe("github_tokens");
    expect(getTableConfig(waitlist).name).toBe("waitlist");
    expect(getTableConfig(regenerateRequests).name).toBe("regenerate_requests");

    const userColumns = getTableConfig(users).columns;
    expect(userColumns.find((c) => c.name === "email")?.notNull).toBe(true);
    expect(userColumns.find((c) => c.name === "email")?.isUnique).toBe(true);
    expect(userColumns.some((c) => c.name === "github_user_id")).toBe(true);
    expect(userColumns.some((c) => c.name === "github_username")).toBe(true);
    expect(userColumns.some((c) => c.name === "github_avatar_url")).toBe(true);
    expect(userColumns.find((c) => c.name === "github_user_id")?.isUnique).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_subscription_id")).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_subscription_status")).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_price_id")).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_current_period_end")).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_cancel_at_period_end")).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_last_webhook_event_id")).toBe(true);
    expect(userColumns.some((c) => c.name === "stripe_last_webhook_event_created")).toBe(true);

    const sessionColumns = getTableConfig(sessions).columns;
    expect(sessionColumns.find((c) => c.name === "user_id")?.notNull).toBe(true);
    expect(sessionColumns.find((c) => c.name === "expires_at")?.notNull).toBe(true);

    const projectColumns = getTableConfig(projects).columns;
    expect(projectColumns.find((c) => c.name === "github_repo_id")?.notNull).toBe(true);
    expect(projectColumns.find((c) => c.name === "github_repo_full_name")?.notNull).toBe(true);
    expect(projectColumns.find((c) => c.name === "github_installation_id")?.notNull).toBe(true);
  });

  it("uses CASCADE delete on all user-owned foreign keys", () => {
    expect(getTableConfig(sessions).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(projects).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(githubTokens).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(regenerateRequests).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
  });

  it("defines all indexes from the spec", () => {
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_email");
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_github_user_id");
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_stripe_subscription_id");

    expect(getTableConfig(sessions).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_sessions_user_id", "idx_sessions_expires_at"]),
    );

    expect(getTableConfig(magicLinks).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_magic_links_token", "idx_magic_links_email"]),
    );

    expect(getTableConfig(projects).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_projects_user_id", "idx_projects_github_repo_id", "idx_projects_status"]),
    );

    expect(getTableConfig(githubTokens).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_github_tokens_user_id", "idx_github_tokens_installation_id"]),
    );

    expect(getTableConfig(regenerateRequests).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_regenerate_requests_project_id", "idx_regenerate_requests_created_at"]),
    );
  });

  it("exports TypeScript types derived from the schema", () => {
    expectTypeOf<User>().toMatchTypeOf<{ id: string; email: string }>();
    expectTypeOf<Session>().toMatchTypeOf<{ id: string; userId: string }>();
    expectTypeOf<MagicLink>().toMatchTypeOf<{ id: string; email: string; token: string }>();
    expectTypeOf<Project>().toMatchTypeOf<{ id: string; userId: string; githubRepoId: bigint }>();
    expectTypeOf<GithubToken>().toMatchTypeOf<{ id: string; userId: string; installationId: bigint }>();
    expectTypeOf<WaitlistEntry>().toMatchTypeOf<{ id: string; email: string }>();
    expectTypeOf<RegenerateRequest>().toMatchTypeOf<{ id: string; projectId: string; userId: string }>();

    expectTypeOf<NewProject>().toMatchTypeOf<{ id: string; userId: string; githubRepoId: bigint }>();
  });
});
