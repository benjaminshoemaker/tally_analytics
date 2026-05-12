import { describe, expect, it, vi } from "vitest";

import { registerAnalyticsTools } from "../lib/mcp/tools/analytics";

function analyticsToolCallback(registerToolSpy: ReturnType<typeof vi.fn>, name: string) {
  const call = registerToolSpy.mock.calls.find((toolCall) => toolCall[0] === name);
  if (!call) throw new Error(`Missing registered tool: ${name}`);
  return call[2] as (input: unknown, extra: { authInfo?: unknown }) => Promise<Record<string, unknown>>;
}

describe("MCP analytics task scope enforcement", () => {
  it("rejects install-only tokens for analytics task tools", async () => {
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const installOnlyAuth = { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:install"] } };
    const toolNames = ["list_projects", "get_project_overview", "suggest_next_events"];

    for (const name of toolNames) {
      const callback = analyticsToolCallback(registerToolSpy, name);
      const result = await callback({}, installOnlyAuth);

      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          status: "unauthorized",
        },
      });
      const summary = String((result.structuredContent as { summary?: unknown }).summary ?? "");
      expect(summary).toContain("mcp:tasks");
    }
  });
});
