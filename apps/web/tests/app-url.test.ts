import { describe, expect, it, vi } from "vitest";

describe("app url", () => {
  it("returns NEXT_PUBLIC_APP_URL when set", async () => {
    const previousValue = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    vi.resetModules();
    const { getAppUrl } = await import("../lib/app-url");
    expect(getAppUrl()).toBe("http://localhost:3000");

    if (previousValue === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousValue;
  });

  it("throws a clear error when NEXT_PUBLIC_APP_URL is missing", async () => {
    const previousValue = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    vi.resetModules();
    const { getAppUrl } = await import("../lib/app-url");
    expect(() => getAppUrl()).toThrow(/Missing required environment variable: NEXT_PUBLIC_APP_URL/);

    if (previousValue !== undefined) process.env.NEXT_PUBLIC_APP_URL = previousValue;
  });
});

