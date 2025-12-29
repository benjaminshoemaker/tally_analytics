# Codex CLI Prompts for Tally Analytics

## Item 1: Fix SDK Events URL

**Codex CLI Prompt:**
```
In packages/sdk/src/core.ts, update the EVENTS_URL constant from the placeholder "https://events.productname.com/v1/track" to the production URL "https://events.usetally.xyz/v1/track".

Also update any tests that reference the old URL. The tests are in packages/sdk/test/.

Do not change any other functionality.
```

---

## Item 4: Logged-in Marketing Navigation

**Codex CLI Prompt:**
```
Update the marketing navbar to show different navigation based on whether the user is logged in.

Current state:
- apps/web/components/marketing/navbar.tsx is a server component that always shows "Log in" button
- apps/web/lib/auth/cookies.ts has a SESSION_COOKIE_NAME constant "fpa_session"
- The marketing layout is in apps/web/app/(marketing)/layout.tsx

Requirements:
1. In the marketing layout (apps/web/app/(marketing)/layout.tsx), check if the session cookie exists using cookies() from "next/headers"
2. Pass an `isLoggedIn` boolean prop to MarketingNavbar
3. Update MarketingNavbar to accept this prop and:
   - If logged in: Show "Dashboard" link (href="/projects") instead of "Log in"
   - If not logged in: Keep showing "Log in" link as currently

The session cookie name is "fpa_session" (imported from lib/auth/cookies.ts as SESSION_COOKIE_NAME).

Only check if the cookie EXISTS - do not validate the session (that would require database access and slow down the marketing pages). This is just a UI hint.
```

---

## Item 6: Rename SDK Package

**Manual Instructions (Cannot be fully automated):**

This requires coordination across npm registry and codebase. Here are the steps:

### Step 1: Update package.json
```
In packages/sdk/package.json, change:
- "name": "@fast-pr-analytics/sdk" → "@tally-analytics/sdk"
```

### Step 2: Update all import references
**Codex CLI Prompt:**
```
The SDK package is being renamed from "@fast-pr-analytics/sdk" to "@tally-analytics/sdk".

Update ALL references to the old package name across the codebase:

1. packages/sdk/README.md - update install command and import examples
2. apps/web/app/(marketing)/docs/sdk/page.tsx - update install command and import examples
3. apps/web/lib/github/templates/app-router.ts - update the generated code that references the SDK
4. apps/web/lib/github/templates/pages-router.ts - update the generated code that references the SDK
5. Any test files that reference the package name

Search for "@fast-pr-analytics/sdk" and replace with "@tally-analytics/sdk" in all relevant files.
```

### Step 3: Before publishing
- Register the @tally-analytics npm org (or use `tally-analytics` without scope)
- Run `pnpm build` in packages/sdk
- Run `npm publish` from packages/sdk

---

## Item 7: Fix "No Cookies" Marketing Claim

**Codex CLI Prompt:**
```
The marketing copy currently claims "No cookies" but the SDK actually uses a first-party cookie for session tracking. This is technically misleading.

Update the following files to use accurate language:

1. apps/web/components/marketing/hero.tsx
   - Line 25: Change "No cookies, no complex setup, just clean data." 
   - To: "No consent banner needed, no complex setup, just clean data."

2. apps/web/components/marketing/features.tsx
   - The "GDPR Compliant" feature (around line 20-29) says "We don't use cookies or track personal data"
   - Change the description to: "No third-party cookies or personal data. First-party session tracking that's fully anonymous and compliant by default."

These changes are accurate because:
- We DO use a first-party cookie (for anonymous session ID)
- We DON'T use third-party cookies (the problematic kind)
- We DON'T require consent banners (first-party anonymous cookies don't require GDPR consent)
```

---

## Item 8: Add OG Meta Tags

**Codex CLI Prompt:**
```
Add OpenGraph and Twitter meta tags to the root layout for better social sharing.

Update apps/web/app/layout.tsx to add comprehensive metadata:

1. Expand the existing metadata export to include:
   - metadataBase: new URL("https://usetally.xyz")
   - title with template: { default: "Tally Analytics", template: "%s | Tally Analytics" }
   - description: "Add privacy-friendly analytics to your Next.js app in one click. No consent banner needed, no complex setup."
   - openGraph object with:
     - title: "Tally — Analytics for Next.js"
     - description: same as above
     - url: "https://usetally.xyz"
     - siteName: "Tally Analytics"
     - images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tally Analytics" }]
     - locale: "en_US"
     - type: "website"
   - twitter object with:
     - card: "summary_large_image"
     - title: "Tally — Analytics for Next.js"
     - description: same as above
     - images: ["/og-image.png"]

2. The OG image file will be placed at apps/web/public/og-image.png manually.

Use Next.js 14 Metadata API format.
```

