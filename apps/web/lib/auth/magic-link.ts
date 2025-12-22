import crypto from "node:crypto";

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "../db/client";
import { magicLinks } from "../db/schema";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Missing required environment variable: ${name}`);
}

export async function createMagicLink(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(magicLinks).values({
    email: normalizedEmail,
    token,
    expiresAt,
  });

  const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");
  const verifyUrl = new URL("/api/auth/verify", appUrl);
  verifyUrl.searchParams.set("token", token);
  return verifyUrl.toString();
}

export async function countRecentMagicLinks(email: string, since: Date): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase();

  const rows = await db
    .select({ count: sql`count(*)` })
    .from(magicLinks)
    .where(and(eq(magicLinks.email, normalizedEmail), gte(magicLinks.createdAt, since)));

  const count = rows[0]?.count;
  return Number(count ?? 0);
}
