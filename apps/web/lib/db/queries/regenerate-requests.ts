import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "../client";
import { regenerateRequests } from "../schema";

export async function countRecentRegenerateRequests(params: { userId: string; projectId: string; since: Date }): Promise<number> {
  const rows = await db
    .select({ count: sql`count(*)` })
    .from(regenerateRequests)
    .where(
      and(
        eq(regenerateRequests.userId, params.userId),
        eq(regenerateRequests.projectId, params.projectId),
        gte(regenerateRequests.createdAt, params.since),
      ),
    );

  const count = rows[0]?.count;
  return Number(count ?? 0);
}

export async function createRegenerateRequest(params: { userId: string; projectId: string }): Promise<void> {
  await db.insert(regenerateRequests).values({ userId: params.userId, projectId: params.projectId });
}

