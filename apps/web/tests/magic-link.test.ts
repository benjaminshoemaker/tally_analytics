import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
  },
}));

describe("createMagicLink", () => {
  it("generates a 64-char token, stores it with 15-minute expiry, and returns a verification URL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    vi.resetModules();
    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { createMagicLink } = await import("../lib/auth/magic-link");

    const url = await createMagicLink("TeSt@Example.COM");

    expect(valuesSpy).toHaveBeenCalledTimes(1);
    const inserted = valuesSpy.mock.calls[0]?.[0] as { email: string; token: string; expiresAt: Date };

    expect(inserted.email).toBe("test@example.com");
    expect(inserted.token).toMatch(/^[a-f0-9]{64}$/);
    expect(inserted.expiresAt.getTime()).toBe(new Date("2025-01-01T00:15:00.000Z").getTime());

    const parsed = new URL(url);
    expect(parsed.origin).toBe("http://localhost:3000");
    expect(parsed.pathname).toBe("/api/auth/verify");
    expect(parsed.searchParams.get("token")).toBe(inserted.token);

    vi.useRealTimers();
  });
});
