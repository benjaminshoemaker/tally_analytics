import type { TallyMcpAuthInfo } from "../auth";
import type { McpOAuthScope } from "../../oauth/validation";

export function userIdFromAuth(authInfo: unknown): string | null {
  const auth = authInfo as Partial<TallyMcpAuthInfo> | undefined;
  const userId = auth?.extra?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export function hasMcpScope(authInfo: unknown, requiredScope: McpOAuthScope): boolean {
  const auth = authInfo as Partial<TallyMcpAuthInfo> | undefined;
  const scopes = auth?.scopes;
  if (!Array.isArray(scopes)) return false;
  return scopes.includes(requiredScope);
}
