import React from "react";

export type MarketingNavbarProps = {
  installUrl: string;
  isLoggedIn: boolean;
};

export default function MarketingNavbar({ installUrl, isLoggedIn }: MarketingNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e8e0d9] bg-[#fcfaf8]/80 backdrop-blur-md dark:border-[#3e342b] dark:bg-[#1b140d]/80">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-40">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-[#ec7f13]/10 text-[#ec7f13]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path
                  fill="currentColor"
                  d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1b140d] dark:text-white">Tally Analytics</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              className="text-sm font-medium text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]"
              href="/docs"
            >
              Documentation
            </a>
            <a
              className="text-sm font-medium text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]"
              href="/pricing"
            >
              Pricing
            </a>
            <a
              className="text-sm font-medium text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]"
              href={installUrl}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              className="hidden h-9 items-center justify-center rounded border border-[#e8e0d9] bg-transparent px-4 text-sm font-medium text-[#1b140d] transition-colors hover:bg-[#f3ede7] dark:border-[#3e342b] dark:text-[#ede0d4] dark:hover:bg-[#2a221b] sm:flex"
              href={isLoggedIn ? "/projects" : "/login"}
            >
              {isLoggedIn ? "Dashboard" : "Log in"}
            </a>
            <a
              className="flex h-9 items-center justify-center rounded bg-[#ec7f13] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
              href={installUrl}
              rel="noreferrer"
              target="_blank"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
