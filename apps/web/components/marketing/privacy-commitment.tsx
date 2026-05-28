import React from 'react';

const COMMITMENT_POINTS = [
  {
    title: 'Never for model training',
    body: 'We do not train Tally models or third-party models on customer analytics data.',
  },
  {
    title: 'No opt-out games',
    body: 'The default is not enabled until you find a setting. The answer is no.',
  },
  {
    title: 'Still agent-native',
    body: 'Your coding agent can use Tally through MCP without turning analytics into training material.',
  },
];

export default function MarketingPrivacyCommitment() {
  return (
    <section className="border-y border-warm-200 bg-white py-20">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-40">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Privacy commitment
            </span>
            <h2 className="mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight text-warm-900 md:text-4xl">
              Your analytics data is not AI training data.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-warm-500 md:text-lg">
              Tally helps your coding agent install analytics, query usage, and decide what to track
              next. Your event data, customer data, session data, source context, prompts, and
              outputs are never used to train AI models.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.98]"
                href="/privacy"
              >
                Read the commitment
              </a>
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-warm-200 bg-white px-5 text-sm font-semibold text-warm-900 shadow-sm transition-all hover:bg-warm-100 active:scale-[0.98]"
                href="/compare/posthog-mcp"
              >
                Compare with PostHog MCP
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            {COMMITMENT_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-lg border border-warm-200 bg-warm-50 p-5 shadow-warm"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-brand-500/10 text-brand-600">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                      <path
                        fill="currentColor"
                        d="M20.3 5.7 9 17l-5.3-5.3 1.4-1.4L9 14.2 18.9 4.3l1.4 1.4z"
                      />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-warm-900">{point.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-warm-500">{point.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
