import React from 'react';

const HIGHLIGHTS = [
  'Add a new page? We detect it automatically.',
  'Refactor your routes? Your tracking adapts.',
  'No forgotten script tags. No broken dashboards. No weekend debugging sessions.',
];

export default function MarketingSetAndForget() {
  return (
    <section className="border-y border-[#e8e0d9] bg-[#f3ede7]/60 py-20">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-40">
        <div className="mx-auto max-w-3xl md:text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold text-[#1b140d]">
            Your analytics evolve with your app
          </h2>
          <p className="text-lg text-[#9a734c]">
            Most analytics tools break when you ship changes. Tally doesn&apos;t.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {HIGHLIGHTS.map((highlight) => (
            <div
              key={highlight}
              className="flex items-start gap-4 rounded-lg border border-[#e8e0d9] bg-white p-6 shadow-warm"
            >
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded bg-[#ec7f13]/10 text-[#ec7f13]">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-base leading-relaxed text-[#1b140d]">
                {highlight}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-lg font-medium text-[#1b140d]">
          You focus on building. We&apos;ll keep the data flowing.
        </p>
      </div>
    </section>
  );
}
