import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerAnalyticsTools } from "./tools/analytics";
import { registerAnalyticsTaskTools } from "./tools/analytics-tasks";
import { registerPrepareNextjsInstallPatchTool } from "./tools/prepare-nextjs-install-patch";

export function registerTallyMcpTools(server: McpServer): void {
  server.registerTool(
    "tally_mcp_smoke",
    {
      title: "Tally MCP Smoke Test",
      description: "Confirms the authenticated Tally MCP endpoint is reachable.",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "Tally MCP is authenticated and ready.",
        },
      ],
    }),
  );

  registerPrepareNextjsInstallPatchTool(server);
  registerAnalyticsTools(server);
  registerAnalyticsTaskTools(server);
}

export function initializeTallyMcpServer(server: McpServer): void {
  registerTallyMcpTools(server);
}
