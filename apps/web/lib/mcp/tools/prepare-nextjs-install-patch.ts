import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { TallyMcpAuthInfo } from "../auth";
import { prepareNextjsInstallPatch, type PrepareNextjsInstallPatchResult } from "../next-install/prepare-nextjs-install-patch";
import { mcpRepoContextSchema } from "./schemas";

function resultSummary(result: PrepareNextjsInstallPatchResult): string {
  if (result.status === "ready") {
    return `Ready: apply the unified diff for project ${result.projectId}, then open ${result.dashboardUrl}.`;
  }
  if (result.status === "already_installed") {
    return `Already installed: open ${result.dashboardUrl}.`;
  }
  if (result.status === "needs_context") {
    return `Needs context: provide ${result.missingFiles.join(", ")}.`;
  }
  return `Unsupported: ${result.reason}.`;
}

export function toMcpToolResult(result: PrepareNextjsInstallPatchResult): CallToolResult {
  return {
    structuredContent: result as unknown as Record<string, unknown>,
    content: [{ type: "text", text: resultSummary(result) }],
  };
}

function userIdFromAuth(authInfo: unknown): string | null {
  const auth = authInfo as Partial<TallyMcpAuthInfo> | undefined;
  const userId = auth?.extra?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export function registerPrepareNextjsInstallPatchTool(server: McpServer): void {
  server.registerTool(
    "prepare_nextjs_install_patch",
    {
      title: "Prepare Next.js Install Patch",
      description: "Create or reuse a Tally project and return an SDK-based unified diff for a supported Next.js app.",
      inputSchema: mcpRepoContextSchema,
    },
    async (input, extra) => {
      const userId = userIdFromAuth(extra.authInfo);
      if (!userId) {
        return {
          isError: true,
          structuredContent: { status: "unsupported", reason: "authentication_required" },
          content: [{ type: "text", text: "Authentication is required before preparing an install patch." }],
        };
      }

      const result = await prepareNextjsInstallPatch({ userId, input });
      return toMcpToolResult(result);
    },
  );
}
