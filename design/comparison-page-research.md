# Comparison / Versus Page Research (Item 20)

Research method: fetched competitor pages directly via `curl` (no search engine), then extracted `<title>`, `<h1>`, sample `<h2>` headings, table presence, and rough word counts.

## Competitor Page Examples

### Plausible Analytics

- **Example 1 (GA alternative):** `https://plausible.io/vs-google-analytics`
  - URL pattern: `/vs-{competitor}`
  - Title/H1: “What makes Plausible a great Google Analytics alternative”
  - Format: long-form article, multiple H2 sections (no visible `<table>`), ends with CTA
  - Rough length: ~3200 words
  - Angle/claims: “simple”, “lightweight”, “ethical”, “open-source”, “privacy-friendly”
- **Example 2 (Matomo):** `https://plausible.io/vs-matomo`
  - URL pattern: `/vs-{competitor}`
  - Format: long-form article, sectioned comparisons, CTA to trial
- **Example 3 (Cloudflare Web Analytics):** `https://plausible.io/vs-cloudflare-web-analytics`
  - URL pattern: `/vs-{competitor}`
  - Format: long-form critique-style comparison with many “cons” sections for competitor

Notes: Plausible uses “{Product} vs {Competitor}” and “great {Competitor} alternative” framing depending on competitor.

### Fathom Analytics

- **Example 1 (GA):** `https://usefathom.com/features/vs-google-analytics`
  - URL pattern: `/features/vs-{competitor}`
  - Format: sectioned comparison across dimensions (H2s like “Data retention”, “Legality”, “File size”), no `<table>` detected on this page
  - Rough length: ~1700 words
  - Tone: direct, privacy + simplicity emphasis
- **Example 2 (Cloudflare):** `https://usefathom.com/features/vs-cloudflare-web-analytics`
  - URL pattern: `/features/vs-{competitor}`
  - Format: contains a comparison `<table>`, followed by narrative sections + CTA
  - Rough length: ~2500 words

Notes: Fathom consistently uses “vs” pages under a “features” section and organizes comparisons by criteria (retention, legality, complexity, etc.).

### Simple Analytics

- **Alternatives hub:** `https://www.simpleanalytics.com/resources/alternatives`
  - URL pattern: `/resources/alternatives` (hub / index page)
  - Format: resource listing page (not a head-to-head “vs” page)
  - Tone: privacy + GDPR compliance positioning
- **GA4 alternatives roundup:** `https://www.simpleanalytics.com/blog/searching-for-ga-4-alternatives-top-10-reliable-options-for-google-analytics-in-2023-and-beyond`
  - URL pattern: blog post (roundup list)
  - Format: listicle with sections like “Things to Look for…” and a Simple Analytics CTA section

Notes: Simple Analytics leans into “alternatives” content hubs + blog roundups rather than 1:1 “vs” pages (at least via sitemap discovery).

### PostHog

- **GA alternative landing:** `https://posthog.com/google-analytics-alternative`
  - URL pattern: `/{competitor}-alternative` (no `/vs/`)
  - Format: conversion landing page with a comparison table (`<table>` present), followed by “Reasons to switch” sections and a final CTA
  - Tone: “all-in-one” positioning (beyond analytics) + feature bundle pitch (replays, feature flags, experiments, etc.)

Notes: PostHog frames the page as “beyond mere analytics” and sells a broader product suite. They still include a lightweight “why switch” structure and a clear CTA.

### Vercel Analytics / Observability

- **Analytics entry:** `https://vercel.com/analytics` (canonical resolves to `https://vercel.com/products/observability`)
  - URL pattern: product page (not a comparison page)
  - Format: product messaging for observability + analytics (no “vs”)

Notes: Vercel appears to focus on product pages rather than SEO-focused competitor comparison pages.

### Pirsch Analytics

- **GA alternative:** `https://pirsch.io/google-analytics-alternative`
  - URL pattern: `/{competitor}-alternative`
  - Format: short-to-medium landing page with narrative sections (no `<table>` detected), includes “ready” CTA section
  - Rough length: ~600 words
  - Angle/claims: privacy-first framing, “easy-to-use”, dashboard, data import

## SEO Best Practices (Observed + Recommendations)

### URL structures that work

Observed patterns across multiple products:
- `/vs-{competitor}` (Plausible)
- `/features/vs-{competitor}` (Fathom)
- `/{competitor}-alternative` (PostHog, Pirsch)

Recommendation for Tally:
- For “vs” intent queries: `/{competitor}-vs-tally` or `/vs/{competitor}` (pick one and be consistent).
- For “alternative” intent queries: `/{competitor}-alternative` (optionally canonicalize to a single format to avoid duplicates).

### H1/title formats

Common effective formats:
- “{Product} vs {Competitor}”
- “{Product} — a {Competitor} alternative”
- “What makes {Product} a great {Competitor} alternative”

