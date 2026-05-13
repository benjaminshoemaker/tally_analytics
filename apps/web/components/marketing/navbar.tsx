import React from 'react';

export type MarketingNavbarProps = {
  authUrl: string;
  githubUrl: string;
  isLoggedIn: boolean;
};

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function MarketingNavbar({ authUrl, githubUrl, isLoggedIn }: MarketingNavbarProps) {
  const authIsExternal = isExternalUrl(authUrl);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e8e0d9] bg-[#fcfaf8]/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-40">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex min-h-11 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-[#0f766e]/10 text-[#0f766e]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path
                  fill="currentColor"
                  d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1b140d]">Tally Analytics</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              className="inline-flex min-h-11 items-center text-sm font-medium text-[#57534e] transition-colors hover:text-[#0f766e]"
              href="/docs"
            >
              Documentation
            </a>
            <a
              className="inline-flex min-h-11 items-center text-sm font-medium text-[#57534e] transition-colors hover:text-[#0f766e]"
              href="/pricing"
            >
              Pricing
            </a>
            <a
              className="inline-flex min-h-11 items-center text-sm font-medium text-[#57534e] transition-colors hover:text-[#0f766e]"
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              className="hidden min-h-11 items-center justify-center rounded-lg border border-[#e8e0d9] bg-transparent px-4 text-sm font-medium text-[#1b140d] transition-all hover:bg-[#f3ede7] active:scale-[0.98] sm:flex"
              href={isLoggedIn ? '/projects' : '/login'}
            >
              {isLoggedIn ? 'Dashboard' : 'Log in'}
            </a>
            <a
              className="flex min-h-11 items-center justify-center rounded-lg bg-[#0f766e] px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-800 active:scale-[0.98]"
              href={authUrl}
              rel={authIsExternal ? 'noreferrer' : undefined}
              target={authIsExternal ? '_blank' : undefined}
            >
              Sign in with GitHub
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
