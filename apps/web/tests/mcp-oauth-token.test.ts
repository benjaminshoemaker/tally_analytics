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

describe("POST /api/oauth/token", () => {
  it("exchanges authorization codes for OAuth-compatible bearer tokens", async () => {
    vi.resetModules();

    const { createS256CodeChallenge, hashOAuthSecret } = await import("../lib/oauth/crypto");
    const codeVerifier = "verifier-value";
    const redirectUri = "http://localhost:4321/callback";
    const resource = "https://usetally.xyz/api/mcp";

    selectSpy = vi.fn(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            codeHash: hashOAuthSecret("raw-code"),
            clientId: "client_1",
            userId: "user_1",
            redirectUri,
            codeChallenge: createS256CodeChallenge(codeVerifier),
            codeChallengeMethod: "S256",
            scope: "mcp:install",
            resource,
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
          },
        ]),
      }),
    }));

    const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
    updateSpy = vi.fn(() => ({ set: vi.fn(() => ({ where: whereUpdateSpy })) }));

    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { POST } = await import("../app/api/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "client_1",
      code: "raw-code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      resource,
    });

    const response = await POST(
      new Request("http://localhost/api/oauth/token", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      token_type: "Bearer",
      expires_in: 3600,
      scope: "mcp:install",
    });
    expect(valuesSpy).toHaveBeenCalledTimes(2);
  });

  it("rotates refresh tokens and returns a replacement token pair", async () => {
    vi.resetModules();

    const { hashOAuthSecret } = await import("../lib/oauth/crypto");
    const resource = "https://usetally.xyz/api/mcp";

    selectSpy = vi.fn(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            tokenHash: hashOAuthSecret("refresh-token"),
            clientId: "client_1",
            userId: "user_1",
            scope: "mcp:install",
            resource,
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
            rotatedFromHash: null,
          },
        ]),
      }),
    }));

    const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
    updateSpy = vi.fn(() => ({ set: vi.fn(() => ({ where: whereUpdateSpy })) }));

    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { POST } = await import("../app/api/oauth/token/route");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "client_1",
      refresh_token: "refresh-token",
    });

    const response = await POST(
      new Request("http://localhost/api/oauth/token", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      token_type: "Bearer",
      expires_in: 3600,
      scope: "mcp:install",
    });
    expect(valuesSpy).toHaveBeenCalledTimes(2);
  });

  it("returns OAuth-compatible errors for unsupported grants", async () => {
    vi.resetModules();

    selectSpy = vi.fn();
    insertSpy = vi.fn();
    updateSpy = vi.fn();

    const { POST } = await import("../app/api/oauth/token/route");
    const response = await POST(
      new Request("http://localhost/api/oauth/token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: "client_1" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "unsupported_grant_type" });
  });
});