Recommendation:
- Use a simple, query-matching H1 (e.g., “Tally vs Google Analytics” or “Google Analytics alternative for Next.js”).
- Keep title tag aligned with the query + brand (e.g., “Tally vs Google Analytics — Privacy-friendly Next.js analytics”).

### How long should these pages be?

Observed rough lengths:
- Long-form: Plausible (~3k words) and some Fathom comparisons (~2.5k)
- Shorter landing pages: Pirsch/PostHog (~600 words)

Recommendation:
- Target ~1500–2500 words for the first few pages so they rank for informational + commercial intent queries, while still converting.
- Include a scannable TL;DR + a table near the top, then deeper sections for SEO depth.

### One page per competitor vs combined table?

Recommendation:
- Prefer **one page per competitor** for SEO (“{competitor} alternative” and “{product} vs {competitor}” are distinct queries).
- Maintain a small hub page (e.g., `/alternatives`) that links to each competitor page (Simple Analytics-style).

## Conversion Optimization (Patterns + Recommendations)

Observed conversion patterns:
- Early CTA: free trial / signup / install
- A comparison table or “key differences” summary high on the page (Fathom/PostHog)
- Repeated CTA at the bottom
- “Fair but firm” tone: acknowledge competitor strengths, then focus on why the product is a better fit

Recommendations for Tally CTAs:
- Primary CTA: “Connect GitHub” / “Install via GitHub” (your unique differentiator).
- Secondary CTA: “See demo dashboard” or “View example PR”.
- Add a sticky mini-CTA on mobile near the top (optional).

Suggested social proof elements:
- “Works with Next.js App Router + Pages Router”
- “Installs via PR (reviewable diff)”
- Lightweight SDK claim (<1kb) with a link to source/build output
- Short quotes or logos (when available)

## Recommended Content Structure (Template)

Suggested sections:
1. **TL;DR (100–150 words)**: who Tally is for vs who competitor is for
2. **Key differences table (200–300 words)**: install method, privacy model, setup time, SDK size, real-time, retention
3. **Install experience (300–500 words)**: “one-click GitHub PR” walkthrough + screenshots
4. **Next.js-first benefits (300–500 words)**: App Router + Pages Router, route change handling, DX
5. **Privacy & compliance (250–400 words)**: first-party cookie, no third-party cookies, no consent banner needed (contextual, jurisdiction caveats)
6. **Performance (150–250 words)**: SDK size, no heavy script, keepalive/fetch, CWV notes
7. **Dashboard/insights (200–400 words)**: what you get, real-time feed
8. **Pricing (200–350 words)**: simple tiering vs competitor, what’s included
9. **Tradeoffs / when to choose competitor (150–250 words)**: credibility + reduces “biased” feel
10. **Migration (200–300 words)**: what to do to switch, what changes in codebase
11. **FAQ (300–600 words)**: common objections (“Is a cookie used?”, “Does it track PII?”, “Does it work with SSR?”)
12. **Final CTA (50–100 words)**: install + docs links

## Which competitors to target first (Reasoned)

Without search-volume tooling, the safest ordering is based on observed market intent + alignment with Tally’s Next.js niche:
1. **Google Analytics** (largest “alternative” intent; many competitors target this explicitly)
2. **Vercel Analytics** (high relevance for Next.js users; easy narrative around DX + install method)
3. **Plausible** / **Fathom** (privacy analytics buyers; strong “vs” query intent)
4. **PostHog** (product analytics suite; strong differentiation story for “simple Next.js analytics” vs “platform”)
5. **Pirsch** (privacy-focused; similar “alternative” query pattern)

## Recommended First Page: “Tally vs Google Analytics”

Target page goal: rank for “Google Analytics alternative” + “Google Analytics alternative for Next.js” while converting Next.js developers.

Outline (approx. 1800–2400 words):
- H1: “Tally vs Google Analytics (GA4): A simpler analytics setup for Next.js” (~10–20 words)
- Intro + TL;DR (~150 words)
- “Install in one click (PR-based)” (~350 words)
- “Privacy model: first-party session cookie, no consent banner needed” (~300 words)
- “Built for Next.js (App Router + Pages Router)” (~350 words)
- Comparison table (~250 words)
- “Real-time dashboard + key metrics” (~250 words)
- “Performance: <1kb SDK + minimal impact” (~200 words)
- “When Google Analytics is still the right choice” (~150 words)
- FAQ (~400 words)
- Final CTA (~80 words)

Key claims to lean on (your differentiators):
- One-click GitHub install via PR (reviewable diff; minimal manual setup)
- Privacy-friendly: first-party cookie only; no third-party cookies; anonymous by default
- Built specifically for Next.js (routers + route changes handled cleanly)
- Lightweight SDK (<1kb) + performance-friendly
- Real-time dashboard

