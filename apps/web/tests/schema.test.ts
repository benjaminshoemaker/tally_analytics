import { describe, expect, expectTypeOf, it } from "vitest";

import { getTableConfig } from "drizzle-orm/pg-core";

import {
  analyticsTaskStatusEvents,
  analyticsTasks,
  githubTokens,
  oauthAccessTokens,
  oauthAuthorizationCodes,
  oauthClients,
  oauthRefreshTokens,
  projects,
  regenerateRequests,
  sessions,
  users,
  waitlist,
} from "../lib/db/schema";
import type {
  AnalyticsTask,
  AnalyticsTaskStatusEvent,
  GithubToken,
  NewProject,
  OAuthAccessToken,
  OAuthAuthorizationCode,
  OAuthClient,
  OAuthRefreshToken,
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
    expect(getTableConfig(projects).name).toBe("projects");
    expect(getTableConfig(oauthClients).name).toBe("oauth_clients");
    expect(getTableConfig(oauthAuthorizationCodes).name).toBe("oauth_authorization_codes");
    expect(getTableConfig(oauthAccessTokens).name).toBe("oauth_access_tokens");
    expect(getTableConfig(oauthRefreshTokens).name).toBe("oauth_refresh_tokens");
    expect(getTableConfig(githubTokens).name).toBe("github_tokens");
    expect(getTableConfig(waitlist).name).toBe("waitlist");
    expect(getTableConfig(regenerateRequests).name).toBe("regenerate_requests");
    expect(getTableConfig(analyticsTasks).name).toBe("analytics_tasks");
    expect(getTableConfig(analyticsTaskStatusEvents).name).toBe("analytics_task_status_events");

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
    expect(projectColumns.find((c) => c.name === "source")?.notNull).toBe(true);
    expect(projectColumns.find((c) => c.name === "display_name")?.notNull).toBe(true);
    expect(projectColumns.find((c) => c.name === "github_repo_id")?.notNull).toBe(false);
    expect(projectColumns.find((c) => c.name === "github_repo_full_name")?.notNull).toBe(false);
    expect(projectColumns.find((c) => c.name === "github_installation_id")?.notNull).toBe(false);
    expect(projectColumns.some((c) => c.name === "mcp_normalized_git_remote")).toBe(true);
    expect(projectColumns.some((c) => c.name === "mcp_repo_name")).toBe(true);
    expect(projectColumns.some((c) => c.name === "mcp_app_root")).toBe(true);
    expect(projectColumns.some((c) => c.name === "mcp_framework")).toBe(true);
    expect(projectColumns.some((c) => c.name === "mcp_package_manager")).toBe(true);
    expect(projectColumns.some((c) => c.name === "mcp_fingerprint")).toBe(true);

    const oauthClientColumns = getTableConfig(oauthClients).columns;
    expect(oauthClientColumns.find((c) => c.name === "client_id")?.primary).toBe(true);
    expect(oauthClientColumns.find((c) => c.name === "redirect_uris")?.notNull).toBe(true);

    const oauthCodeColumns = getTableConfig(oauthAuthorizationCodes).columns;
    expect(oauthCodeColumns.find((c) => c.name === "code_hash")?.primary).toBe(true);
    expect(oauthCodeColumns.find((c) => c.name === "client_id")?.notNull).toBe(true);
    expect(oauthCodeColumns.find((c) => c.name === "user_id")?.notNull).toBe(true);

    const oauthAccessColumns = getTableConfig(oauthAccessTokens).columns;
    expect(oauthAccessColumns.find((c) => c.name === "token_hash")?.primary).toBe(true);
    expect(oauthAccessColumns.find((c) => c.name === "expires_at")?.notNull).toBe(true);

    const oauthRefreshColumns = getTableConfig(oauthRefreshTokens).columns;
    expect(oauthRefreshColumns.find((c) => c.name === "token_hash")?.primary).toBe(true);
    expect(oauthRefreshColumns.find((c) => c.name === "rotated_from_hash")).toBeDefined();

    const analyticsTaskColumns = getTableConfig(analyticsTasks).columns;
    expect(analyticsTaskColumns.find((c) => c.name === "project_id")?.notNull).toBe(true);
    expect(analyticsTaskColumns.find((c) => c.name === "user_id")?.notNull).toBe(true);
    expect(analyticsTaskColumns.find((c) => c.name === "status")?.notNull).toBe(true);
    expect(analyticsTaskColumns.find((c) => c.name === "task_type")?.notNull).toBe(true);
    expect(analyticsTaskColumns.find((c) => c.name === "answer_kind")?.notNull).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "duplicate_fingerprint")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "local_verification")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "implementation_fingerprint")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "confirmed_at")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "implemented_at")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "verified_at")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "cancelled_at")).toBe(true);
    expect(analyticsTaskColumns.some((c) => c.name === "archived_at")).toBe(true);

    const analyticsTaskEventColumns = getTableConfig(analyticsTaskStatusEvents).columns;
    expect(analyticsTaskEventColumns.find((c) => c.name === "task_id")?.notNull).toBe(true);
    expect(analyticsTaskEventColumns.find((c) => c.name === "project_id")?.notNull).toBe(true);
    expect(analyticsTaskEventColumns.find((c) => c.name === "user_id")?.notNull).toBe(true);
    expect(analyticsTaskEventColumns.find((c) => c.name === "to_status")?.notNull).toBe(true);
    expect(analyticsTaskEventColumns.find((c) => c.name === "actor_type")?.notNull).toBe(true);
  });

  it("uses CASCADE delete on all user-owned foreign keys", () => {
    expect(getTableConfig(sessions).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(projects).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(githubTokens).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(regenerateRequests).foreignKeys.map((fk) => fk.onDelete)).toContain("cascade");
    expect(getTableConfig(analyticsTasks).foreignKeys.map((fk) => fk.onDelete)).toEqual(
      expect.arrayContaining(["cascade", "cascade"]),
    );
    expect(getTableConfig(analyticsTaskStatusEvents).foreignKeys.map((fk) => fk.onDelete)).toEqual(
      expect.arrayContaining(["cascade", "cascade", "cascade"]),
    );
    expect(getTableConfig(oauthAuthorizationCodes).foreignKeys.map((fk) => fk.onDelete)).toEqual(
      expect.arrayContaining(["cascade", "cascade"]),
    );
    expect(getTableConfig(oauthAccessTokens).foreignKeys.map((fk) => fk.onDelete)).toEqual(
      expect.arrayContaining(["cascade", "cascade"]),
    );
    expect(getTableConfig(oauthRefreshTokens).foreignKeys.map((fk) => fk.onDelete)).toEqual(
      expect.arrayContaining(["cascade", "cascade"]),
    );
  });

  it("defines all indexes from the spec", () => {
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_email");
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_github_user_id");
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_stripe_subscription_id");

    expect(getTableConfig(sessions).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_sessions_user_id", "idx_sessions_expires_at"]),
    );

    expect(getTableConfig(projects).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining([
        "idx_projects_user_id",
        "idx_projects_github_repo_id",
        "idx_projects_status",
        "idx_projects_source",
        "idx_projects_mcp_fingerprint",
        "projects_user_mcp_fingerprint_unique",
      ]),
    );

    expect(getTableConfig(githubTokens).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_github_tokens_user_id", "idx_github_tokens_installation_id"]),
    );

    expect(getTableConfig(regenerateRequests).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining(["idx_regenerate_requests_project_id", "idx_regenerate_requests_created_at"]),
    );

    expect(getTableConfig(analyticsTasks).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining([
        "idx_analytics_tasks_project_id",
        "idx_analytics_tasks_user_id",
        "idx_analytics_tasks_status",
        "idx_analytics_tasks_created_at",
        "analytics_tasks_active_duplicate_fingerprint_unique",
      ]),
    );
    expect(getTableConfig(analyticsTaskStatusEvents).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining([
        "idx_analytics_task_status_events_task_id",
        "idx_analytics_task_status_events_project_id",
        "idx_analytics_task_status_events_user_id",
        "idx_analytics_task_status_events_created_at",
      ]),
    );

    expect(getTableConfig(oauthAuthorizationCodes).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining([
        "idx_oauth_authorization_codes_client_id",
        "idx_oauth_authorization_codes_user_id",
        "idx_oauth_authorization_codes_expires_at",
      ]),
    );
    expect(getTableConfig(oauthAccessTokens).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining([
        "idx_oauth_access_tokens_client_id",
        "idx_oauth_access_tokens_user_id",
        "idx_oauth_access_tokens_expires_at",
      ]),
    );
    expect(getTableConfig(oauthRefreshTokens).indexes.map((i) => i.config.name)).toEqual(
      expect.arrayContaining([
        "idx_oauth_refresh_tokens_client_id",
        "idx_oauth_refresh_tokens_user_id",
        "idx_oauth_refresh_tokens_expires_at",
      ]),
    );
  });

  it("defines source and status checks for project rows", () => {
    expect(getTableConfig(projects).checks.map((c) => c.name)).toEqual(
      expect.arrayContaining(["projects_status_check", "projects_source_check"]),
    );
  });

  it("defines analytics task and status-event checks", () => {
    expect(getTableConfig(analyticsTasks).checks.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "analytics_tasks_status_check",
        "analytics_tasks_task_type_check",
        "analytics_tasks_answer_kind_check",
        "analytics_tasks_verification_source_check",
      ]),
    );
    expect(getTableConfig(analyticsTaskStatusEvents).checks.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "analytics_task_status_events_actor_type_check",
        "analytics_task_status_events_to_status_check",
        "analytics_task_status_events_from_status_check",
      ]),
    );
  });

  it("exports TypeScript types derived from the schema", () => {
    expectTypeOf<User>().toMatchTypeOf<{ id: string; email: string }>();
    expectTypeOf<Session>().toMatchTypeOf<{ id: string; userId: string }>();
    expectTypeOf<Project>().toMatchTypeOf<{
      id: string;
      userId: string;
      displayName: string;
      source: string;
      githubRepoId: bigint | null;
    }>();
    expectTypeOf<GithubToken>().toMatchTypeOf<{ id: string; userId: string; installationId: bigint }>();
    expectTypeOf<OAuthClient>().toMatchTypeOf<{ clientId: string; redirectUris: string[] }>();
    expectTypeOf<OAuthAuthorizationCode>().toMatchTypeOf<{ codeHash: string; userId: string }>();
    expectTypeOf<OAuthAccessToken>().toMatchTypeOf<{ tokenHash: string; userId: string }>();
    expectTypeOf<OAuthRefreshToken>().toMatchTypeOf<{ tokenHash: string; userId: string }>();
    expectTypeOf<WaitlistEntry>().toMatchTypeOf<{ id: string; email: string }>();
    expectTypeOf<RegenerateRequest>().toMatchTypeOf<{ id: string; projectId: string; userId: string }>();
    expectTypeOf<AnalyticsTask>().toMatchTypeOf<{ id: string; projectId: string; userId: string; status: string }>();
    expectTypeOf<AnalyticsTaskStatusEvent>().toMatchTypeOf<{ id: string; taskId: string; toStatus: string }>();

    expectTypeOf<NewProject>().toMatchTypeOf<{ id: string; userId: string; displayName: string }>();
  });
});
