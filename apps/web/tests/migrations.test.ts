import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

describe("db migrations", () => {
  it("includes update_updated_at_column trigger function in initial migration", () => {
    const migrationPath = path.join(__dirname, "..", "drizzle", "migrations", "0000_initial.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("FUNCTION update_updated_at_column()");
    expect(sql).toContain("CREATE TRIGGER update_users_updated_at");
    expect(sql).toContain("CREATE TRIGGER update_projects_updated_at");
    expect(sql).toContain("CREATE TRIGGER update_github_tokens_updated_at");
  });

  it("adds GitHub OAuth columns for users", () => {
    const migrationPath = path.join(__dirname, "..", "drizzle", "migrations", "0003_github_oauth.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("ADD COLUMN github_user_id BIGINT");
    expect(sql).toContain("ADD COLUMN github_username VARCHAR(39)");
    expect(sql).toContain("ADD COLUMN github_avatar_url TEXT");
    expect(sql).toContain("CREATE INDEX idx_users_github_user_id ON users(github_user_id)");
  });

  it("adds MCP project columns and OAuth tables without rebuilding existing tables", () => {
    const migrationPath = path.join(__dirname, "..", "drizzle", "migrations", "0006_mcp_oauth.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain('ALTER TABLE "projects" ADD COLUMN "source" varchar(30)');
    expect(sql).toContain('ALTER TABLE "projects" ADD COLUMN "display_name" varchar(255)');
    expect(sql).toContain('UPDATE "projects" SET "display_name" = "github_repo_full_name"');
    expect(sql).toContain('ALTER TABLE "projects" ALTER COLUMN "github_repo_id" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "projects" ALTER COLUMN "github_repo_full_name" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "projects" ALTER COLUMN "github_installation_id" DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE "projects" ADD COLUMN "mcp_fingerprint" varchar(64)');
    expect(sql).toContain('CONSTRAINT "projects_source_check"');
    expect(sql).toContain('CREATE UNIQUE INDEX "projects_user_mcp_fingerprint_unique"');
    expect(sql).toContain('CREATE INDEX "idx_projects_source"');
    expect(sql).toContain('CREATE TABLE "oauth_clients"');
    expect(sql).toContain('CREATE TABLE "oauth_authorization_codes"');
    expect(sql).toContain('CREATE TABLE "oauth_access_tokens"');
    expect(sql).toContain('CREATE TABLE "oauth_refresh_tokens"');
    expect(sql).toContain('"code_hash" varchar(64) PRIMARY KEY NOT NULL');
    expect(sql).toContain('"token_hash" varchar(64) PRIMARY KEY NOT NULL');
    expect(sql).not.toMatch(/CREATE TABLE "projects"/);
    expect(sql).not.toMatch(/CREATE TABLE "users"/);
    expect(sql).not.toMatch(/CREATE TABLE "github_tokens"/);
    expect(sql).not.toMatch(/DROP TABLE (projects|github_tokens)/i);
    expect(sql).not.toMatch(/DROP COLUMN (github_repo_id|github_repo_full_name|github_installation_id)/i);
  });

  it("tracks all migration files in the drizzle journal", () => {
    const migrationsDir = path.join(__dirname, "..", "drizzle", "migrations");
    const journalPath = path.join(migrationsDir, "meta", "_journal.json");

    const migrationTags = fs
      .readdirSync(migrationsDir)
      .filter((filename) => /^\d{4}_.+\.sql$/.test(filename))
      .map((filename) => filename.replace(/\.sql$/, ""))
      .sort();

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries?: Array<{ tag?: unknown }> };
    const journalTags = (journal.entries ?? [])
      .map((entry) => entry.tag)
      .filter((tag): tag is string => typeof tag === "string")
      .sort();

    expect(journalTags).toEqual(migrationTags);
  });
});
