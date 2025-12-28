import React from "react";

export type MarketingHowItWorksProps = {
  dashboardImageSrc: string;
};

type Step = {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    number: "1",
    title: "Connect Repository",
    description: "Log in with GitHub and select the Next.js repository you want to track.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-10">
        <path
          fill="currentColor"
          d="M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm-3 7h6V7a3 3 0 0 0-6 0v2zm3 4a2 2 0 0 0-1 3.732V18h2v-1.268A2 2 0 0 0 12 13z"
        />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Merge the PR",
    description: "We automatically create a PR with the lightweight analytics hook. Merge it.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-10">
        <path
          fill="currentColor"
          d="M7 3a3 3 0 0 1 2.83 4H12a5 5 0 0 1 5 5v1.17A3 3 0 1 1 15 16v-4a3 3 0 0 0-3-3H9.83A3 3 0 1 1 7 3zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
        />
      </svg>
    ),
  },
  {
    number: "3",
    title: "See Insights",
    description: "Data starts flowing immediately. View your dashboard for real-time insights.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-10">
        <path
          fill="currentColor"
          d="M4 19h16v2H2V3h2v16zm4-2H6V9h2v8zm4 0h-2V5h2v12zm4 0h-2v-6h2v6zm4 0h-2v-9h2v9z"
        />
      </svg>
    ),
  },
];

export default function MarketingHowItWorks({ dashboardImageSrc }: MarketingHowItWorksProps) {
  return (
    <section className="bg-background-light py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-40">
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-semibold text-text-main">How it works</h2>
            <p className="text-text-muted">From zero to data in less than 2 minutes.</p>
          </div>
          <a className="flex items-center gap-1 font-medium text-primary hover:text-primary-hover" href="/docs">
            View technical docs
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path fill="currentColor" d="M13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6L13 5z" />
            </svg>
          </a>
        </div>

        <div className="relative">
          <div className="absolute left-[10%] right-[10%] top-12 hidden h-0.5 border-t border-dashed border-stone-300 md:block" />

          <div className="relative z-10 grid grid-cols-1 gap-12 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="relative mb-6 flex size-24 items-center justify-center rounded-full border-4 border-primary-light bg-surface-light text-text-muted shadow-sm">
                  <span className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                    {step.number}
                  </span>
                  {step.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text-main">{step.title}</h3>
                <p className="max-w-[240px] text-sm text-text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 w-full">
          <div className="rounded-xl border border-stone-100 bg-white shadow-warm-lg">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-[#ff5f57]" />
                <div className="size-3 rounded-full bg-[#febc2e]" />
                <div className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="text-xs font-medium text-stone-400">app.tally.so/dashboard</div>
              <div className="w-4" />
            </div>
            <div className="bg-stone-50/50 p-4 md:p-6">
              <div className="overflow-hidden rounded-lg border border-stone-100 bg-white">
                <img
                  alt="Dashboard preview showing analytics graphs and tables"
                  className="h-auto w-full"
                  loading="lazy"
                  src={dashboardImageSrc}
                />
              </div>
            </div>
            <div className="flex justify-center border-t border-stone-100 bg-white p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-text-main">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] text-text-muted">
                  <path
                    fill="currentColor"
                    d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                  />
                </svg>
                Real-time dashboard view
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

