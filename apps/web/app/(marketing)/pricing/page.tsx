import React from "react";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import PricingCard from "../../../components/marketing/pricing-card";
import { SESSION_COOKIE_NAME } from "../../../lib/auth/cookies";
import { db } from "../../../lib/db/client";
import { sessions, users } from "../../../lib/db/schema";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

const TIERS = [
  {
    name: "Free",
    priceLabel: "$0",
    priceSuffix: "forever",
    eventsLabel: "10,000 events/mo",
    projectsLabel: "3",
    retentionLabel: "90 days",
    supportLabel: "Community",
    ctaLabel: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    priceLabel: "$9",
    priceSuffix: "/month",
    eventsLabel: "100,000 events/mo",
    projectsLabel: "10",
    retentionLabel: "Unlimited",
    supportLabel: "Email",
    ctaLabel: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Team",
    priceLabel: "$29",
    priceSuffix: "/month",
    eventsLabel: "1,000,000 events/mo",
    projectsLabel: "Unlimited",
    retentionLabel: "Unlimited",
    supportLabel: "Priority",
    ctaLabel: "Start Free Trial",
    highlighted: false,
  },
] as const;

type PricingCta =
  | { kind: "link"; label: string; href: string }
  | { kind: "checkout"; label: string; plan: "pro" | "team" }
  | { kind: "portal"; label: string }
  | { kind: "disabled"; label: string };

async function getUserPlanFromCookies(): Promise<"free" | "pro" | "team" | null> {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!sessionId) return null;

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId ?? null;
  if (!userId) return null;

  const userRows = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId));
  return (userRows[0]?.plan as "free" | "pro" | "team" | undefined) ?? null;
}

export default async function PricingPage() {
  const userPlan = await getUserPlanFromCookies();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight text-[#1b140d]">Pricing</h1>
        <p className="mt-4 text-lg text-[#9a734c]">
          Start free in minutes. Upgrade when you need higher limits and retention.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {TIERS.map((tier, index) => (
          <div
            key={tier.name}
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {(() => {
              let cta: PricingCta;

              if (!userPlan) {
                cta = { kind: "link", label: tier.ctaLabel, href: INSTALL_URL };
              } else if (tier.name === "Free") {
                cta = { kind: "disabled", label: userPlan === "free" ? "Current plan" : "Included" };
              } else if (userPlan === "free") {
                cta = { kind: "checkout", label: `Upgrade to ${tier.name}`, plan: tier.name === "Pro" ? "pro" : "team" };
              } else {
                cta = { kind: "portal", label: "Manage billing" };
              }

              if (cta.kind === "link") {
                return <PricingCard {...tier} ctaLabel={cta.label} ctaHref={cta.href} />;
              }

              if (cta.kind === "checkout") {
                return (
                  <PricingCard
                    {...tier}
                    ctaLabel={cta.label}
                    ctaForm={{ action: "/api/stripe/checkout", method: "post", hiddenFields: { plan: cta.plan } }}
                  />
                );
              }

              if (cta.kind === "portal") {
                return (
                  <PricingCard {...tier} ctaLabel={cta.label} ctaForm={{ action: "/api/stripe/portal", method: "post" }} />
                );
              }

              return <PricingCard {...tier} ctaLabel={cta.label} ctaHref={INSTALL_URL} ctaDisabled />;
            })()}
          </div>
        ))}
      </div>

      <section className="mt-16 overflow-hidden rounded-xl border border-[#e8e0d9] bg-white shadow-warm">
        <div className="border-b border-[#e8e0d9] bg-[#f3ede7]/50 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-[#1b140d]">Compare plans</h2>
        </div>
        <div className="overflow-x-auto p-6">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8e0d9] text-[#9a734c]">
                <th className="pb-4 pr-4 font-medium">Feature</th>
                <th className="pb-4 pr-4 font-medium">Free</th>
                <th className="pb-4 pr-4 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    Pro
                    <span className="rounded bg-[#ec7f13]/10 px-1.5 py-0.5 text-xs font-semibold text-[#ec7f13]">Popular</span>
                  </span>
                </th>
                <th className="pb-4 font-medium">Team</th>
              </tr>
            </thead>
            <tbody className="text-[#1b140d]">
              <tr className="border-b border-[#f3ede7]">
                <td className="py-4 pr-4 text-[#9a734c]">Events</td>
                <td className="py-4 pr-4">10,000/mo</td>
                <td className="py-4 pr-4 font-medium">100,000/mo</td>
                <td className="py-4">1,000,000/mo</td>
              </tr>
              <tr className="border-b border-[#f3ede7] bg-[#f3ede7]/30">
                <td className="py-4 pr-4 text-[#9a734c]">Projects</td>
                <td className="py-4 pr-4">3</td>
                <td className="py-4 pr-4 font-medium">10</td>
                <td className="py-4">Unlimited</td>
              </tr>
              <tr className="border-b border-[#f3ede7]">
                <td className="py-4 pr-4 text-[#9a734c]">Retention</td>
                <td className="py-4 pr-4">90 days</td>
                <td className="py-4 pr-4 font-medium">Unlimited</td>
                <td className="py-4">Unlimited</td>
              </tr>
              <tr className="bg-[#f3ede7]/30">
                <td className="py-4 pr-4 text-[#9a734c]">Support</td>
                <td className="py-4 pr-4">Community</td>
                <td className="py-4 pr-4 font-medium">Email</td>
                <td className="py-4">Priority</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
