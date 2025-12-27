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
        <a href="/docs/setup" className="rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50">
          <h2 className="text-base font-semibold text-slate-900">Getting started</h2>
          <p className="mt-2 text-sm text-slate-600">Install the GitHub App and merge the PR.</p>
        </a>
        <a href="/docs/sdk" className="rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50">
          <h2 className="text-base font-semibold text-slate-900">SDK</h2>
          <p className="mt-2 text-sm text-slate-600">API reference + examples for App Router and Pages Router.</p>
        </a>
      </div>
    </main>
  );
}

