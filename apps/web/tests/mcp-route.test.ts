import { describe, expect, it, vi } from "vitest";

let createMcpHandlerSpy: ReturnType<typeof vi.fn> | undefined;
let withMcpAuthSpy: ReturnType<typeof vi.fn> | undefined;
let prepareNextjsInstallPatchSpy: ReturnType<typeof vi.fn> | undefined;

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

vi.mock("../lib/mcp/next-install/prepare-nextjs-install-patch", () => ({
  prepareNextjsInstallPatch: (...args: unknown[]) => {
    if (!prepareNextjsInstallPatchSpy) throw new Error("prepareNextjsInstallPatchSpy not initialized");
    return prepareNextjsInstallPatchSpy(...args);
  },
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

  it("registers prepare_nextjs_install_patch and returns structured ready content", async () => {
    vi.resetModules();

    prepareNextjsInstallPatchSpy = vi.fn().mockResolvedValue({
      status: "ready",
      projectId: "proj_123",
      dashboardUrl: "https://usetally.xyz/projects/proj_123",
      patchFormat: "unified_diff_v1",
      unifiedDiff: "diff --git a/package.json b/package.json\n",
      filesChanged: ["package.json", "components/tally-analytics.tsx", "app/layout.tsx"],
      packageInstallCommand: "pnpm install",
      verification: ["Apply the unified diff with git apply --check before git apply."],
    });
    const registerToolSpy = vi.fn();
    const { registerTallyMcpTools } = await import("../lib/mcp/server");

    registerTallyMcpTools({ registerTool: registerToolSpy } as never);

    const prepareCall = registerToolSpy.mock.calls.find((call) => call[0] === "prepare_nextjs_install_patch");
    expect(prepareCall).toBeTruthy();
    expect(prepareCall?.[1]).toEqual(
      expect.objectContaining({
        title: "Prepare Next.js Install Patch",
        inputSchema: expect.any(Object),
      }),
    );

    const callback = prepareCall?.[2] as (
      input: unknown,
      extra: { authInfo: { extra: { userId: string } } },
    ) => Promise<{
      structuredContent: Record<string, unknown>;
      content: Array<{ type: "text"; text: string }>;
    }>;
    const result = await callback(
      { repo: {}, framework: {}, files: {} },
      { authInfo: { extra: { userId: "user_1" } } },
    );

    expect(prepareNextjsInstallPatchSpy).toHaveBeenCalledWith({
      userId: "user_1",
      input: { repo: {}, framework: {}, files: {} },
    });
    expect(result.structuredContent).toMatchObject({
      status: "ready",
      projectId: "proj_123",
      dashboardUrl: "https://usetally.xyz/projects/proj_123",
      patchFormat: "unified_diff_v1",
      unifiedDiff: expect.any(String),
      filesChanged: expect.any(Array),
      packageInstallCommand: "pnpm install",
      verification: expect.any(Array),
    });
    expect(result.content[0]?.text).toContain("Ready");
  });

  it("shapes unsupported, needs-context, and already-installed tool responses", async () => {
    vi.resetModules();

    const { toMcpToolResult } = await import("../lib/mcp/tools/prepare-nextjs-install-patch");

    expect(
      toMcpToolResult({ status: "unsupported", reason: "unsupported_framework", message: "not next" }).structuredContent,
    ).toEqual({ status: "unsupported", reason: "unsupported_framework", message: "not next" });
    const needsContextText = toMcpToolResult({ status: "needs_context", missingFiles: ["app/layout.tsx"] }).content[0];
    expect(needsContextText).toMatchObject({ type: "text", text: expect.stringContaining("Needs context") });
    expect(
      toMcpToolResult({
        status: "already_installed",
        projectId: "proj_123",
        dashboardUrl: "https://usetally.xyz/projects/proj_123",
        unifiedDiff: "",
      }).structuredContent,
    ).toEqual({
      status: "already_installed",
      projectId: "proj_123",
      dashboardUrl: "https://usetally.xyz/projects/proj_123",
      unifiedDiff: "",
    });
  });
});
