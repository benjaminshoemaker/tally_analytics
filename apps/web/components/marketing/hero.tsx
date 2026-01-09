import React from "react";

export type MarketingHeroProps = {
  installUrl: string;
  docsUrl: string;
  dashboardImageSrc: string;
};

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export default function MarketingHero({ installUrl, docsUrl, dashboardImageSrc }: MarketingHeroProps) {
  const installIsExternal = isExternalUrl(installUrl);
  const docsIsExternal = isExternalUrl(docsUrl);
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-32 lg:px-40">
      <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ec7f13]/20 bg-[#ec7f13]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9a734c]">
          <span className="size-2 animate-pulse rounded-full bg-[#ec7f13]" />
          V2.0 IS NOW LIVE
        </div>

        <h1 className="mb-6 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-[#1b140d] md:text-6xl">
          Analytics for Next.js, installed in one click.
        </h1>

        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[#9a734c] md:text-xl">
          Connect your GitHub repo. We send a PR. You get analytics.{" "}
          <br className="hidden md:block" />
          No consent banner needed, no complex setup, just clean data.
        </p>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ec7f13] px-8 text-base font-medium text-white shadow-warm transition-all hover:scale-[0.98] hover:bg-orange-600 hover:shadow-warm-md active:scale-[0.96] active:shadow-none"
            href={installUrl}
            rel={installIsExternal ? "noreferrer" : undefined}
            target={installIsExternal ? "_blank" : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <path
                fill="currentColor"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            Sign in with GitHub
          </a>
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e8e0d9] bg-white px-8 text-base font-medium text-[#1b140d] shadow-sm transition-all hover:scale-[0.98] hover:bg-[#f3ede7] active:scale-[0.96] active:shadow-none"
            href={docsUrl}
            rel={docsIsExternal ? "noreferrer" : undefined}
            target={docsIsExternal ? "_blank" : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 text-[#9a734c]">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            Read the Docs
          </a>
        </div>

        <div className="group relative mt-16 w-full md:mt-24">
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-[#ec7f13]/20 to-[#e8e0d9] blur opacity-25 transition duration-1000 group-hover:opacity-40 group-hover:duration-200" />
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
