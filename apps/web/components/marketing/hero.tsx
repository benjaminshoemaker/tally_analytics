import React from "react";

export type MarketingHeroProps = {
  installUrl: string;
  demoUrl: string;
};

export default function MarketingHero({ installUrl, demoUrl }: MarketingHeroProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-emerald-700">Tally Analytics</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Analytics for Next.js, installed in one click
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
          Add Tally to your GitHub repo and get a PR with privacy-friendly analytics. No config, no SDK wrangling, no
          cookies banner needed.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={installUrl}
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 sm:w-auto"
          >
            Add to GitHub
          </a>
          <a
            href={demoUrl}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:w-auto"
          >
            View Demo
          </a>
        </div>
      </div>
    </section>
  );
}

