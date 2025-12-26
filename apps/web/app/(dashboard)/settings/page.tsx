import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import React from "react";

import { SESSION_COOKIE_NAME } from "../../../lib/auth/cookies";
import { db } from "../../../lib/db/client";
import { sessions, users } from "../../../lib/db/schema";

export default async function SettingsPage() {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!sessionId) {
    return <p className="text-sm text-slate-700">Unauthorized.</p>;
  }

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId ?? null;
  if (!userId) {
    return <p className="text-sm text-slate-700">Unauthorized.</p>;
  }

  const userRows = await db.select({ email: users.email, plan: users.plan }).from(users).where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) return <p className="text-sm text-slate-700">Unauthorized.</p>;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Account settings</h1>
        <p className="text-sm text-slate-600">Manage your account.</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Email</dt>
            <dd className="font-medium text-slate-900">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Plan</dt>
            <dd className="font-medium text-slate-900">{user.plan}</dd>
          </div>
        </dl>
      </section>

      <form action="/api/auth/logout" method="post">
        <button type="submit" className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          Log out
        </button>
      </form>
    </div>
  );
}

