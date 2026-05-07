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

describe("MCP OAuth client registration helpers", () => {
  it("accepts HTTPS and localhost loopback redirect URIs", async () => {
    vi.resetModules();

    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

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
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: registered.clientId,
        clientName: "Codex",
        redirectUris: [
          "https://client.example/callback",
          "http://localhost:4321/callback",
          "http://127.0.0.1:4321/callback",
        ],
        scope: "mcp:install",
      }),
    );
  });

  it("rejects invalid redirect URIs before inserting a client", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });

    const { registerOAuthClient } = await import("../lib/oauth/clients");

    await expect(registerOAuthClient({ redirectUris: ["http://evil.example/callback"] })).rejects.toThrow(
      /Invalid redirect URI/,
    );
    await expect(registerOAuthClient({ redirectUris: ["javascript:alert(1)"] })).rejects.toThrow(/Invalid redirect URI/);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rejects unsupported scopes", async () => {
    vi.resetModules();

    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });

    const { registerOAuthClient } = await import("../lib/oauth/clients");

    await expect(
      registerOAuthClient({ redirectUris: ["https://client.example/callback"], scope: "mcp:install analytics:read" }),
    ).rejects.toThrow(/Unsupported OAuth scope/);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
