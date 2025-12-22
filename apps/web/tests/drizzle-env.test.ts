import { describe, expect, it } from "vitest";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadDrizzleEnv } from "../lib/db/drizzle-env";

describe("loadDrizzleEnv", () => {
  it("loads DATABASE_URL from a .env.local file in configDir", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drizzle-env-"));
    fs.writeFileSync(path.join(tmp, ".env.local"), "DATABASE_URL=postgresql://example/db?sslmode=require\n");

    const env: Record<string, string | undefined> = {};
    loadDrizzleEnv({ configDir: tmp, env });

    expect(env.DATABASE_URL).toBe("postgresql://example/db?sslmode=require");
  });

  it("does not override an already-set DATABASE_URL", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drizzle-env-"));
    fs.writeFileSync(path.join(tmp, ".env.local"), "DATABASE_URL=postgresql://from-file/db\n");

    const env: Record<string, string | undefined> = { DATABASE_URL: "postgresql://already-set/db" };
    loadDrizzleEnv({ configDir: tmp, env });

    expect(env.DATABASE_URL).toBe("postgresql://already-set/db");
  });
});
