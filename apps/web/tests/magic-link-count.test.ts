import { describe, expect, it, vi } from "vitest";

let selectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
  },
}));

describe("countRecentMagicLinks", () => {
  it("returns the numeric count", async () => {
    vi.resetModules();
    const whereSpy = vi.fn().mockResolvedValue([{ count: "2" }]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));

    const { countRecentMagicLinks } = await import("../lib/auth/magic-link");
    await expect(countRecentMagicLinks(" TeSt@Example.COM ", new Date("2025-01-01T00:00:00.000Z"))).resolves.toBe(2);
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when the query returns no rows", async () => {
    vi.resetModules();
    selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));

    const { countRecentMagicLinks } = await import("../lib/auth/magic-link");
    await expect(countRecentMagicLinks("test@example.com", new Date("2025-01-01T00:00:00.000Z"))).resolves.toBe(0);
  });
});

