import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import React from "react";

import { SESSION_COOKIE_NAME } from "../../../lib/auth/cookies";
import { db } from "../../../lib/db/client";
import { sessions, users } from "../../../lib/db/schema";
import { StripeReconcileClient } from "./stripe-reconcile-client";

export default async function SettingsPage() {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!sessionId) {
    return <p className="text-sm text-warm-700">Unauthorized.</p>;
  }

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId ?? null;
  if (!userId) {
    return <p className="text-sm text-warm-700">Unauthorized.</p>;
  }

  const userRows = await db
    .select({
      email: users.email,
      plan: users.plan,
      stripeSubscriptionStatus: users.stripeSubscriptionStatus,
      stripeCancelAtPeriodEnd: users.stripeCancelAtPeriodEnd,
      stripeCurrentPeriodEnd: users.stripeCurrentPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) return <p className="text-sm text-warm-700">Unauthorized.</p>;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2 opacity-0 animate-fade-in">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-warm-900">Account settings</h1>
        <p className="text-sm text-warm-500">Manage your account.</p>
      </header>

      <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm opacity-0 animate-fade-in stagger-1">
        <StripeReconcileClient />
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-warm-500">Email</dt>
            <dd className="font-medium text-warm-900">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-warm-500">Plan</dt>
            <dd className="font-medium text-warm-900">{user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</dd>
          </div>
          {user.stripeSubscriptionStatus ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-warm-500">Billing status</dt>
              <dd className="font-medium text-warm-900">
                {user.stripeSubscriptionStatus.charAt(0).toUpperCase() + user.stripeSubscriptionStatus.slice(1)}
              </dd>
            </div>
          ) : null}
          {user.stripeCurrentPeriodEnd ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-warm-500">Current period end</dt>
              <dd className="font-medium text-warm-900">{user.stripeCurrentPeriodEnd.toISOString().slice(0, 10)}</dd>
            </div>
          ) : null}
          {typeof user.stripeCancelAtPeriodEnd === "boolean" ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-warm-500">Cancel at period end</dt>
              <dd className="font-medium text-warm-900">{user.stripeCancelAtPeriodEnd ? "Yes" : "No"}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm opacity-0 animate-fade-in stagger-2">
        <h2 className="font-display text-sm font-semibold text-warm-900">Billing</h2>
        <p className="mt-1 text-sm text-warm-500">Upgrade, downgrade, or manage your subscription.</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {user.plan === "free" ? (
            <>
              <form action="/api/stripe/checkout" method="post">
                <input type="hidden" name="plan" value="pro" />
                <button type="submit" className="group flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-warm transition-all hover:bg-brand-600 hover:shadow-warm-md active:scale-[0.98]">
                  Upgrade to Pro
                  <svg className="size-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </form>
              <form action="/api/stripe/checkout" method="post">
                <input type="hidden" name="plan" value="team" />
                <button type="submit" className="group flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-4 py-2 text-sm font-medium text-warm-900 shadow-warm transition-all hover:border-warm-300 hover:bg-warm-50 hover:shadow-warm-md active:scale-[0.98]">
                  Upgrade to Team
                  <svg className="size-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <form action="/api/stripe/portal" method="post">
              <button type="submit" className="group flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-warm transition-all hover:bg-brand-600 hover:shadow-warm-md active:scale-[0.98]">
                Manage billing
                <svg className="size-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
