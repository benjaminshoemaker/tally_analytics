import { describe, expect, it, vi } from "vitest";

import { registerAnalyticsTaskTools } from "../lib/mcp/tools/analytics-tasks";

vi.mock("../lib/db/queries/projects", () => ({
  buildMcpProjectFingerprintInput: () => ({ source: "mcp_codex", identity: "repo_name", repoName: "repo", packageName: "repo", appRoot: "." }),
  mcpFingerprint: () => "fingerprint",
  normalizeGitRemote: () => null,
  getOwnedAnalyticsProject: vi.fn(),
  resolveOwnedMcpProjectForRepoContext: vi.fn(),
}));

vi.mock("../lib/analytics/tasks/queries", () => ({
  listOwnedAnalyticsTasksForProject: vi.fn(),
  findOwnedAnalyticsTaskById: vi.fn(),
}));

vi.mock("../lib/analytics/tasks/transitions", () => ({
  transitionAnalyticsTask: vi.fn(),
}));

vi.mock("../lib/analytics/tasks/verification", () => ({
  refreshAnalyticsTaskListVerification: vi.fn(),
  refreshAnalyticsTaskVerification: vi.fn(),
}));

function analyticsToolCallback(registerToolSpy: ReturnType<typeof vi.fn>, name: string) {
  const call = registerToolSpy.mock.calls.find((toolCall) => toolCall[0] === name);
  if (!call) throw new Error(`Missing registered tool: ${name}`);
  return call[2] as (input: unknown, extra: { authInfo?: unknown }) => Promise<Record<string, unknown>>;
}

describe("MCP analytics task scope enforcement", () => {
  it("rejects install-only tokens for analytics task tools", async () => {
    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);

    const installOnlyAuth = { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:install"] } };
    const toolNames = [
      "list_pending_analytics_tasks",
      "get_analytics_task_context",
      "report_analytics_task_status",
    ];

    for (const name of toolNames) {
      const callback = analyticsToolCallback(registerToolSpy, name);
      const result = await callback({}, installOnlyAuth);

      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          status: "insufficient_scope",
        },
      });
      const summary = String((result.structuredContent as { summary?: unknown }).summary ?? "");
      expect(summary).toContain("mcp:tasks");
    }
  });
});
