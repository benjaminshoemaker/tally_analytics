import React from "react";

export const dynamic = "force-static";

export default function DocsIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Documentation</h1>
        <p className="mt-4 text-slate-600">Everything you need to install Tally and verify events are flowing.</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <a href="/docs/setup" className="rounded-xl border border-brand-200 bg-brand-50 p-6 shadow-warm hover:bg-brand-100/60">
          <span className="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            First path
          </span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">MCP setup</h2>
          <p className="mt-2 text-sm text-slate-600">
            Add Tally from Claude Code, Codex, Cursor, or your AI coding agent of choice.
          </p>
        </a>
        <a href="/docs/sdk" className="rounded-xl border border-slate-200 bg-white p-6 shadow-warm hover:bg-slate-50">
          <h2 className="text-base font-semibold text-slate-900">SDK</h2>
          <p className="mt-2 text-sm text-slate-600">API reference + examples for App Router and Pages Router.</p>
        </a>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-warm">
        <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Optional
        </span>
        <h2 className="mt-4 text-base font-semibold text-slate-900">Managed PR automation</h2>
        <p className="mt-2 text-sm text-slate-600">
          Connect GitHub later if you want Tally to inspect repos remotely or open PRs.
        </p>
      </section>
    </main>
  );
}
