import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createSession } from "../../../../lib/auth/session";
import { db } from "../../../../lib/db/client";
import { magicLinks, users } from "../../../../lib/db/schema";

function redirectToLogin(request: Request, error: "invalid_token" | "expired_token"): Response {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length !== 64) {
    return redirectToLogin(request, "invalid_token");
  }

  const linkRows = await db
    .select({
      id: magicLinks.id,
      email: magicLinks.email,
      expiresAt: magicLinks.expiresAt,
      usedAt: magicLinks.usedAt,
    })
    .from(magicLinks)
    .where(eq(magicLinks.token, token));

  const link = linkRows[0];
  if (!link) return redirectToLogin(request, "invalid_token");
  if (link.usedAt) return redirectToLogin(request, "invalid_token");
  if (link.expiresAt.getTime() <= Date.now()) return redirectToLogin(request, "expired_token");

  const normalizedEmail = link.email.trim().toLowerCase();
  const userRows = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));

  let userId = userRows[0]?.id;
  if (!userId) {
    const createdRows = await db.insert(users).values({ email: normalizedEmail }).returning({ id: users.id });
    userId = createdRows[0]?.id;
    if (!userId) throw new Error("Failed to create user");
  }

  await db
    .update(magicLinks)
    .set({ usedAt: new Date() })
    .where(and(eq(magicLinks.id, link.id), isNull(magicLinks.usedAt)));

  await createSession(userId);

  return NextResponse.redirect(new URL("/projects", request.url));
}
