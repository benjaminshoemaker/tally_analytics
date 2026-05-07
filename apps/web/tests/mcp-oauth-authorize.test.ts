import { describe, expect, it, vi } from "vitest";

let getOAuthClientSpy: ReturnType<typeof vi.fn> | undefined;
let validateSessionSpy: ReturnType<typeof vi.fn> | undefined;
let createAuthorizationCodeSpy: ReturnType<typeof vi.fn> | undefined;
let getUserByIdSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/oauth/clients", () => ({
  getOAuthClient: (...args: unknown[]) => {
    if (!getOAuthClientSpy) throw new Error("getOAuthClientSpy not initialized");
    return getOAuthClientSpy(...args);
  },
}));

vi.mock("../lib/auth/session", () => ({
  validateSession: (...args: unknown[]) => {
    if (!validateSessionSpy) throw new Error("validateSessionSpy not initialized");
    return validateSessionSpy(...args);
  },
}));

vi.mock("../lib/oauth/codes", () => ({
  createAuthorizationCode: (...args: unknown[]) => {
    if (!createAuthorizationCodeSpy) throw new Error("createAuthorizationCodeSpy not initialized");
    return createAuthorizationCodeSpy(...args);
  },
}));

vi.mock("../lib/db/queries/users", () => ({
  getUserById: (...args: unknown[]) => {
    if (!getUserByIdSpy) throw new Error("getUserByIdSpy not initialized");
    return getUserByIdSpy(...args);
  },
}));

const redirectUri = "http://localhost:4321/callback";
const resource = "https://usetally.xyz/api/mcp";
const e2eUserId = "11111111-1111-1111-1111-111111111111";

function clientRecord() {
  return {
    clientId: "client_1",
    clientName: "Codex",
    redirectUris: [redirectUri],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    scope: "mcp:install",
    createdAt: new Date("2026-05-07T00:00:00.000Z"),
    updatedAt: new Date("2026-05-07T00:00:00.000Z"),
  };
}

