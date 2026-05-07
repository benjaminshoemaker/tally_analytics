import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;
let updateSpy: ReturnType<typeof vi.fn> | undefined;

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
    update: (...args: unknown[]) => {
      if (!updateSpy) throw new Error("updateSpy not initialized");
      return updateSpy(...args);
    },
  },
}));

describe("MCP OAuth token helpers", () => {
  it("stores authorization code hashes and never persists the raw code", async () => {
    vi.resetModules();

    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { createAuthorizationCode } = await import("../lib/oauth/codes");
    const created = await createAuthorizationCode({
      clientId: "client_1",
      userId: "user_1",
      redirectUri: "http://localhost:4321/callback",
      codeChallenge: "a".repeat(43),
      codeChallengeMethod: "S256",
      scope: "mcp:install",
      resource: "https://usetally.xyz/api/mcp",
      now: new Date("2026-05-07T00:00:00.000Z"),
    });

    const insertedValue = (valuesSpy.mock.calls as unknown[][])[0]?.[0] as Record<string, unknown>;
    expect(insertedValue.codeHash).toBe(created.codeHash);
    expect(JSON.stringify(insertedValue)).not.toContain(created.code);
    expect(created.expiresAt.toISOString()).toBe("2026-05-07T00:10:00.000Z");
  });

  it("consumes authorization codes once with PKCE S256 verification", async () => {
    vi.resetModules();

    const { createS256CodeChallenge, hashOAuthSecret } = await import("../lib/oauth/crypto");
    const { consumeAuthorizationCode } = await import("../lib/oauth/codes");

    const code = "raw-code";
    const verifier = "verifier-value";
    const challenge = createS256CodeChallenge(verifier);
    const usedAt = new Date("2026-05-07T00:05:00.000Z");

    const whereSelectSpy = vi.fn().mockResolvedValue([
      {
        codeHash: hashOAuthSecret(code),
        clientId: "client_1",
        userId: "user_1",
        redirectUri: "http://localhost:4321/callback",
        codeChallenge: challenge,
        codeChallengeMethod: "S256",
        scope: "mcp:install",
        resource: "https://usetally.xyz/api/mcp",
        expiresAt: new Date("2026-05-07T00:10:00.000Z"),
        usedAt: null,
        createdAt: new Date("2026-05-07T00:00:00.000Z"),
      },
    ]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSelectSpy }) }));

    const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    const consumed = await consumeAuthorizationCode({
      code,
      clientId: "client_1",
      redirectUri: "http://localhost:4321/callback",
      codeVerifier: verifier,
      now: usedAt,
    });

    expect(consumed).toMatchObject({ userId: "user_1", usedAt });
    expect(setSpy).toHaveBeenCalledWith({ usedAt });
  });

  it("rejects reused, expired, or PKCE-invalid authorization codes", async () => {
    vi.resetModules();

    const { createS256CodeChallenge, hashOAuthSecret } = await import("../lib/oauth/crypto");
    const { consumeAuthorizationCode } = await import("../lib/oauth/codes");

    const code = "raw-code";
    const baseRow = {
      codeHash: hashOAuthSecret(code),
      clientId: "client_1",
      userId: "user_1",
      redirectUri: "http://localhost:4321/callback",
      codeChallenge: createS256CodeChallenge("correct-verifier"),
      codeChallengeMethod: "S256",
      scope: "mcp:install",
      resource: "https://usetally.xyz/api/mcp",
      expiresAt: new Date("2026-05-07T00:10:00.000Z"),
      usedAt: null,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
    };

    const whereSelectSpy = vi
      .fn()
      .mockResolvedValueOnce([{ ...baseRow, usedAt: new Date("2026-05-07T00:01:00.000Z") }])
      .mockResolvedValueOnce([{ ...baseRow, expiresAt: new Date("2026-05-07T00:00:01.000Z") }])
      .mockResolvedValueOnce([baseRow]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSelectSpy }) }));
    updateSpy = vi.fn();

    await expect(
      consumeAuthorizationCode({
        code,
        clientId: "client_1",
        redirectUri: "http://localhost:4321/callback",
        codeVerifier: "correct-verifier",
        now: new Date("2026-05-07T00:05:00.000Z"),
      }),
    ).resolves.toBeNull();
    await expect(
      consumeAuthorizationCode({
        code,
        clientId: "client_1",
        redirectUri: "http://localhost:4321/callback",
        codeVerifier: "correct-verifier",
        now: new Date("2026-05-07T00:05:00.000Z"),
      }),
    ).resolves.toBeNull();
    await expect(
      consumeAuthorizationCode({
        code,
        clientId: "client_1",
        redirectUri: "http://localhost:4321/callback",
        codeVerifier: "wrong-verifier",
        now: new Date("2026-05-07T00:05:00.000Z"),
      }),
    ).resolves.toBeNull();

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("creates one-hour access tokens and thirty-day rotating refresh tokens without storing raw tokens", async () => {
    vi.resetModules();

    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { createOAuthTokenPair } = await import("../lib/oauth/tokens");
    const pair = await createOAuthTokenPair({
      clientId: "client_1",
      userId: "user_1",
      scope: "mcp:install",
      resource: "https://usetally.xyz/api/mcp",
      now: new Date("2026-05-07T00:00:00.000Z"),
    });

    expect(pair.tokenType).toBe("Bearer");
    expect(pair.expiresIn).toBe(3600);
    expect(pair.accessTokenExpiresAt.toISOString()).toBe("2026-05-07T01:00:00.000Z");
    expect(pair.refreshTokenExpiresAt.toISOString()).toBe("2026-06-06T00:00:00.000Z");

    const persistedValues = (valuesSpy.mock.calls as unknown[][]).map((call) => call[0] as Record<string, unknown>);
    expect(persistedValues).toHaveLength(2);
    expect(JSON.stringify(persistedValues)).not.toContain(pair.accessToken);
    expect(JSON.stringify(persistedValues)).not.toContain(pair.refreshToken);
    expect(persistedValues[0]).toMatchObject({ tokenHash: pair.accessTokenHash });
    expect(persistedValues[1]).toMatchObject({ tokenHash: pair.refreshTokenHash, rotatedFromHash: null });
  });

  it("validates access tokens by hash, expiry, scope, and resource", async () => {
    vi.resetModules();

    const { hashOAuthSecret } = await import("../lib/oauth/crypto");
    const { validateAccessToken } = await import("../lib/oauth/tokens");

    selectSpy = vi.fn(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            tokenHash: hashOAuthSecret("access-token"),
            clientId: "client_1",
            userId: "user_1",
            scope: "mcp:install",
            resource: "https://usetally.xyz/api/mcp",
            expiresAt: new Date("2026-05-07T01:00:00.000Z"),
            revokedAt: null,
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
          },
        ]),
      }),
    }));

    await expect(
      validateAccessToken({
        accessToken: "access-token",
        requiredScope: "mcp:install",
        resource: "https://usetally.xyz/api/mcp",
        now: new Date("2026-05-07T00:30:00.000Z"),
      }),
    ).resolves.toMatchObject({ userId: "user_1" });
    await expect(
      validateAccessToken({
        accessToken: "access-token",
        requiredScope: "mcp:install",
        now: new Date("2026-05-07T01:00:01.000Z"),
      }),
    ).resolves.toBeNull();
  });

  it("rotates refresh tokens and stores the previous hash only", async () => {
    vi.resetModules();

    const { hashOAuthSecret } = await import("../lib/oauth/crypto");
    const { rotateRefreshToken } = await import("../lib/oauth/tokens");

    const oldHash = hashOAuthSecret("refresh-token");
    selectSpy = vi.fn(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            tokenHash: oldHash,
            clientId: "client_1",
            userId: "user_1",
            scope: "mcp:install",
            resource: "https://usetally.xyz/api/mcp",
            expiresAt: new Date("2026-06-06T00:00:00.000Z"),
            revokedAt: null,
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
            rotatedFromHash: null,
          },
        ]),
      }),
    }));

    const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const rotated = await rotateRefreshToken({
      refreshToken: "refresh-token",
      clientId: "client_1",
      now: new Date("2026-05-08T00:00:00.000Z"),
    });

    expect(rotated).toMatchObject({ tokenType: "Bearer", scope: "mcp:install" });
    expect(setSpy).toHaveBeenCalledWith({ revokedAt: new Date("2026-05-08T00:00:00.000Z") });

    const persistedValues = (valuesSpy.mock.calls as unknown[][]).map((call) => call[0] as Record<string, unknown>);
    expect(persistedValues[1]).toMatchObject({ rotatedFromHash: oldHash });
    expect(JSON.stringify(persistedValues)).not.toContain("refresh-token");
  });
});
