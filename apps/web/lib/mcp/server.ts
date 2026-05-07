import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
}

export function initializeTallyMcpServer(server: McpServer): void {
  registerTallyMcpTools(server);
}
