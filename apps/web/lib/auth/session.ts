import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { sessions } from "../db/schema";
import {
  clearSessionCookie,
  getSessionIdFromRequest,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  setSessionCookie,
} from "./cookies";

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export async function createSession(userId: string): Promise<AuthSession> {
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000);

  const rows = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt });

  const session = rows[0];
  if (!session) throw new Error("Failed to create session");

  setSessionCookie(session.id);
  return session;
}

export async function validateSession(request: Request): Promise<AuthSession | null> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;

  const rows = await db
    .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  const session = rows[0];
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session;
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  clearSessionCookie();
}

