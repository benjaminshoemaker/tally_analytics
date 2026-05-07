import { describe, expect, it, vi } from "vitest";

describe("MCP OAuth metadata routes", () => {
  it("returns protected resource metadata with CORS headers", async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://usetally.xyz";
    vi.resetModules();

    const route = await import("../app/.well-known/oauth-protected-resource/route");

    const response = route.GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    await expect(response.json()).resolves.toEqual({
      resource: "https://usetally.xyz/api/mcp",
      authorization_servers: ["https://usetally.xyz"],
      scopes_supported: ["mcp:install"],
    });

    const options = route.OPTIONS();
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-methods")).toContain("OPTIONS");

    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  it("returns authorization server metadata with endpoints, scopes, grants, and PKCE methods", async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://usetally.xyz";
    vi.resetModules();

    const route = await import("../app/.well-known/oauth-authorization-server/route");

    const response = route.GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    await expect(response.json()).resolves.toEqual({
      issuer: "https://usetally.xyz",
      authorization_endpoint: "https://usetally.xyz/api/oauth/authorize",
      token_endpoint: "https://usetally.xyz/api/oauth/token",
      registration_endpoint: "https://usetally.xyz/api/oauth/register",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["mcp:install"],
    });

    const options = route.OPTIONS();
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-methods")).toContain("GET");

    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });
});
