import React from "react";

export const dynamic = "force-static";

export default function DocsSdkPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <h1>SDK Reference</h1>
        <p>
          The Tally SDK is automatically installed when you merge the generated PR. 
          This page covers manual usage for advanced use cases.
        </p>

        <h2>Installation</h2>
        <pre><code>npm install @tally-analytics/sdk
# or
pnpm add @tally-analytics/sdk
# or  
yarn add @tally-analytics/sdk</code></pre>

        <h2>Quick Start: App Router (Next.js 13+)</h2>
        <p>
          For Next.js App Router, use the <code>AnalyticsAppRouter</code> component 
          in your root layout:
        </p>
        <pre><code>{`// app/layout.tsx
'use client';

import { AnalyticsAppRouter, init } from '@tally-analytics/sdk';

// Initialize once at the top level
init({ projectId: 'proj_abc123' });

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <AnalyticsAppRouter />
      </body>
    </html>
  );
}`}</code></pre>

        <h2>Quick Start: Pages Router</h2>
        <p>
          For Next.js Pages Router, use the <code>AnalyticsPagesRouter</code> component 
          in your <code>_app.tsx</code>:
        </p>
        <pre><code>{`// pages/_app.tsx
import { AnalyticsPagesRouter, init } from '@tally-analytics/sdk';
import type { AppProps } from 'next/app';

// Initialize once at the top level
init({ projectId: 'proj_abc123' });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <AnalyticsPagesRouter />
    </>
  );
}`}</code></pre>

        <h2>API Reference</h2>

        <h3><code>init(options)</code></h3>
        <p>Initialize the SDK. Must be called before any tracking.</p>
        <pre><code>{`init({
  projectId: 'proj_abc123',  // Required: Your project ID
  respectDNT: true,          // Optional: Honor Do Not Track (default: true)
  debug: false               // Optional: Log events to console (default: false)
});`}</code></pre>

        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>projectId</code></td>
              <td>string</td>
              <td>—</td>
              <td>Your Tally project ID (required)</td>
            </tr>
            <tr>
              <td><code>respectDNT</code></td>
              <td>boolean</td>
              <td>true</td>
              <td>If true, no events are sent when Do Not Track is enabled</td>
            </tr>
            <tr>
              <td><code>debug</code></td>
              <td>boolean</td>
              <td>false</td>
              <td>If true, logs events to the browser console</td>
            </tr>
          </tbody>
        </table>

        <h3><code>trackPageView(path?)</code></h3>
        <p>
          Manually track a page view. Usually not needed—the React components 
          handle this automatically on route changes.
        </p>
        <pre><code>{`import { trackPageView } from '@tally-analytics/sdk';

// Track current page
await trackPageView();

// Track a specific path
await trackPageView('/custom/path');`}</code></pre>

        <h3><code>identify(userId)</code></h3>
        <p>
          Associate events with a user ID. Call this after a user logs in 
          to link anonymous sessions to their account.
        </p>
        <pre><code>{`import { identify } from '@tally-analytics/sdk';

// After user logs in
identify('user_12345');

// Or with an email hash
identify('abc123def456');`}</code></pre>
        <p>
          <strong>Note:</strong> The user ID is stored in memory only and 
          is not persisted across page reloads. Call <code>identify()</code> 
          on each page load after authentication.
        </p>

        <h3><code>isEnabled()</code></h3>
        <p>Check if tracking is currently enabled.</p>
        <pre><code>{`import { isEnabled } from '@tally-analytics/sdk';

if (isEnabled()) {
  console.log('Tracking is active');
} else {
  console.log('Tracking is disabled (DNT or not initialized)');
}`}</code></pre>
        <p>Returns <code>false</code> if:</p>
        <ul>
          <li><code>init()</code> has not been called</li>
          <li>Running on the server (SSR)</li>
          <li>Do Not Track is enabled and <code>respectDNT</code> is true</li>
        </ul>

        <h2>Do Not Track (DNT)</h2>
        <p>
          By default, Tally respects the browser's Do Not Track setting. 
          When DNT is enabled, no events are sent.
        </p>
        <p>To disable DNT respect (not recommended):</p>
        <pre><code>{`init({
  projectId: 'proj_abc123',
  respectDNT: false  // Will track even with DNT enabled
});`}</code></pre>

        <h2>Session Tracking</h2>
        <p>
          Tally uses a first-party cookie to track sessions. The cookie contains 
          only an anonymous UUID—no personal information is stored.
        </p>
        <ul>
          <li><strong>Cookie name:</strong> <code>tally_session</code></li>
          <li><strong>Expiry:</strong> 30 minutes of inactivity</li>
          <li><strong>Scope:</strong> First-party only (your domain)</li>
        </ul>
        <p>
          This approach is GDPR-friendly and does not require a consent banner 
          in most jurisdictions, as it's first-party analytics with no personal 
          data collection.
        </p>

        <h2>Troubleshooting</h2>

        <h3>Events not appearing in dashboard</h3>
        <ol>
          <li>Check that <code>init()</code> is called before any tracking</li>
          <li>Verify your project ID is correct</li>
          <li>Check if Do Not Track is enabled in your browser</li>
          <li>Enable debug mode: <code>init({'{{ projectId: "...", debug: true }}'})</code></li>
          <li>Check the browser console for errors</li>
        </ol>

        <h3>SSR/Hydration issues</h3>
        <p>
          The SDK is client-side only. Make sure the React components are used 
          in a client component (add <code>'use client'</code> directive) or 
          in a file that's only imported client-side.
        </p>
      </div>
    </main>
  );
}
