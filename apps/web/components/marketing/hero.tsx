import React from "react";

export type MarketingHeroProps = {
  installUrl: string;
  docsUrl: string;
  dashboardImageSrc: string;
};

export default function MarketingHero({ installUrl, docsUrl, dashboardImageSrc }: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-32 lg:px-40">
      <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ec7f13]/20 bg-[#ec7f13]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9a734c] dark:text-[#d0c0b0]">
          <span className="size-2 animate-pulse rounded-full bg-[#ec7f13]" />
          V2.0 IS NOW LIVE
        </div>

        <h1 className="mb-6 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-[#1b140d] md:text-6xl dark:text-white">
          Analytics for Next.js, installed in one click.
        </h1>

        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[#9a734c] md:text-xl dark:text-[#d0c0b0]">
          Connect your GitHub repo. We send a PR. You get analytics.{" "}
          <br className="hidden md:block" />
          No consent banner needed, no complex setup, just clean data.
        </p>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded bg-[#ec7f13] px-8 text-base font-medium text-white shadow-warm transition-all hover:scale-[0.98] hover:bg-orange-600"
            href={installUrl}
            rel="noreferrer"
            target="_blank"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <path
                fill="currentColor"
                d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v4h4v2h-4v4h-2v-4H7v-2h4V7h2z"
              />
            </svg>
            Connect GitHub
          </a>
          <a
            className="flex h-12 items-center justify-center gap-2 rounded border border-[#e8e0d9] bg-white px-8 text-base font-medium text-[#1b140d] shadow-sm transition-all hover:scale-[0.98] hover:bg-[#f3ede7] dark:border-[#3e342b] dark:bg-[#221910] dark:text-[#ede0d4] dark:hover:bg-[#2a221b]"
            href={docsUrl}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 text-[#9a734c] dark:text-[#d0c0b0]">
              <path
                fill="currentColor"
                d="M6 2h9l3 3v17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V6h2.5L14 3.5zM7 9h10V7H7v2zm0 4h10v-2H7v2zm0 4h6v-2H7v2z"
              />
            </svg>
            Read the Docs
          </a>
        </div>

        <div className="group relative mt-16 w-full md:mt-24">
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-[#ec7f13]/20 to-[#e8e0d9] blur opacity-25 transition duration-1000 group-hover:opacity-40 group-hover:duration-200" />
          <div className="relative overflow-hidden rounded-lg border border-[#e8e0d9] bg-white shadow-warm-lg dark:border-[#3e342b] dark:bg-[#221910]">
            <div className="flex items-center gap-1.5 border-b border-[#e8e0d9] bg-white/50 px-4 py-3 dark:border-[#3e342b] dark:bg-black/20">
              <div className="size-3 rounded-full bg-[#ff5f57]" />
              <div className="size-3 rounded-full bg-[#febc2e]" />
              <div className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="aspect-[16/9] w-full bg-stone-50 dark:bg-[#2a221b]">
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
