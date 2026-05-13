import React from 'react';
import { cookies } from 'next/headers';

import MarketingFooter from '../../components/marketing/footer';
import MarketingNavbar from '../../components/marketing/navbar';
import { SESSION_COOKIE_NAME } from '../../lib/auth/cookies';

const AUTH_URL = '/api/auth/github';
const GITHUB_APP_URL = 'https://github.com/apps/tally-analytics-agent';

// Force dynamic rendering to check session cookie on each request
export const dynamic = 'force-dynamic';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
  const isLoggedIn = typeof sessionId === 'string' && sessionId.length > 0;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#fcfaf8] font-display text-[#1b140d] selection:bg-[#0f766e]/20 selection:text-[#0f766e] dark:bg-[#1b140d] dark:text-[#ede0d4]">
      <MarketingNavbar authUrl={AUTH_URL} githubUrl={GITHUB_APP_URL} isLoggedIn={isLoggedIn} />
      {children}
      <MarketingFooter githubUrl={GITHUB_APP_URL} />
    </div>
  );
}
