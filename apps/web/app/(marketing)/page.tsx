import React from 'react';

import MarketingFeatures from '../../components/marketing/features';
import MarketingHero from '../../components/marketing/hero';
import MarketingHowItWorks from '../../components/marketing/how-it-works';
import MarketingProductProof from '../../components/marketing/product-proof';
import MarketingSetAndForget from '../../components/marketing/set-and-forget';
import MarketingWhatYouGet from '../../components/marketing/what-you-get';

const DASHBOARD_IMAGE_SRC = '/marketing/dashboard.png';
const WORKFLOW_IMAGE_SRC = '/marketing/dashboard-workflow.png';

export default function LandingPage() {
  return (
    <main className="flex-grow">
      <MarketingHero docsUrl="/docs/setup" dashboardImageSrc={DASHBOARD_IMAGE_SRC} />

      <MarketingFeatures />

      <MarketingWhatYouGet />

      <MarketingProductProof workflowImageSrc={WORKFLOW_IMAGE_SRC} />

      <MarketingHowItWorks dashboardImageSrc={DASHBOARD_IMAGE_SRC} />

      <MarketingSetAndForget />

      <section className="px-6 py-24 text-center md:px-10 lg:px-40">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 font-display text-4xl font-semibold text-[#1b140d]">
            All the analytics, no hassle.
          </h2>
          <p className="mb-10 text-lg text-[#57534e]">
            Start from Claude Code, Codex, Cursor, or your AI coding agent of choice. Tally handles
            the setup and gives you the dashboard.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-8 text-base font-bold text-white shadow-warm transition-all hover:scale-[0.98] hover:bg-teal-800 hover:shadow-warm-md active:scale-[0.96]"
              href="/docs/setup"
            >
              Start with MCP
            </a>
            <a
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-transparent px-8 text-base font-medium text-[#57534e] transition-colors hover:text-[#1b140d]"
              href="/pricing"
            >
              View pricing →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