**Manual Step:**
Convert `branding/og-image.svg` to a 1200x630 PNG and save to `apps/web/public/og-image.png`. You can use any SVG-to-PNG converter or run:
```bash
# Using Inkscape (if installed)
inkscape branding/og-image.svg -w 1200 -h 630 -o apps/web/public/og-image.png

# Or using ImageMagick
convert -background none -size 1200x630 branding/og-image.svg apps/web/public/og-image.png
```

---

## Item 12: Footer Links (Privacy, Terms, GitHub Issues)

**Codex CLI Prompt:**
```
Update the marketing footer to have working links instead of placeholder "#" hrefs.

In apps/web/components/marketing/footer.tsx:

1. Change the Privacy Policy link from href="#" to href="/privacy"
2. Change the Terms of Service link from href="#" to href="/terms"
3. Add a "Support" link that goes to the GitHub Issues page. 
   - Add this link between "Terms of Service" and "Twitter"
   - href="https://github.com/your-org/tally-analytics/issues" (use a placeholder org name)
   - Same styling as other links

Also create placeholder pages for privacy and terms:

4. Create apps/web/app/(marketing)/privacy/page.tsx with:
   - A simple page with "Privacy Policy" heading
   - Placeholder text: "Privacy policy coming soon. For questions, contact support@usetally.xyz"
   - Use the same styling as other marketing pages (max-w-3xl, py-16, etc.)
   - Add export const dynamic = "force-static"

5. Create apps/web/app/(marketing)/terms/page.tsx with:
   - A simple page with "Terms of Service" heading  
   - Placeholder text: "Terms of service coming soon. For questions, contact support@usetally.xyz"
   - Same styling as privacy page
   - Add export const dynamic = "force-static"
```

---

## Item 13: Expand SDK Documentation

**This is the expanded SDK documentation - copy this directly into the file:**

Create or replace `apps/web/app/(marketing)/docs/sdk/page.tsx` with the following content:

```tsx
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
```

---

## Item 20: Comparison Page Research

**Deep Research Prompt (for Claude Research mode):**

```
Research how successful developer tools and analytics products create effective comparison/versus pages for SEO and conversion. I'm building Tally Analytics, a privacy-friendly analytics tool for Next.js that auto-installs via GitHub PR.

Please research:

1. **Competitor comparison page examples**: Find and analyze comparison pages from:
   - Plausible Analytics (vs Google Analytics, vs Fathom, etc.)
   - Fathom Analytics
   - Simple Analytics
   - PostHog
   - Vercel Analytics
   - Pirsch Analytics
   
   For each, note: URL structure, content format, tone, what claims they make, how they handle feature comparisons.

2. **SEO best practices for comparison pages**:
   - What URL structures work best (/vs/competitor, /compare/competitor, /alternatives/competitor)?
   - What H1/title formats rank well?
   - How long should these pages be?
   - Should there be one page per competitor or a combined comparison table?

3. **Conversion optimization**:
   - What CTAs work best on comparison pages?
   - How do top products balance being fair to competitors while still selling their product?
   - What social proof elements appear on comparison pages?

4. **Content structure recommendations**:
   - What sections should a comparison page include?
   - How to handle features the competitor has that you don't?
   - How to present pricing comparisons?

5. **Specific competitors I should create pages for**:
   - Which analytics tools are most searched for "X alternatives" or "X vs Y"?
   - Which comparisons would be most valuable for my target market (indie developers, Next.js users)?

Output a recommended content structure and outline for my first comparison page (suggest which competitor to target first), including specific sections, approximate word counts, and key claims I should make based on Tally's unique value props:
- One-click GitHub install (no code changes by user)
- Privacy-friendly (first-party cookies only)
- Built specifically for Next.js
- Lightweight SDK (<1kb)
- Real-time dashboard
```

---

## Summary Checklist

| # | Item | Type | Est. Time |
|---|------|------|-----------|
| 1 | Fix SDK events URL | Codex prompt | 2 min |
| 4 | Logged-in marketing nav | Codex prompt | 10 min |
| 6 | Rename SDK package | Manual + Codex | 15 min |
| 7 | Fix cookies claim | Codex prompt | 5 min |
| 8 | Add OG meta tags | Codex + manual PNG | 10 min |
| 12 | Footer links | Codex prompt | 10 min |
| 13 | Expand SDK docs | Direct file replace | 5 min |
| 20 | Comparison page | Research prompt | 30 min |
