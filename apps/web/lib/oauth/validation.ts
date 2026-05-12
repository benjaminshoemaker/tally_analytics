export const MCP_INSTALL_SCOPE = "mcp:install";
export const MCP_TASKS_SCOPE = "mcp:tasks";
export const PKCE_S256_METHOD = "S256";

export const SUPPORTED_MCP_SCOPES = [MCP_INSTALL_SCOPE, MCP_TASKS_SCOPE] as const;
export type McpOAuthScope = (typeof SUPPORTED_MCP_SCOPES)[number];

const SUPPORTED_MCP_SCOPE_SET = new Set<string>(SUPPORTED_MCP_SCOPES);

export function isValidRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return true;

    if (url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host.startsWith("127.") || host === "[::1]";
  } catch {
    return false;
  }
}

export function assertValidRedirectUris(redirectUris: string[]): void {
  if (redirectUris.length === 0) throw new Error("At least one redirect URI is required");
  for (const redirectUri of redirectUris) {
    if (!isValidRedirectUri(redirectUri)) {
      throw new Error(`Invalid redirect URI: ${redirectUri}`);
    }
  }
}

export function normalizeOAuthScope(scope: string | null | undefined): string {
  const value = scope?.trim() || MCP_INSTALL_SCOPE;
  const requestedScopes = value.split(/\s+/).filter(Boolean);
  const uniqueScopes = Array.from(new Set(requestedScopes));

  if (uniqueScopes.length === 0) return MCP_INSTALL_SCOPE;
  if (uniqueScopes.some((requestedScope) => !SUPPORTED_MCP_SCOPE_SET.has(requestedScope))) {
    throw new Error(`Unsupported OAuth scope: ${value}`);
  }

  return SUPPORTED_MCP_SCOPES.filter((supportedScope) => uniqueScopes.includes(supportedScope)).join(" ");
}

export function hasOAuthScope(scope: string | null | undefined, requiredScope: McpOAuthScope): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).filter(Boolean).includes(requiredScope);
}

export function isRedirectUriRegistered(params: { redirectUri: string; registeredRedirectUris: string[] }): boolean {
  return params.registeredRedirectUris.includes(params.redirectUri);
}

export function assertValidPkce(params: { codeChallenge: string; codeChallengeMethod: string }): void {
  if (params.codeChallengeMethod !== PKCE_S256_METHOD) {
    throw new Error("Only PKCE S256 is supported");
  }
  if (params.codeChallenge.length < 43 || params.codeChallenge.length > 128) {
    throw new Error("Invalid PKCE code challenge length");
  }
}

export function validateResourceUrl(resource: string): string {
  try {
    const url = new URL(resource);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported resource protocol");
    }
    return url.toString();
  } catch {
    throw new Error(`Invalid OAuth resource: ${resource}`);
  }
}
