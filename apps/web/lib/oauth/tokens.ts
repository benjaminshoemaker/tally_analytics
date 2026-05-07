import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { oauthAccessTokens, oauthRefreshTokens } from "../db/schema";
import { generateOpaqueToken, hashOAuthSecret } from "./crypto";

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type OAuthAccessTokenRecord = typeof oauthAccessTokens.$inferSelect;
export type OAuthRefreshTokenRecord = typeof oauthRefreshTokens.$inferSelect;

export type OAuthTokenPair = {
  accessToken: string;
  accessTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  tokenType: "Bearer";
  expiresIn: number;
  scope: string;
};

export async function createOAuthTokenPair(params: {
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
  now?: Date;
  rotatedFromHash?: string | null;
}): Promise<OAuthTokenPair> {
  const now = params.now ?? new Date();
  const accessToken = generateOpaqueToken(32);
  const refreshToken = generateOpaqueToken(32);
  const accessTokenHash = hashOAuthSecret(accessToken);
  const refreshTokenHash = hashOAuthSecret(refreshToken);
  const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  await db.insert(oauthAccessTokens).values({
    tokenHash: accessTokenHash,
    clientId: params.clientId,
    userId: params.userId,
    scope: params.scope,
    resource: params.resource,
    expiresAt: accessTokenExpiresAt,
    createdAt: now,
  });

  await db.insert(oauthRefreshTokens).values({
    tokenHash: refreshTokenHash,
    clientId: params.clientId,
    userId: params.userId,
    scope: params.scope,
    resource: params.resource,
    expiresAt: refreshTokenExpiresAt,
    createdAt: now,
    rotatedFromHash: params.rotatedFromHash ?? null,
  });

  return {
    accessToken,
    accessTokenHash,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenHash,
    refreshTokenExpiresAt,
    tokenType: "Bearer",
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: params.scope,
  };
}

export async function validateAccessToken(params: {
  accessToken: string;
  requiredScope?: string;
  resource?: string;
  now?: Date;
}): Promise<OAuthAccessTokenRecord | null> {
  const now = params.now ?? new Date();
  const tokenHash = hashOAuthSecret(params.accessToken);
  const rows = await db.select().from(oauthAccessTokens).where(eq(oauthAccessTokens.tokenHash, tokenHash));
  const row = rows[0];

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;
  if (params.requiredScope && !row.scope.split(/\s+/).includes(params.requiredScope)) return null;
  if (params.resource && row.resource !== params.resource) return null;

  return row;
}

export async function rotateRefreshToken(params: {
  refreshToken: string;
  clientId: string;
  now?: Date;
}): Promise<OAuthTokenPair | null> {
  const now = params.now ?? new Date();
  const refreshTokenHash = hashOAuthSecret(params.refreshToken);
  const rows = await db.select().from(oauthRefreshTokens).where(eq(oauthRefreshTokens.tokenHash, refreshTokenHash));
  const row = rows[0];

  if (!row) return null;
  if (row.clientId !== params.clientId) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;

  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: now })
    .where(eq(oauthRefreshTokens.tokenHash, refreshTokenHash));

  return createOAuthTokenPair({
    clientId: row.clientId,
    userId: row.userId,
    scope: row.scope,
    resource: row.resource,
    now,
    rotatedFromHash: refreshTokenHash,
  });
}
