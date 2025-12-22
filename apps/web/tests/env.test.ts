import { describe, expect, it, vi } from "vitest";

describe("server env", () => {
  it("throws a clear error when DATABASE_URL is missing", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    vi.resetModules();
    await expect(import("../lib/env")).rejects.toThrow(/Missing required environment variable: DATABASE_URL/);

    if (previousDatabaseUrl !== undefined) process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it("exports a drizzle db instance when DATABASE_URL is present", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";

    vi.resetModules();
    const { db } = await import("../lib/db/client");
    expect(db).toBeDefined();
    expect(db).toHaveProperty("select");

    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });
});

