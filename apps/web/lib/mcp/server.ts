import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
}

export function initializeTallyMcpServer(server: McpServer): void {
  registerTallyMcpTools(server);
}
