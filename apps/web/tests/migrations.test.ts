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
