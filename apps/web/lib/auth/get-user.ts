import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { users } from "../db/schema";
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

