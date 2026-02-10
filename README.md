# Tally Analytics

The easiest way to add analytics to your app. Connect GitHub, merge one PR, done.

## The Problem

Setting up product analytics is a tedious, multi-step process that typically takes 2-4 hours: research providers, create accounts, obtain API keys, install SDKs, find the right initialization point, add tracking calls, deploy, and verify. For solo developers and early-stage startups, this friction causes analytics setup to be perpetually postponed — leaving founders flying blind during the critical early days.

## How It Works

1. **Install the GitHub App** — click "Add to GitHub" and select your repos
2. **We analyze your codebase** — framework detection, entry point identification, done in under 60 seconds
3. **Review & merge the PR** — we open a PR that adds page view tracking with zero config
4. **See your analytics** — deploy via your normal process, data starts flowing immediately

No API keys. No SDK wiring. No config files.

## What Gets Tracked

The auto-generated PR instruments your app with:

- **Page views** — every route navigation
- **Sessions** — new visitors and returning users (30-min inactivity window)
- **Referrers** — traffic sources
- **Device/browser** — basic user agent info

## Framework Support

| Framework | Status |
|-----------|--------|
| Next.js 13+ (App Router) | Supported |
| Next.js (Pages Router) | Supported |
| Remix, SvelteKit, Astro, Vue/Nuxt | Planned |

## Project Structure

This is a pnpm monorepo:

```
apps/
  web/        → Dashboard & GitHub App (Next.js, Tailwind, Drizzle, Neon)
  events/     → Event ingestion service (Next.js)
packages/
  sdk/        → Client SDK (@tally-analytics/sdk, <5kb gzipped)
tinybird/     → Analytics data pipeline
supabase/     → Auth & storage
```

## Development

```bash
pnpm install
pnpm dev          # Start the web dashboard
pnpm build        # Production build
pnpm lint         # Lint
pnpm typecheck    # Type checking
```

## License

Private — all rights reserved.
