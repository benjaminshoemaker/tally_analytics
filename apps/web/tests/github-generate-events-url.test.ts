import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("github generate events URL", () => {
  let previousDatabaseUrl: string | undefined;

  beforeEach(() => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  });

  afterEach(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it("derives events URL from app subdomain", async () => {
    vi.resetModules();
    const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
    expect(deriveEventsUrlFromAppUrl("https://app.usetally.xyz")).toBe("https://events.usetally.xyz");
  });

  it("derives events URL when dashboard is on the root domain", async () => {
    vi.resetModules();
    const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
    expect(deriveEventsUrlFromAppUrl("https://usetally.xyz")).toBe("https://events.usetally.xyz");
  });

  it("derives events URL from a non-app subdomain by replacing the first label", async () => {
    vi.resetModules();
    const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
    expect(deriveEventsUrlFromAppUrl("https://dashboard.usetally.xyz")).toBe("https://events.usetally.xyz");
  });

  it("returns null when app URL is invalid", async () => {
    vi.resetModules();
    const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
    expect(deriveEventsUrlFromAppUrl("not a url")).toBeNull();
  });
});
