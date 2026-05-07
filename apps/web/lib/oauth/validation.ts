export const MCP_INSTALL_SCOPE = "mcp:install";
export const PKCE_S256_METHOD = "S256";

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

export function normalizeOAuthScope(scope: string | null | undefined): typeof MCP_INSTALL_SCOPE {
  const value = scope?.trim() || MCP_INSTALL_SCOPE;
  const scopes = value.split(/\s+/).filter(Boolean);
  if (scopes.length !== 1 || scopes[0] !== MCP_INSTALL_SCOPE) {
    throw new Error(`Unsupported OAuth scope: ${value}`);
  }
  return MCP_INSTALL_SCOPE;
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
