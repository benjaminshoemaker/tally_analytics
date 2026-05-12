import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { initializeTallyMcpServer } from "../../../lib/mcp/server";
import { oauthIssuer } from "../../../lib/oauth/metadata";
import { verifyMcpBearerToken } from "../../../lib/mcp/auth";

export const runtime = "nodejs";

const mcpHandler = createMcpHandler(
  initializeTallyMcpServer,
  {
    serverInfo: {
      name: "tally-analytics",
      version: "0.1.0",
    },
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: false,
  },
);

const authenticatedMcpHandler = withMcpAuth(mcpHandler, verifyMcpBearerToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
  resourceUrl: oauthIssuer(),
});

export { authenticatedMcpHandler as GET, authenticatedMcpHandler as POST };
