import React from "react";

export type MarketingNavbarProps = {
  installUrl: string;
};

export default function MarketingNavbar({ installUrl }: MarketingNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-100 bg-background-light/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-40">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-primary/10 text-primary">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path
                  fill="currentColor"
                  d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-text-main">Tally Analytics</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a className="text-sm font-medium text-text-muted transition-colors hover:text-primary" href="/docs">
              Documentation
            </a>
            <a className="text-sm font-medium text-text-muted transition-colors hover:text-primary" href="/pricing">
              Pricing
            </a>
            <a
              className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
              href={installUrl}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              className="hidden h-9 items-center justify-center rounded border border-stone-200 bg-transparent px-4 text-sm font-medium text-text-main transition-colors hover:bg-stone-50 sm:flex"
              href="/login"
            >
              Log in
            </a>
            <a
              className="flex h-9 items-center justify-center rounded bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
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

