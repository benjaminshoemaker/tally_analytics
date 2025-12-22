import { and, eq } from "drizzle-orm";

import { getInstallationAccessToken, type GitHubInstallationAccessToken } from "../../github/app";
import { db } from "../client";
import { githubTokens } from "../schema";

export type UpsertInstallationTokenParams = {
  userId: string;
  installationId: bigint;
  token: string;
  expiresAt: Date;
};

export async function upsertInstallationLink(params: { userId: string; installationId: bigint }): Promise<void> {
  await db
    .insert(githubTokens)
    .values({ userId: params.userId, installationId: params.installationId })
    .onConflictDoUpdate({
      target: githubTokens.installationId,
      set: { userId: params.userId },
    });
}

export async function upsertInstallationToken(params: UpsertInstallationTokenParams): Promise<void> {
  await db
    .insert(githubTokens)
    .values({
      userId: params.userId,
      installationId: params.installationId,
      installationAccessToken: params.token,
      installationTokenExpiresAt: params.expiresAt,
    })
    .onConflictDoUpdate({
      target: githubTokens.installationId,
      set: {
        userId: params.userId,
        installationAccessToken: params.token,
        installationTokenExpiresAt: params.expiresAt,
      },
    });
}

export type StoredInstallationToken = {
  token: string;
  expiresAt: Date;
};

export async function getStoredInstallationToken(params: {
  userId: string;
  installationId: bigint;
  now?: Date;
}): Promise<StoredInstallationToken | null> {
  const now = params.now ?? new Date();

  const rows = await db
    .select({
      token: githubTokens.installationAccessToken,
      expiresAt: githubTokens.installationTokenExpiresAt,
    })
    .from(githubTokens)
    .where(and(eq(githubTokens.userId, params.userId), eq(githubTokens.installationId, params.installationId)));

  const row = rows[0];
  if (!row?.token || !row.expiresAt) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;

  return { token: row.token, expiresAt: row.expiresAt };
}

function toSafeNumber(value: bigint): number {
  const asNumber = Number(value);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error(`Installation ID is too large to safely convert to number: ${value.toString()}`);
  }
  return asNumber;
}

export type RefreshInstallationAccessTokenFn = (installationId: number) => Promise<GitHubInstallationAccessToken>;

export async function getOrRefreshInstallationToken(params: {
  userId: string;
  installationId: bigint;
  now?: Date;
  refreshInstallationAccessToken?: RefreshInstallationAccessTokenFn;
}): Promise<StoredInstallationToken> {
  const now = params.now ?? new Date();
  const existing = await getStoredInstallationToken({ userId: params.userId, installationId: params.installationId, now });
  if (existing) return existing;

  const refresh = params.refreshInstallationAccessToken ?? getInstallationAccessToken;
  const installationId = toSafeNumber(params.installationId);
  const refreshed = await refresh(installationId);

  const expiresAt = new Date(refreshed.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error(`Invalid refreshed installation token expiry: ${JSON.stringify(refreshed.expiresAt)}`);
  }

  await upsertInstallationToken({
    userId: params.userId,
    installationId: params.installationId,
    token: refreshed.token,
    expiresAt,
  });

  return { token: refreshed.token, expiresAt };
}
