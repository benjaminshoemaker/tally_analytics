import { describe, expect, it, vi } from "vitest";

let createMcpHandlerSpy: ReturnType<typeof vi.fn> | undefined;
let withMcpAuthSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("mcp-handler", () => ({
  createMcpHandler: (...args: unknown[]) => {
    if (!createMcpHandlerSpy) throw new Error("createMcpHandlerSpy not initialized");
    return createMcpHandlerSpy(...args);
  },
  withMcpAuth: (...args: unknown[]) => {
    if (!withMcpAuthSpy) throw new Error("withMcpAuthSpy not initialized");
    return withMcpAuthSpy(...args);
  },
}));

vi.mock("../lib/mcp/auth", () => ({
  verifyMcpBearerToken: vi.fn(),
}));

describe("/api/mcp route", () => {
  it("creates a Node MCP handler wrapped with required OAuth scope auth", async () => {
    vi.resetModules();

    const rawHandler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrappedHandler = vi.fn().mockResolvedValue(new Response("wrapped"));
    createMcpHandlerSpy = vi.fn(() => rawHandler);
    withMcpAuthSpy = vi.fn(() => wrappedHandler);

    const route = await import("../app/api/mcp/route");

    expect(route.runtime).toBe("nodejs");
    expect(route.GET).toBe(wrappedHandler);
    expect(route.POST).toBe(wrappedHandler);
    expect(createMcpHandlerSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        serverInfo: {
          name: "tally-analytics",
          version: "0.1.0",
        },
      }),
      expect.objectContaining({
        basePath: "/api",
        disableSse: true,
        maxDuration: 60,
        verboseLogs: false,
      }),
    );
    expect(withMcpAuthSpy).toHaveBeenCalledWith(
      rawHandler,
      expect.any(Function),
      expect.objectContaining({
        required: true,
        requiredScopes: ["mcp:install"],
        resourceMetadataPath: "/.well-known/oauth-protected-resource",
      }),
    );
  });

  it("registers a minimal authenticated smoke tool without patch generation", async () => {
    vi.resetModules();

    const registerToolSpy = vi.fn();
    const { registerTallyMcpTools } = await import("../lib/mcp/server");

    registerTallyMcpTools({ registerTool: registerToolSpy } as never);

    expect(registerToolSpy).toHaveBeenCalledWith(
      "tally_mcp_smoke",
      expect.objectContaining({
        title: "Tally MCP Smoke Test",
        inputSchema: {},
      }),
      expect.any(Function),
    );

    const callback = registerToolSpy.mock.calls[0]?.[2] as () => Promise<{
      content: Array<{ type: "text"; text: string }>;
    }>;
    await expect(callback()).resolves.toEqual({
      content: [{ type: "text", text: "Tally MCP is authenticated and ready." }],
    });
  });
});
