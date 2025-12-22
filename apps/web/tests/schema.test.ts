import { describe, expect, expectTypeOf, it } from "vitest";

import { getTableConfig } from "drizzle-orm/pg-core";

import { githubTokens, magicLinks, projects, sessions, users, waitlist } from "../lib/db/schema";
import type { GithubToken, MagicLink, NewProject, Project, Session, User, WaitlistEntry } from "../types/database";

describe("db schema", () => {
  it("defines all 6 tables with expected core columns", () => {
    expect(getTableConfig(users).name).toBe("users");
    expect(getTableConfig(sessions).name).toBe("sessions");
    expect(getTableConfig(magicLinks).name).toBe("magic_links");
    expect(getTableConfig(projects).name).toBe("projects");
    expect(getTableConfig(githubTokens).name).toBe("github_tokens");
    expect(getTableConfig(waitlist).name).toBe("waitlist");

    const userColumns = getTableConfig(users).columns;
    expect(userColumns.find((c) => c.name === "email")?.notNull).toBe(true);
    expect(userColumns.find((c) => c.name === "email")?.isUnique).toBe(true);

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
  });

  it("defines all indexes from the spec", () => {
    expect(getTableConfig(users).indexes.map((i) => i.config.name)).toContain("idx_users_email");

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
  });

  it("exports TypeScript types derived from the schema", () => {
    expectTypeOf<User>().toMatchTypeOf<{ id: string; email: string }>();
    expectTypeOf<Session>().toMatchTypeOf<{ id: string; userId: string }>();
    expectTypeOf<MagicLink>().toMatchTypeOf<{ id: string; email: string; token: string }>();
    expectTypeOf<Project>().toMatchTypeOf<{ id: string; userId: string; githubRepoId: bigint }>();
    expectTypeOf<GithubToken>().toMatchTypeOf<{ id: string; userId: string; installationId: bigint }>();
    expectTypeOf<WaitlistEntry>().toMatchTypeOf<{ id: string; email: string }>();

    expectTypeOf<NewProject>().toMatchTypeOf<{ id: string; userId: string; githubRepoId: bigint }>();
  });
});
