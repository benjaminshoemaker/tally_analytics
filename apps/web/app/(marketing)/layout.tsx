import React from "react";

import MarketingFooter from "../../components/marketing/footer";
import MarketingNavbar from "../../components/marketing/navbar";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#fcfaf8] font-display text-[#1b140d] selection:bg-[#ec7f13]/20 selection:text-[#ec7f13] dark:bg-[#1b140d] dark:text-[#ede0d4]">
      <MarketingNavbar installUrl={INSTALL_URL} />
      {children}
      <MarketingFooter githubUrl={INSTALL_URL} />
    </div>
  );
}
