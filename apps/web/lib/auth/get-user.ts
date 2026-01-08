import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "../db/client";
import { sessions, users } from "../db/schema";
import { SESSION_COOKIE_NAME } from "./cookies";
import { validateSession } from "./session";

export type AuthUser = {
  id: string;
  email: string;
};

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const session = await validateSession(request);
  if (!session) return null;

  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, session.userId));
  return rows[0] ?? null;
}

export async function getUserFromSession(): Promise<AuthUser | null> {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const sessionRows = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  const session = sessionRows[0];
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, session.userId));
  return rows[0] ?? null;
}
