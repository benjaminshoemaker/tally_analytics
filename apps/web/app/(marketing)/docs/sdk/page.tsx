import React from "react";

export const dynamic = "force-static";

export default function DocsSdkPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <div className="prose prose-slate max-w-none">
        <h1>SDK</h1>
        <p>
          The PR installs the SDK and wires it up automatically. You can also call the SDK directly for manual tracking.
        </p>

        <h2>Installation</h2>
        <pre>
          <code>pnpm add @fast-pr-analytics/sdk</code>
        </pre>

        <h2>Quick start (App Router)</h2>
        <pre>
          <code>{`'use client';

import { AnalyticsAppRouter, init } from '@fast-pr-analytics/sdk';

init({ projectId: 'proj_abc123' });

export function Analytics() {
  return <AnalyticsAppRouter />;
}`}</code>
        </pre>

        <h2>API reference</h2>
        <ul>
          <li>
            <code>init(options)</code>
          </li>
          <li>
            <code>trackPageView(path?)</code>
          </li>
          <li>
            <code>identify(userId)</code>
          </li>
          <li>
            <code>isEnabled()</code>
          </li>
        </ul>
      </div>
    </main>
  );
}

