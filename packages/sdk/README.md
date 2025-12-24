# Fast PR Analytics SDK

Client-side analytics SDK for automatic page view + session tracking.

## Installation

```bash
pnpm add @fast-pr-analytics/sdk
```

## Quick start

### Next.js App Router

Create a client component (example: `app/analytics.tsx`):

```tsx
'use client';

import { AnalyticsAppRouter, init } from '@fast-pr-analytics/sdk';

init({ projectId: 'proj_abc123' });

export function Analytics() {
  return <AnalyticsAppRouter />;
}
```

Then render it from your root layout (example: `app/layout.tsx`):

```tsx
import { Analytics } from './analytics';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Next.js Pages Router

In `pages/_app.tsx`:

```tsx
import type { AppProps } from 'next/app';
import { init, useAnalyticsPagesRouter } from '@fast-pr-analytics/sdk';

init({ projectId: 'proj_abc123' });

export default function App({ Component, pageProps }: AppProps) {
  useAnalyticsPagesRouter();
  return <Component {...pageProps} />;
}
```

## API

- `init(options)`
  - `projectId: string` (required)
  - `respectDNT?: boolean` (default `true`)
  - `debug?: boolean` (default `false`)
- `trackPageView(path?: string)` – manually send a page view (the router integrations call this automatically).
- `identify(userId: string)` – attaches `user_id` to subsequent events.
- `isEnabled()` – returns `false` when tracking is disabled (e.g. Do Not Track is enabled and `respectDNT` is `true`).

## Do Not Track (DNT)

By default, if the browser sets `navigator.doNotTrack === '1'`, the SDK will not send events and `isEnabled()` returns `false`.

To ignore DNT (not recommended), initialize with:

```ts
init({ projectId: 'proj_abc123', respectDNT: false });
```

## Notes

- The ingestion endpoint is currently hardcoded to `https://events.productname.com/v1/track` (placeholder); it will become configurable later.

