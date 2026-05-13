import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let querySpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
  },
}));

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    query: (...args: unknown[]) => {
      if (!querySpy) throw new Error("querySpy not initialized");
      return querySpy(...args);
    },
  })),
}));

describe("MCP OAuth client registration helpers", () => {
  it("accepts HTTPS and localhost loopback redirect URIs", async () => {
    vi.resetModules();

    querySpy = vi.fn().mockResolvedValue(undefined);

    const { registerOAuthClient } = await import("../lib/oauth/clients");
    const registered = await registerOAuthClient({
      redirectUris: ["https://client.example/callback", "http://localhost:4321/callback", "http://127.0.0.1:4321/callback"],
      clientName: "Codex",
      now: new Date("2026-05-07T00:00:00.000Z"),
    });

    expect(registered.clientId).toMatch(/^mcp_/);
    expect(registered.clientIdIssuedAt).toBe(1778112000);
    expect(registered.grantTypes).toEqual(["authorization_code", "refresh_token"]);
    expect(registered.responseTypes).toEqual(["code"]);
    expect(registered.scope).toBe("mcp:install");
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO oauth_clients"),
      expect.arrayContaining([
        registered.clientId,
        "Codex",
        ["https://client.example/callback", "http://localhost:4321/callback", "http://127.0.0.1:4321/callback"],
        ["authorization_code", "refresh_token"],
        ["code"],
        "mcp:install",
      ]),
    );
  });

  it("rejects invalid redirect URIs before inserting a client", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    querySpy = vi.fn(() => {
      throw new Error("pg query called unexpectedly");
    });

    const { registerOAuthClient } = await import("../lib/oauth/clients");

    await expect(registerOAuthClient({ redirectUris: ["http://evil.example/callback"] })).rejects.toThrow(
      /Invalid redirect URI/,
    );
    await expect(registerOAuthClient({ redirectUris: ["javascript:alert(1)"] })).rejects.toThrow(/Invalid redirect URI/);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
  });

  it("rejects unsupported scopes", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    querySpy = vi.fn(() => {
      throw new Error("pg query called unexpectedly");
    });

    const { registerOAuthClient } = await import("../lib/oauth/clients");

    await expect(
      registerOAuthClient({ redirectUris: ["https://client.example/callback"], scope: "mcp:install analytics:read" }),
    ).rejects.toThrow(/Unsupported OAuth scope/);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/oauth/register", () => {
  it("returns dynamic client registration metadata as 201 JSON", async () => {
    vi.resetModules();

    querySpy = vi.fn().mockResolvedValue(undefined);

    const { POST } = await import("../app/api/oauth/register/route");
    const response = await POST(
      new Request("http://localhost/api/oauth/register", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Codex",
          redirect_uris: ["http://localhost:4321/callback"],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          scope: "mcp:install",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      redirect_uris: ["http://localhost:4321/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "mcp:install",
    });
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO oauth_clients"),
      expect.arrayContaining(["Codex", ["http://localhost:4321/callback"], "mcp:install"]),
    );
  });

  it("rejects invalid client metadata before inserting a client", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    querySpy = vi.fn(() => {
      throw new Error("pg query called unexpectedly");
    });

    const { POST } = await import("../app/api/oauth/register/route");
    const response = await POST(
      new Request("http://localhost/api/oauth/register", {
        method: "POST",
        body: JSON.stringify({ redirect_uris: ["http://evil.example/callback"] }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_client_metadata" });
    expect(insertSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
  });
});
