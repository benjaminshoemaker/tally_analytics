import React from "react";

import PricingCard from "../../../components/marketing/pricing-card";

export const dynamic = "force-static";

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

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-4 text-slate-600">
          Start free in minutes. Upgrade when you need higher limits and retention.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} {...tier} ctaHref={INSTALL_URL} />
        ))}
      </div>

      <section className="mt-16 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Compare plans</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-3 pr-4 font-medium">Feature</th>
                <th className="py-3 pr-4 font-medium">Free</th>
                <th className="py-3 pr-4 font-medium">Pro</th>
                <th className="py-3 font-medium">Team</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-4 text-slate-600">Events</td>
                <td className="py-3 pr-4">10,000/mo</td>
                <td className="py-3 pr-4">100,000/mo</td>
                <td className="py-3">1,000,000/mo</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-4 text-slate-600">Projects</td>
                <td className="py-3 pr-4">3</td>
                <td className="py-3 pr-4">10</td>
                <td className="py-3">Unlimited</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-4 text-slate-600">Retention</td>
                <td className="py-3 pr-4">90 days</td>
                <td className="py-3 pr-4">Unlimited</td>
                <td className="py-3">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-slate-600">Support</td>
                <td className="py-3 pr-4">Community</td>
                <td className="py-3 pr-4">Email</td>
                <td className="py-3">Priority</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

