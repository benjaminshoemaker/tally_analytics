import React from "react";

import MarketingFeatures from "../../components/marketing/features";
import MarketingHero from "../../components/marketing/hero";
import MarketingHowItWorks from "../../components/marketing/how-it-works";
import MarketingTestimonial from "../../components/marketing/testimonial";

export const dynamic = "force-static";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";
const DASHBOARD_IMAGE_SRC = "/marketing/dashboard.png";

export default function LandingPage() {
  return (
    <main className="flex-grow">
      <MarketingHero installUrl={INSTALL_URL} docsUrl="/docs" dashboardImageSrc={DASHBOARD_IMAGE_SRC} />

      <section className="border-y border-[#e8e0d9] bg-white/50 py-10 dark:border-[#3e342b] dark:bg-black/10">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <p className="mb-8 text-sm font-medium text-[#9a734c] dark:text-[#d0c0b0]">
            Trusted by developers building on the modern web
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0 md:gap-16">
            <div className="flex items-center gap-2 text-xl font-bold text-stone-700">
              <span className="inline-flex size-7 items-center justify-center rounded bg-stone-200/60">V</span>
              Vercel
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-stone-700">
              <span className="inline-flex size-7 items-center justify-center rounded bg-stone-200/60">S</span>
              Stripe
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-stone-700">
              <span className="inline-flex size-7 items-center justify-center rounded bg-stone-200/60">R</span>
              Raycast
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-stone-700">
              <span className="inline-flex size-7 items-center justify-center rounded bg-stone-200/60">L</span>
              Linear
            </div>
          </div>
        </div>
      </section>

      <MarketingFeatures />

      <MarketingHowItWorks dashboardImageSrc={DASHBOARD_IMAGE_SRC} />

      <MarketingTestimonial />

      <section className="px-6 py-24 text-center md:px-10 lg:px-40">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-4xl font-semibold text-[#1b140d] dark:text-white">Ready to respect your users?</h2>
          <p className="mb-10 text-lg text-[#9a734c] dark:text-[#d0c0b0]">
            Start tracking your Next.js app traffic today. Free for open source projects.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              className="flex h-12 items-center justify-center gap-2 rounded bg-[#ec7f13] px-8 text-base font-bold text-white shadow-warm transition-all hover:scale-[0.98] hover:bg-orange-600"
              href={INSTALL_URL}
              rel="noreferrer"
              target="_blank"
            >
              Start for free
            </a>
            <a
              className="flex h-12 items-center justify-center gap-2 rounded bg-transparent px-8 text-base font-medium text-[#9a734c] transition-colors hover:text-[#1b140d] dark:text-[#d0c0b0] dark:hover:text-white"
              href="mailto:hello@tally.so"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
