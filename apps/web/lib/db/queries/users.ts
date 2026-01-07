import { eq } from "drizzle-orm";

import { db } from "../client";
import { users } from "../schema";

export type FindOrCreateUserByGitHubParams = {
  githubUserId: bigint;
  githubUsername: string;
  githubAvatarUrl: string;
  email: string;
};

export async function findOrCreateUserByGitHub(params: FindOrCreateUserByGitHubParams): Promise<{ id: string }> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.githubUserId, params.githubUserId));
  const existingId = existing[0]?.id;

  if (existingId) {
    await db
      .update(users)
      .set({
        githubUsername: params.githubUsername,
        githubAvatarUrl: params.githubAvatarUrl,
        email: params.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingId));

    return { id: existingId };
  }

  const created = await db
    .insert(users)
    .values({
      githubUserId: params.githubUserId,
      githubUsername: params.githubUsername,
      githubAvatarUrl: params.githubAvatarUrl,
      email: params.email,
    })
    .returning({ id: users.id });

  const id = created[0]?.id;
  if (!id) {
    throw new Error("Failed to create user");
  }

  return { id };
}

export async function getUserById(userId: string): Promise<{
  id: string;
  email: string;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
} | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      githubUsername: users.githubUsername,
      githubAvatarUrl: users.githubAvatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId));

  return rows[0] ?? null;
}

