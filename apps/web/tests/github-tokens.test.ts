import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
  },
}));

describe("github token queries", () => {
  it("upsertInstallationToken stores an installation token and expiry", async () => {
    vi.resetModules();

    const onConflictDoUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const valuesSpy = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateSpy }));
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { upsertInstallationToken } = await import("../lib/db/queries/github-tokens");

    const userId = "11111111-1111-1111-1111-111111111111";
    const installationId = 123n;
    const expiresAt = new Date("2030-01-01T00:00:00.000Z");

    await upsertInstallationToken({ userId, installationId, token: "t1", expiresAt });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        installationId,
        installationAccessToken: "t1",
        installationTokenExpiresAt: expiresAt,
      }),
    );
    expect(onConflictDoUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it("getStoredInstallationToken returns null when token is expired", async () => {
    vi.resetModules();

    const whereSpy = vi.fn().mockResolvedValue([
      {
        token: "t1",
        expiresAt: new Date("2000-01-01T00:00:00.000Z"),
      },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const { getStoredInstallationToken } = await import("../lib/db/queries/github-tokens");

    await expect(
      getStoredInstallationToken({
        userId: "11111111-1111-1111-1111-111111111111",
        installationId: 123n,
        now: new Date("2000-01-01T00:00:01.000Z"),
      }),
    ).resolves.toBeNull();
  });

  it("getOrRefreshInstallationToken refreshes and stores when missing/expired", async () => {
    vi.resetModules();

    const whereSpy = vi.fn().mockResolvedValue([]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const onConflictDoUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const valuesSpy = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateSpy }));
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const refreshSpy = vi.fn().mockResolvedValue({ token: "t2", expiresAt: new Date("2030-01-01T00:00:00.000Z").toISOString() });

    const { getOrRefreshInstallationToken } = await import("../lib/db/queries/github-tokens");

    const userId = "11111111-1111-1111-1111-111111111111";
    const installationId = 123n;

    await expect(
      getOrRefreshInstallationToken({
        userId,
        installationId,
        refreshInstallationAccessToken: refreshSpy,
        now: new Date("2025-01-01T00:00:00.000Z"),
      }),
    ).resolves.toEqual({ token: "t2", expiresAt: new Date("2030-01-01T00:00:00.000Z") });

    expect(refreshSpy).toHaveBeenCalledWith(123);
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        installationId,
        installationAccessToken: "t2",
        installationTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
    );
  });
});

