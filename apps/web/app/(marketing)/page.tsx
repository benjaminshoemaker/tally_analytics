import React from "react";

import MarketingFeatures from "../../components/marketing/features";
import MarketingHero from "../../components/marketing/hero";

export const dynamic = "force-static";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6">
        <MarketingHero installUrl={INSTALL_URL} demoUrl="/demo" />
      </div>
      <MarketingFeatures />
    </main>
  );
}

