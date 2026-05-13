import React from 'react';

import AgentInstallTabs from './agent-install-tabs';

export type MarketingHeroProps = {
  docsUrl: string;
  dashboardImageSrc: string;
};

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function MarketingHero({ docsUrl, dashboardImageSrc }: MarketingHeroProps) {
  const docsIsExternal = isExternalUrl(docsUrl);
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-16 md:px-10 md:pb-20 md:pt-24 lg:px-40">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0f766e]/20 bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
              <span className="size-2 animate-pulse rounded-full bg-[#0f766e]" />
              Easiest analytics setup
            </div>

            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-[#1b140d] md:text-6xl">
              The fastest path from no analytics to real usage data.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#57534e] md:text-xl">
              Tally does the analytics setup for you. Connect Claude Code, Codex, Cursor, or your AI
              coding agent of choice, then ask it to add analytics.
            </p>

            <div className="mt-8 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <a
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-8 text-base font-medium text-white shadow-warm transition-all hover:scale-[0.98] hover:bg-teal-800 hover:shadow-warm-md active:scale-[0.96] active:shadow-none"
                href={docsUrl}
                rel={docsIsExternal ? 'noreferrer' : undefined}
                target={docsIsExternal ? '_blank' : undefined}
              >
                Start with MCP
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    fill="currentColor"
                    d="M13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6L13 5z"
                  />
                </svg>
              </a>
              <a
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e8e0d9] bg-white px-8 text-base font-medium text-[#1b140d] shadow-sm transition-all hover:scale-[0.98] hover:bg-[#f3ede7] active:scale-[0.96] active:shadow-none"
                href="#how-it-works"
              >
                See how it works
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['No SDK wiring', 'Your agent applies the patch.'],
                ['You stay in control', 'Approve every local code change.'],
                ['Verify in Tally', 'Deploy and watch for the first event.'],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-lg border border-[#e8e0d9] bg-white p-4 shadow-warm"
                >
                  <p className="text-sm font-semibold text-[#1b140d]">{title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#57534e]">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <AgentInstallTabs />
            <div className="mt-4 rounded-lg border border-[#e8e0d9] bg-[#f3ede7]/40 p-4">
              <h2 className="text-sm font-semibold text-[#1b140d]">What happens next</h2>
              <div className="mt-3 grid gap-3">
                {[
                  'Authenticate with Tally through MCP OAuth.',
                  'Your agent installs the Tally SDK in your app.',
                  'Deploy, visit one or two pages, and confirm events in the dashboard.',
                ].map((item) => (
                  <p
                    key={item}
                    className="flex items-start gap-2 text-xs leading-relaxed text-[#44403c]"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0f766e]/10 text-[#0f766e]">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3">
                        <path
                          fill="currentColor"
                          d="M20.3 5.7 9 17l-5.3-5.3 1.4-1.4L9 14.2 18.9 4.3l1.4 1.4z"
                        />
                      </svg>
                    </span>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="group relative mt-16 w-full md:mt-20">
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-[#0f766e]/20 to-[#e8e0d9] blur opacity-25 transition duration-1000 group-hover:opacity-40 group-hover:duration-200" />
          <div className="relative overflow-hidden rounded-lg border border-[#e8e0d9] bg-white shadow-warm-lg">
            <div className="flex items-center gap-1.5 border-b border-[#e8e0d9] bg-white/50 px-4 py-3">
              <div className="size-3 rounded-full bg-[#ff5f57]" />
              <div className="size-3 rounded-full bg-[#febc2e]" />
              <div className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="aspect-[16/9] w-full bg-stone-50">
              <img
                alt="Dashboard interface showing analytics graphs and data tables"
                className="h-full w-full object-cover"
                loading="lazy"
                src={dashboardImageSrc}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
