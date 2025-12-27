import React from "react";

type Feature = {
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  { title: "One-click install", description: "GitHub App adds analytics via PR, you just merge" },
  { title: "Privacy-first", description: "No cookies, respects Do Not Track, no consent banner needed" },
  { title: "Real-time dashboard", description: "See page views, top pages, referrers as they happen" },
  { title: "Built for Next.js", description: "Supports App Router and Pages Router automatically" },
  { title: "Lightweight SDK", description: "Under 2KB, no impact on Core Web Vitals" },
  { title: "Your data, your database", description: "Powered by Tinybird, full data ownership" },
];

export default function MarketingFeatures() {
  return (
    <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Everything you need, zero setup.</h2>
          <p className="mt-3 text-slate-600">
            Install the GitHub App, merge a PR, and open a dashboard that updates in real time.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

