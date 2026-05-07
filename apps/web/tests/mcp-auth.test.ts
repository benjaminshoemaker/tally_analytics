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

describe("MCP bearer token auth", () => {
  it("does not query tokens when bearer auth is missing", async () => {
    vi.resetModules();

    selectSpy = vi.fn();

    const { verifyMcpBearerToken } = await import("../lib/mcp/auth");
    await expect(verifyMcpBearerToken(new Request("https://usetally.xyz/api/mcp"))).resolves.toBeUndefined();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid OAuth access tokens", async () => {
    vi.resetModules();

    selectSpy = vi.fn(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([]),
      }),
    }));

    const { verifyMcpBearerToken } = await import("../lib/mcp/auth");
    await expect(
      verifyMcpBearerToken(new Request("https://usetally.xyz/api/mcp"), "invalid-token"),
    ).resolves.toBeUndefined();
  });

  it("maps valid OAuth access tokens to the authenticated MCP owner", async () => {
    vi.resetModules();

    const { hashOAuthSecret } = await import("../lib/oauth/crypto");
    const { verifyMcpBearerToken } = await import("../lib/mcp/auth");

    selectSpy = vi.fn(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            tokenHash: hashOAuthSecret("access-token"),
            clientId: "client_1",
            userId: "user_1",
            scope: "mcp:install",
            resource: "https://usetally.xyz/api/mcp",
            expiresAt: new Date("2030-05-07T01:00:00.000Z"),
            revokedAt: null,
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
          },
        ]),
      }),
    }));

    await expect(
      verifyMcpBearerToken(new Request("https://usetally.xyz/api/mcp"), "access-token"),
    ).resolves.toMatchObject({
      token: "access-token",
      clientId: "client_1",
      scopes: ["mcp:install"],
      resource: new URL("https://usetally.xyz/api/mcp"),
      extra: {
        userId: "user_1",
      },
    });
  });
});
