import { describe, expect, it, vi } from "vitest";

let getOAuthClientSpy: ReturnType<typeof vi.fn> | undefined;
let validateSessionSpy: ReturnType<typeof vi.fn> | undefined;
let createAuthorizationCodeSpy: ReturnType<typeof vi.fn> | undefined;

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

const redirectUri = "http://localhost:4321/callback";
const resource = "https://usetally.xyz/api/mcp";

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
