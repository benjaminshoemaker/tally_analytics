import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { prepareNextjsInstallPatch, type PrepareNextjsInstallPatchResult } from "../next-install/prepare-nextjs-install-patch";
import { MCP_INSTALL_SCOPE } from "../../oauth/validation";
import { hasMcpScope, userIdFromAuth } from "./auth";
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
      if (!hasMcpScope(extra.authInfo, MCP_INSTALL_SCOPE)) {
        return {
          isError: true,
          structuredContent: { status: "unsupported", reason: "insufficient_scope", requiredScope: MCP_INSTALL_SCOPE },
          content: [{ type: "text", text: "The mcp:install scope is required for this tool." }],
        };
      }

      const result = await prepareNextjsInstallPatch({ userId, input });
      return toMcpToolResult(result);
    },
  );
}
