import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let valuesSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      insertSpy(...args);
      return {
        values: (...valuesArgs: unknown[]) => {
          if (!valuesSpy) throw new Error("valuesSpy not initialized");
          return valuesSpy(...valuesArgs);
        },
      };
    },
  },
}));

describe("MCP OAuth client registration helpers", () => {
  it("accepts HTTPS and localhost loopback redirect URIs", async () => {
    vi.resetModules();

    insertSpy = vi.fn();
    valuesSpy = vi.fn().mockResolvedValue(undefined);

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
    expect(insertSpy).toHaveBeenCalled();
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: registered.clientId,
        clientName: "Codex",
        redirectUris: [
          "https://client.example/callback",
          "http://localhost:4321/callback",
          "http://127.0.0.1:4321/callback",
        ],
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        scope: "mcp:install",
      }),
    );
  });

  it("rejects invalid redirect URIs before inserting a client", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    valuesSpy = vi.fn();

    const { registerOAuthClient } = await import("../lib/oauth/clients");

    await expect(registerOAuthClient({ redirectUris: ["http://evil.example/callback"] })).rejects.toThrow(
      /Invalid redirect URI/,
    );
    await expect(registerOAuthClient({ redirectUris: ["javascript:alert(1)"] })).rejects.toThrow(/Invalid redirect URI/);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(valuesSpy).not.toHaveBeenCalled();
  });

  it("rejects unsupported scopes", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    valuesSpy = vi.fn();

    const { registerOAuthClient } = await import("../lib/oauth/clients");

    await expect(
      registerOAuthClient({ redirectUris: ["https://client.example/callback"], scope: "mcp:install analytics:read" }),
    ).rejects.toThrow(/Unsupported OAuth scope/);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(valuesSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/oauth/register", () => {
  it("returns dynamic client registration metadata as 201 JSON", async () => {
    vi.resetModules();

    insertSpy = vi.fn();
    valuesSpy = vi.fn().mockResolvedValue(undefined);

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
    expect(insertSpy).toHaveBeenCalled();
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: "Codex",
        redirectUris: ["http://localhost:4321/callback"],
        scope: "mcp:install",
      }),
    );
  });

  it("rejects invalid client metadata before inserting a client", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    valuesSpy = vi.fn();

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
    expect(valuesSpy).not.toHaveBeenCalled();
  });
});
