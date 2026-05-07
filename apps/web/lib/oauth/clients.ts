import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { oauthClients } from "../db/schema";
import { generateOpaqueToken } from "./crypto";
import { assertValidRedirectUris, MCP_INSTALL_SCOPE, normalizeOAuthScope } from "./validation";

export type OAuthClientRecord = typeof oauthClients.$inferSelect;

export type RegisterOAuthClientParams = {
  redirectUris: string[];
  clientName?: string | null;
  scope?: string | null;
  grantTypes?: string[] | null;
  responseTypes?: string[] | null;
  now?: Date;
};

export type RegisteredOAuthClient = {
  clientId: string;
  clientIdIssuedAt: number;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scope: typeof MCP_INSTALL_SCOPE;
};

export async function registerOAuthClient(params: RegisterOAuthClientParams): Promise<RegisteredOAuthClient> {
  assertValidRedirectUris(params.redirectUris);

  const now = params.now ?? new Date();
  const clientId = `mcp_${generateOpaqueToken(24)}`;
  const scope = normalizeOAuthScope(params.scope);
  const grantTypes = params.grantTypes?.length ? params.grantTypes : ["authorization_code", "refresh_token"];
  const responseTypes = params.responseTypes?.length ? params.responseTypes : ["code"];

  await db.insert(oauthClients).values({
    clientId,
    clientName: params.clientName ?? null,
    redirectUris: params.redirectUris,
    grantTypes,
    responseTypes,
    scope,
    createdAt: now,
    updatedAt: now,
  });

  return {
    clientId,
    clientIdIssuedAt: Math.floor(now.getTime() / 1000),
    redirectUris: params.redirectUris,
    grantTypes,
    responseTypes,
    scope,
  };
}

export async function getOAuthClient(clientId: string): Promise<OAuthClientRecord | null> {
  const rows = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
  return rows[0] ?? null;
}
