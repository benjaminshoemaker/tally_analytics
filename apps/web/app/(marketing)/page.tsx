import React from 'react';

import MarketingFeatures from '../../components/marketing/features';
import MarketingHero from '../../components/marketing/hero';
import MarketingHowItWorks from '../../components/marketing/how-it-works';
import MarketingSetAndForget from '../../components/marketing/set-and-forget';
import MarketingWhatYouGet from '../../components/marketing/what-you-get';


const INSTALL_URL = 'https://github.com/apps/tally-analytics-agent';
const DASHBOARD_IMAGE_SRC = '/marketing/dashboard.png';

export default function LandingPage() {
  return (
    <main className="flex-grow">
      <MarketingHero
        installUrl={INSTALL_URL}
        docsUrl="/docs"
        dashboardImageSrc={DASHBOARD_IMAGE_SRC}
      />

      <MarketingFeatures />

      <MarketingWhatYouGet />

      <MarketingHowItWorks dashboardImageSrc={DASHBOARD_IMAGE_SRC} />

      <MarketingSetAndForget />

      <section className="px-6 py-24 text-center md:px-10 lg:px-40">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 font-display text-4xl font-semibold text-[#1b140d]">
            All the analytics, no hassle.
          </h2>
          <p className="mb-10 text-lg text-[#9a734c]">
            Start tracking your Next.js app traffic today. Free for open source projects.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ec7f13] px-8 text-base font-bold text-white shadow-warm transition-all hover:scale-[0.98] hover:bg-orange-600 hover:shadow-warm-md active:scale-[0.96]"
              href={INSTALL_URL}
              rel="noreferrer"
              target="_blank"
            >
              Start for free
            </a>
            <a
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-transparent px-8 text-base font-medium text-[#9a734c] transition-colors hover:text-[#1b140d]"
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
