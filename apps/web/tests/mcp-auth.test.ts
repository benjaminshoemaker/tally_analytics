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
  it("maps valid OAuth access tokens to the authenticated MCP owner", async () => {
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
    ).resolves.toMatchObject({
      clientId: "client_1",
      userId: "user_1",
      scope: "mcp:install",
      resource: "https://usetally.xyz/api/mcp",
    });
  });
});
