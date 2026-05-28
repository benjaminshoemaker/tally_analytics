import React from 'react';

import AgentInstallTabs from '../../../../components/marketing/agent-install-tabs';

export const dynamic = 'force-static';

const AUTH_URL = '/api/auth/github';

export default function DocsSetupPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-20">
      <div className="max-w-3xl">
        <span className="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          MCP setup
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-warm-900">
          Install from your coding agent
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-warm-500">
          Add the Tally MCP server, authenticate with Tally, and let Claude Code, Codex, Cursor, or
          your AI coding agent of choice apply the SDK patch in your local app.
        </p>
      </div>

      <section className="mt-10">
        <AgentInstallTabs />
      </section>

      <section className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-5 shadow-warm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-white text-brand-600">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                fill="currentColor"
                d="M12 2l8 4v6c0 5-3.2 9.4-8 10-4.8-.6-8-5-8-10V6l8-4zm0 4.2L6 8.3V12c0 3.8 2.2 7.2 6 7.9 3.8-.7 6-4.1 6-7.9V8.3l-6-2.1z"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-warm-900">
              MCP access is not AI training permission
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-warm-600">
              Tally MCP gives your coding agent access to your analytics workflow. It does not make
              your data training material. We never use customer data to train AI models.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-warm-200 bg-white p-6 shadow-warm">
        <h2 className="font-display text-2xl font-semibold text-warm-900">
          What happens after you connect Tally
        </h2>
        <ol className="mt-5 grid gap-4">
          {[
            [
              'Authenticate with Tally',
              'First use opens Tally OAuth so projects are owned by your Tally account.',
            ],
            [
              'Ask your agent to add analytics',
              'Your coding agent calls Tally, receives a safe SDK patch, applies it locally, and runs verification where possible.',
            ],
            [
              'Deploy normally',
              'You review the local change and deploy through your existing workflow.',
            ],
            [
              'Verify the first event',
              'Visit one or two pages, then open Tally. The dashboard waits for production events and turns live when they arrive.',
            ],
          ].map(([title, body], index) => (
            <li key={title} className="flex gap-3 rounded-lg border border-warm-200 bg-warm-50 p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-warm-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-warm-500">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-warm-200 bg-white p-6 shadow-warm">
        <h2 className="font-display text-2xl font-semibold text-warm-900">Troubleshooting</h2>
        <ul className="mt-5 grid gap-3 text-sm leading-relaxed text-warm-600">
          <li>
            MCP OAuth did not complete: run the command again and finish the browser login prompt.
          </li>
          <li>
            Your agent cannot identify a supported app target: open the app root in your agent and
            retry.
          </li>
          <li>
            Patch was prepared but not applied: ask your agent to show the patch failure before
            changing code manually.
          </li>
          <li>
            Dashboard is still waiting: deploy the app, visit one or two production pages, then
            refresh the project dashboard.
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-warm-200 bg-warm-50 p-6">
        <span className="inline-flex rounded-full border border-warm-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warm-500">
          Optional
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-warm-900">
          Managed PR automation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-warm-600">
          Prefer a hosted workflow?{' '}
          <a className="font-semibold text-brand-600 hover:text-brand-700" href={AUTH_URL}>
            Sign in with GitHub
          </a>{' '}
          and connect the GitHub App later so Tally can inspect repos remotely and open PRs.
        </p>
      </section>
    </main>
  );
}
