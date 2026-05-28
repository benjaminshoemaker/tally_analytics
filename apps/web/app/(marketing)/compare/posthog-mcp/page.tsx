import React from 'react';

export const dynamic = 'force-static';

const COMPARISON_ROWS = [
  {
    capability: 'MCP setup',
    tally: 'Yes',
    posthog: 'Yes',
  },
  {
    capability: 'Agent analytics querying',
    tally: 'Yes',
    posthog: 'Yes',
  },
  {
    capability: 'Agent-assisted instrumentation',
    tally: 'Core workflow',
    posthog: 'Available inside a broad platform',
  },
  {
    capability: 'Uses customer data for AI model training',
    tally: 'Never',
    posthog: 'Announced default-in for many US cloud users',
  },
  {
    capability: 'GitHub App required for first value',
    tally: 'No',
    posthog: 'No',
  },
  {
    capability: 'Product focus',
    tally: 'Agent-native analytics instrumentation',
    posthog: 'Broad product analytics platform',
  },
];

const TALLY_POINTS = [
  'Install analytics from Codex, Claude Code, Cursor, or another MCP-capable coding agent.',
  'Query usage from the agent workflow without leaving the repo context.',
  'Turn missing tracking into implementation tasks your local agent can pull and verify.',
  'Keep customer analytics data out of AI model training.',
];

export default function PostHogMcpComparisonPage() {
  return (
    <main className="flex-grow">
      <section className="border-b border-warm-200 bg-warm-50 px-6 py-16 md:px-10 md:py-20 lg:px-40">
        <div className="mx-auto max-w-[1100px]">
          <span className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Tally vs PostHog MCP
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-tight tracking-tight text-warm-900 md:text-6xl">
            PostHog MCP convenience. A stricter data promise.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-warm-500 md:text-xl">
            Tally is MCP-first analytics for builders using Codex, Claude Code, Cursor, and other AI
            coding agents. The difference: we will never use your data to train AI models.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.98]"
              href="/docs/setup"
            >
              Start with MCP
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-warm-200 bg-white px-5 text-sm font-semibold text-warm-900 shadow-sm transition-all hover:bg-warm-100 active:scale-[0.98]"
              href="/demo"
            >
              View demo dashboard
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-10 md:py-20 lg:px-40">
        <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-display text-3xl font-semibold text-warm-900">
              Built for the agent workflow you already use.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-warm-500">
              PostHog is a broad product analytics platform. Tally is narrower by design: it helps
              coding agents install analytics, answer usage questions, and implement the next
              tracking change.
            </p>
            <div className="mt-6 grid gap-3">
              {TALLY_POINTS.map((point) => (
                <p
                  key={point}
                  className="flex items-start gap-3 rounded-lg border border-warm-200 bg-white p-4 text-sm leading-relaxed text-warm-600 shadow-warm"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-brand-500/10 text-brand-600">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5">
                      <path
                        fill="currentColor"
                        d="M20.3 5.7 9 17l-5.3-5.3 1.4-1.4L9 14.2 18.9 4.3l1.4 1.4z"
                      />
                    </svg>
                  </span>
                  {point}
                </p>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-warm-200 bg-white shadow-warm">
            <div className="border-b border-warm-200 bg-warm-50 px-5 py-4">
              <h2 className="font-display text-xl font-semibold text-warm-900">
                MCP analytics comparison
              </h2>
              <p className="mt-1 text-sm text-warm-500">
                High-level positioning for teams choosing an agent-facing analytics workflow.
              </p>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.capability}
                  className="rounded-lg border border-warm-200 bg-white p-4"
                >
                  <h3 className="text-sm font-semibold text-warm-900">{row.capability}</h3>
                  <div className="mt-3 grid gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                        Tally
                      </p>
                      <p className="mt-1 leading-relaxed text-warm-600">{row.tally}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">
                        PostHog
                      </p>
                      <p className="mt-1 leading-relaxed text-warm-600">{row.posthog}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-warm-200 bg-white">
                    <th className="w-[34%] px-5 py-4 font-semibold text-warm-900">Capability</th>
                    <th className="w-[28%] px-5 py-4 font-semibold text-brand-700">Tally</th>
                    <th className="w-[38%] px-5 py-4 font-semibold text-warm-600">PostHog</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.capability} className="border-b border-warm-200 last:border-b-0">
                      <th className="px-5 py-4 align-top font-medium leading-relaxed text-warm-900">
                        {row.capability}
                      </th>
                      <td className="px-5 py-4 align-top leading-relaxed text-warm-600">
                        {row.tally}
                      </td>
                      <td className="px-5 py-4 align-top leading-relaxed text-warm-600">
                        {row.posthog}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 bg-white px-6 py-16 md:px-10 lg:px-40">
        <div className="mx-auto max-w-[1100px] rounded-lg border border-brand-200 bg-brand-50 p-6 md:p-8">
          <h2 className="font-display text-2xl font-semibold text-warm-900">
            The commitment is simple.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-warm-600">
            We will never use your analytics data, customer data, session data, event data, source
            context, prompts, or outputs to train AI models. Not by default. Not with an opt-out.
            Never.
          </p>
          <a
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.98]"
            href="/privacy"
          >
            Read the privacy commitment
          </a>
        </div>
      </section>
    </main>
  );
}
