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
});

