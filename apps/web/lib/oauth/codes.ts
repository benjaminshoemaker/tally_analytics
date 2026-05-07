import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { oauthAuthorizationCodes } from "../db/schema";
import { generateOpaqueToken, hashOAuthSecret, verifyPkceS256 } from "./crypto";

export const AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000;

export type OAuthAuthorizationCodeRecord = typeof oauthAuthorizationCodes.$inferSelect;

export type CreateAuthorizationCodeParams = {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  resource: string;
  now?: Date;
};

export type CreatedAuthorizationCode = {
  code: string;
  codeHash: string;
  expiresAt: Date;
};

export async function createAuthorizationCode(params: CreateAuthorizationCodeParams): Promise<CreatedAuthorizationCode> {
  const now = params.now ?? new Date();
  const code = generateOpaqueToken(32);
  const codeHash = hashOAuthSecret(code);
  const expiresAt = new Date(now.getTime() + AUTHORIZATION_CODE_TTL_MS);

  await db.insert(oauthAuthorizationCodes).values({
    codeHash,
    clientId: params.clientId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    scope: params.scope,
    resource: params.resource,
    expiresAt,
    createdAt: now,
  });

  return { code, codeHash, expiresAt };
}

export async function consumeAuthorizationCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  now?: Date;
}): Promise<OAuthAuthorizationCodeRecord | null> {
  const now = params.now ?? new Date();
  const codeHash = hashOAuthSecret(params.code);
  const rows = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.codeHash, codeHash));

  const row = rows[0];
  if (!row) return null;
  if (row.clientId !== params.clientId) return null;
  if (row.redirectUri !== params.redirectUri) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;
  if (!verifyPkceS256({ verifier: params.codeVerifier, challenge: row.codeChallenge })) return null;

  await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: now })
    .where(eq(oauthAuthorizationCodes.codeHash, codeHash));

  return { ...row, usedAt: now };
}
