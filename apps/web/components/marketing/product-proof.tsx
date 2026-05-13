import React from 'react';

type Step = {
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    title: 'Events arrive',
    description: 'Recent usage is visible immediately.',
  },
  {
    title: 'Tally answers',
    description: 'Ask natural-language usage questions.',
  },
  {
    title: 'Agents improve tracking',
    description: 'Confirmed tasks become implementation context.',
  },
];

export type MarketingProductProofProps = {
  workflowImageSrc: string;
};

export default function MarketingProductProof({ workflowImageSrc }: MarketingProductProofProps) {
  return (
    <section className="bg-gradient-to-r from-[#fffdfa] to-[#dff5f1]/45 py-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-40">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0f766e]/20 bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
            <span className="size-2 rounded-full bg-[#0f766e]" />
            From data to next task
          </div>

          <h2 className="font-display text-3xl font-semibold leading-tight text-[#1b140d] md:text-5xl">
            Ask a question. If Tally can&apos;t answer it, your agent gets the task.
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-[#57534e]">
            Tally starts with the events you already have, then turns analytics gaps into confirmed
            work your AI coding agent can pull and implement.
          </p>

          <div className="mt-8 grid gap-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-sm font-bold text-white shadow-sm">
                  {index + 1}
                </span>
                <span>
                  <strong className="block text-base font-semibold text-[#1b140d]">
                    {step.title}
                  </strong>
                  <span className="mt-1 block text-sm leading-relaxed text-[#57534e]">
                    {step.description}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#e8e0d9] bg-white p-3 shadow-warm-lg">
          <img
            alt="Tally dashboard showing recent usage, Ask Tally, and the agent task queue"
            className="h-auto w-full rounded-lg border border-[#e8e0d9]"
            loading="lazy"
            src={workflowImageSrc}
          />
        </div>
      </div>
    </section>
  );
}
