import React from 'react';

export const dynamic = 'force-static';

const PRIVACY_FAQ = [
  {
    question: 'Do you train Tally AI models on customer data?',
    answer:
      'No. We do not use analytics data, customer data, session data, event data, source context, prompts, or outputs to train AI models.',
  },
  {
    question: 'Do your AI providers train on customer data?',
    answer:
      "No. If Tally uses an AI provider to power a feature, customer data may only be processed to answer the user's request and may not be used by that provider for training.",
  },
  {
    question: 'Can my agent still query analytics through MCP?',
    answer:
      'Yes. The commitment is about model training, not product utility. Your coding agent can still use Tally MCP to install analytics, query usage, and pull implementation tasks.',
  },
  {
    question: 'Will this become opt-out later?',
    answer:
      'No. If this policy ever changed, it would require an explicit new product and opt-in agreement, not a default setting.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-20">
      <section className="rounded-lg border border-warm-200 bg-white p-6 shadow-warm md:p-8">
        <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Tally AI Data Commitment
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-warm-900">
          We will never use your data to train AI models.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-warm-500">
          We will never use your analytics data, customer data, session data, event data, source
          context, prompts, or outputs to train AI models. Not by default. Not with an opt-out.
          Never.
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-warm-200 bg-warm-50 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-warm-900">
          How this works in practice
        </h2>
        <div className="mt-5 grid gap-4">
          {PRIVACY_FAQ.map((item) => (
            <div key={item.question} className="rounded-lg border border-warm-200 bg-white p-5">
              <h3 className="text-base font-semibold text-warm-900">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-warm-500">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-warm-200 bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-warm-900">Questions</h2>
        <p className="mt-3 text-sm leading-relaxed text-warm-500">
          For privacy questions, contact{' '}
          <a
            className="font-semibold text-brand-600 hover:text-brand-700"
            href="mailto:support@usetally.xyz"
          >
            support@usetally.xyz
          </a>
          .
        </p>
      </section>
    </main>
  );
}
