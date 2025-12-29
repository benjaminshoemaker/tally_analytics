import React from "react";
import { cookies } from "next/headers";

import MarketingFooter from "../../components/marketing/footer";
import MarketingNavbar from "../../components/marketing/navbar";
import { SESSION_COOKIE_NAME } from "../../lib/auth/cookies";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const isLoggedIn = cookies().get(SESSION_COOKIE_NAME) !== undefined;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#fcfaf8] font-display text-[#1b140d] selection:bg-[#ec7f13]/20 selection:text-[#ec7f13] dark:bg-[#1b140d] dark:text-[#ede0d4]">
      <MarketingNavbar installUrl={INSTALL_URL} isLoggedIn={isLoggedIn} />
      {children}
      <MarketingFooter githubUrl={INSTALL_URL} />
    </div>
  );
}
