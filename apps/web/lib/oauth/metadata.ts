import { MCP_INSTALL_SCOPE } from "./validation";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://usetally.xyz").replace(/\/+$/, "");
}

export function oauthIssuer(): string {
  return baseUrl();
}

export function mcpResourceUrl(): string {
  return `${baseUrl()}/api/mcp`;
}

export function protectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [oauthIssuer()],
    scopes_supported: [MCP_INSTALL_SCOPE],
  };
}

export function authorizationServerMetadata() {
  const issuer = oauthIssuer();
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [MCP_INSTALL_SCOPE],
  };
}

export function metadataCorsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
