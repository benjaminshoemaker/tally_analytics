import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { mcpResourceUrl } from "../oauth/metadata";
import { validateAccessToken } from "../oauth/tokens";
import { MCP_INSTALL_SCOPE } from "../oauth/validation";

type OAuthTokenRecord = NonNullable<Awaited<ReturnType<typeof validateAccessToken>>>;

export type TallyMcpAuthExtra = {
  userId: string;
};

export type TallyMcpAuthInfo = AuthInfo & {
  extra: TallyMcpAuthExtra;
};

export function oauthTokenToMcpAuthInfo(params: {
  bearerToken: string;
  record: OAuthTokenRecord;
}): TallyMcpAuthInfo {
  return {
    token: params.bearerToken,
    clientId: params.record.clientId,
    scopes: params.record.scope.split(/\s+/).filter(Boolean),
    expiresAt: Math.floor(params.record.expiresAt.getTime() / 1000),
    resource: new URL(params.record.resource),
    extra: {
      userId: params.record.userId,
    },
  };
}

export async function verifyMcpBearerToken(_request: Request, bearerToken?: string): Promise<TallyMcpAuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const record = await validateAccessToken({
    accessToken: bearerToken,
    requiredScope: MCP_INSTALL_SCOPE,
    resource: mcpResourceUrl(),
  });

  return record ? oauthTokenToMcpAuthInfo({ bearerToken, record }) : undefined;
}