function authorizeUrl(overrides: Record<string, string> = {}): string {
  const url = new URL("http://localhost/api/oauth/authorize");
  const params = {
    client_id: "client_1",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "mcp:install",
    resource,
    code_challenge: "a".repeat(43),
    code_challenge_method: "S256",
    state: "state_1",
    ...overrides,
  };

  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function withE2EEnv(params: {
  testMode?: string;
  nodeEnv?: string;
  userId?: string;
}): () => void {
  const previousMode = process.env.E2E_TEST_MODE;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUserId = process.env.E2E_MCP_AUTH_USER_ID;

  if (params.testMode === undefined) delete process.env.E2E_TEST_MODE;
  else process.env.E2E_TEST_MODE = params.testMode;
  if (params.nodeEnv === undefined) delete (process.env as any).NODE_ENV;
  else (process.env as any).NODE_ENV = params.nodeEnv;
  if (params.userId === undefined) delete process.env.E2E_MCP_AUTH_USER_ID;
  else process.env.E2E_MCP_AUTH_USER_ID = params.userId;

  return () => {
    if (previousMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = previousMode;
    if (previousNodeEnv === undefined) delete (process.env as any).NODE_ENV;
    else (process.env as any).NODE_ENV = previousNodeEnv;
    if (previousUserId === undefined) delete process.env.E2E_MCP_AUTH_USER_ID;
    else process.env.E2E_MCP_AUTH_USER_ID = previousUserId;
  };
}

function hostRequest(host: string, overrides?: Record<string, string>): Request {
  return new Request(authorizeUrl(overrides), {
    headers: {
      host,
      "x-forwarded-host": "usetally.xyz",
      "x-e2e-mcp-auth-user-id": "request_supplied_user_must_be_ignored",
    },
  });
}

describe("GET /api/oauth/authorize", () => {
  it("redirects unauthenticated users to GitHub login with the OAuth request in return_to", async () => {
    vi.resetModules();

    getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
    validateSessionSpy = vi.fn().mockResolvedValue(null);
    createAuthorizationCodeSpy = vi.fn();

    const { GET } = await import("../app/api/oauth/authorize/route");
    const response = await GET(new Request(authorizeUrl()));

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/api/auth/github");
    expect(location.searchParams.get("return_to")).toContain("/api/oauth/authorize?");
    expect(location.searchParams.get("return_to")).toContain("client_id=client_1");
    expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
  });

  it("creates an authorization code for authenticated users and redirects back to the client", async () => {
    vi.resetModules();

    getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
    validateSessionSpy = vi.fn().mockResolvedValue({
      id: "session_1",
      userId: "user_1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    createAuthorizationCodeSpy = vi.fn().mockResolvedValue({
      code: "code_1",
      codeHash: "hash_1",
      expiresAt: new Date("2026-05-07T00:10:00.000Z"),
    });

    const { GET } = await import("../app/api/oauth/authorize/route");
    const response = await GET(new Request(authorizeUrl()));

    expect(createAuthorizationCodeSpy).toHaveBeenCalledWith({
      clientId: "client_1",
      userId: "user_1",
      redirectUri,
      codeChallenge: "a".repeat(43),
      codeChallengeMethod: "S256",
      scope: "mcp:install",
      resource,
    });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe(redirectUri);
    expect(location.searchParams.get("code")).toBe("code_1");
    expect(location.searchParams.get("state")).toBe("state_1");
  });

  it("defaults missing resource to the MCP resource URL for Codex OAuth clients", async () => {
    vi.resetModules();

    getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
    validateSessionSpy = vi.fn().mockResolvedValue({
      id: "session_1",
      userId: "user_1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    createAuthorizationCodeSpy = vi.fn().mockResolvedValue({
      code: "code_1",
      codeHash: "hash_1",
      expiresAt: new Date("2026-05-07T00:10:00.000Z"),
    });

    const requestUrl = new URL(authorizeUrl());
    requestUrl.searchParams.delete("resource");

    const { GET } = await import("../app/api/oauth/authorize/route");
    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(302);
    expect(createAuthorizationCodeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "https://usetally.xyz/api/mcp",
      }),
    );
  });

  it("auto-authorizes a seeded E2E user on localhost without a session", async () => {
    const restoreEnv = withE2EEnv({ testMode: "1", nodeEnv: "test", userId: e2eUserId });

    try {
      vi.resetModules();

      getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
      validateSessionSpy = vi.fn();
      getUserByIdSpy = vi.fn().mockResolvedValue({
        id: e2eUserId,
        email: "e2e@example.com",
        githubUsername: "e2e",
        githubAvatarUrl: null,
      });
      createAuthorizationCodeSpy = vi.fn().mockResolvedValue({
        code: "code_e2e",
        codeHash: "hash_e2e",
        expiresAt: new Date("2026-05-07T00:10:00.000Z"),
      });

      const { GET } = await import("../app/api/oauth/authorize/route");
      const response = await GET(hostRequest("localhost:3000"));

      expect(validateSessionSpy).not.toHaveBeenCalled();
      expect(getUserByIdSpy).toHaveBeenCalledWith(e2eUserId);
      expect(createAuthorizationCodeSpy).toHaveBeenCalledWith({
        clientId: "client_1",
        userId: e2eUserId,
        redirectUri,
        codeChallenge: "a".repeat(43),
        codeChallengeMethod: "S256",
        scope: "mcp:install",
        resource,
      });

      expect(response.status).toBe(302);
      const location = new URL(response.headers.get("location") ?? "");
      expect(location.origin + location.pathname).toBe(redirectUri);
      expect(location.searchParams.get("code")).toBe("code_e2e");
      expect(location.searchParams.get("state")).toBe("state_1");
    } finally {
      restoreEnv();
    }
  });

  it("accepts supported localhost hostnames and ignores x-forwarded-host", async () => {
    const restoreEnv = withE2EEnv({ testMode: "1", nodeEnv: "test", userId: e2eUserId });

    try {
      for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
        vi.resetModules();

        getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
        validateSessionSpy = vi.fn();
        getUserByIdSpy = vi.fn().mockResolvedValue({
          id: e2eUserId,
          email: "e2e@example.com",
          githubUsername: "e2e",
          githubAvatarUrl: null,
        });
        createAuthorizationCodeSpy = vi.fn().mockResolvedValue({
          code: `code_${host}`,
          codeHash: "hash_e2e",
          expiresAt: new Date("2026-05-07T00:10:00.000Z"),
        });

        const { GET } = await import("../app/api/oauth/authorize/route");
        const response = await GET(hostRequest(host));

        expect(response.status).toBe(302);
        expect(validateSessionSpy).not.toHaveBeenCalled();
        expect(getUserByIdSpy).toHaveBeenCalledWith(e2eUserId);
      }
    } finally {
      restoreEnv();
    }
  });

  it("returns 403 for E2E auto-authorize in production", async () => {
    const restoreEnv = withE2EEnv({ testMode: "1", nodeEnv: "production", userId: e2eUserId });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      vi.resetModules();

      getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
      validateSessionSpy = vi.fn();
      getUserByIdSpy = vi.fn();
      createAuthorizationCodeSpy = vi.fn();

      const { GET } = await import("../app/api/oauth/authorize/route");
      const response = await GET(hostRequest("localhost:3000"));

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "e2e_auto_authorize_forbidden" });
      expect(warnSpy).toHaveBeenCalledWith("MCP OAuth E2E auto-authorize blocked", { reason: "production" });
      expect(getUserByIdSpy).not.toHaveBeenCalled();
      expect(validateSessionSpy).not.toHaveBeenCalled();
      expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      restoreEnv();
    }
  });

  it("returns 403 when E2E auto-authorize is enabled from a non-localhost host", async () => {
    const restoreEnv = withE2EEnv({ testMode: "1", nodeEnv: "test", userId: e2eUserId });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      vi.resetModules();

      getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
      validateSessionSpy = vi.fn();
      getUserByIdSpy = vi.fn();
      createAuthorizationCodeSpy = vi.fn();

      const { GET } = await import("../app/api/oauth/authorize/route");
      const response = await GET(hostRequest("usetally.xyz"));

      expect(response.status).toBe(403);
      expect(warnSpy).toHaveBeenCalledWith("MCP OAuth E2E auto-authorize blocked", {
        reason: "non_localhost_host",
      });
      expect(getUserByIdSpy).not.toHaveBeenCalled();
      expect(validateSessionSpy).not.toHaveBeenCalled();
      expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      restoreEnv();
    }
  });

  it("returns 403 when E2E auto-authorize has no configured user id or the user is missing", async () => {
    for (const userId of [undefined, e2eUserId]) {
      const restoreEnv = withE2EEnv({ testMode: "1", nodeEnv: "test", userId });
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      try {
        vi.resetModules();

        getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
        validateSessionSpy = vi.fn();
        getUserByIdSpy = vi.fn().mockResolvedValue(null);
        createAuthorizationCodeSpy = vi.fn();

        const { GET } = await import("../app/api/oauth/authorize/route");
        const response = await GET(hostRequest("localhost:3000"));

        expect(response.status).toBe(403);
        expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
        expect(validateSessionSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
        restoreEnv();
      }
    }
  });

  it("returns 403 instead of 500 when the E2E auto-authorize user lookup fails", async () => {
    const restoreEnv = withE2EEnv({ testMode: "1", nodeEnv: "test", userId: e2eUserId });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      vi.resetModules();

      getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
      validateSessionSpy = vi.fn();
      getUserByIdSpy = vi.fn().mockRejectedValue(new Error("database unavailable"));
      createAuthorizationCodeSpy = vi.fn();

      const { GET } = await import("../app/api/oauth/authorize/route");
      const response = await GET(hostRequest("localhost:3000"));

      expect(response.status).toBe(403);
      expect(warnSpy).toHaveBeenCalledWith("MCP OAuth E2E auto-authorize blocked", {
        reason: "user_lookup_failed",
      });
      expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
      expect(validateSessionSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      restoreEnv();
    }
  });

  it("does not enable auto-authorize from request-supplied fields when E2E mode is unset", async () => {
    const restoreEnv = withE2EEnv({ testMode: undefined, nodeEnv: "test", userId: e2eUserId });

    try {
      vi.resetModules();

      getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
      validateSessionSpy = vi.fn().mockResolvedValue(null);
      getUserByIdSpy = vi.fn();
      createAuthorizationCodeSpy = vi.fn();

      const { GET } = await import("../app/api/oauth/authorize/route");
      const response = await GET(hostRequest("localhost:3000", { e2e_auto_authorize: "1" }));

      expect(response.status).toBe(302);
      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe("/api/auth/github");
      expect(getUserByIdSpy).not.toHaveBeenCalled();
      expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
    } finally {
      restoreEnv();
    }
  });

  it("rejects unknown clients or unregistered redirect URIs without redirecting to the client", async () => {
    vi.resetModules();

    getOAuthClientSpy = vi.fn().mockResolvedValue(null);
    validateSessionSpy = vi.fn();
    createAuthorizationCodeSpy = vi.fn();

    const { GET } = await import("../app/api/oauth/authorize/route");
    const response = await GET(new Request(authorizeUrl()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_client" });
    expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
  });

  it("redirects invalid resource and scope requests back with OAuth error params", async () => {
    vi.resetModules();

    getOAuthClientSpy = vi.fn().mockResolvedValue(clientRecord());
    validateSessionSpy = vi.fn();
    createAuthorizationCodeSpy = vi.fn();

    const { GET } = await import("../app/api/oauth/authorize/route");
    const response = await GET(new Request(authorizeUrl({ resource: "notaurl", scope: "analytics:read" })));

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe(redirectUri);
    expect(location.searchParams.get("error")).toBe("invalid_request");
    expect(location.searchParams.get("state")).toBe("state_1");
    expect(createAuthorizationCodeSpy).not.toHaveBeenCalled();
  });
});
