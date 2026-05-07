# [ProductName] — Product Specification

## Overview

**One-liner:** The easiest way to add analytics to your app. Connect GitHub, merge one PR, done.

**Time-to-first-pageview:** Under 5 minutes.

---

## Problem Statement

Setting up product analytics is a tedious, multi-step process that typically takes 2-4 hours:

1. Research and choose an analytics provider
2. Create an account and obtain API keys
3. Install the SDK
4. Locate the correct initialization point in the codebase
5. Add tracking calls throughout the app
6. Deploy and verify it works

For solo developers and early-stage startups, this friction causes analytics setup to be perpetually postponed. The result: founders fly blind during the critical early days when understanding user behavior matters most.

---

## Target User

**Primary:** Indie developers and early-stage founders building web apps.

Characteristics:
- Shipping fast; analytics is an afterthought
- Using modern frameworks (Next.js with App Router or Pages Router)
- Code lives on GitHub
- Want "good enough" analytics, not enterprise features
- Price-sensitive; free tier matters

**Explicitly not targeting:**
- Enterprises with dedicated data teams
- Apps already using Amplitude/Mixpanel/PostHog
- Native mobile apps
- Monorepo setups (v2)
- Non-GitHub users (GitLab/Bitbucket are v2)

---

## Platform

| Component | Platform |
|-----------|----------|
| User-facing dashboard | Web application |
| Integration mechanism | GitHub App |
| Client SDK | JavaScript (browser) |
| Marketing site | Web |

No mobile app. No CLI. No desktop app.

---

## Core User Experience

### Step-by-Step Flow

**1. Discovery & Install (30 seconds)**
- User lands on marketing site (`productname.com`)
- Clicks "Add to GitHub"
- GitHub App installation flow: user selects which repos to grant access
- GitHub redirects user back to dashboard (`app.productname.com`)

**2. Analysis & PR Generation (30-60 seconds)**
- Dashboard shows real-time status: "Analyzing [repo-name]..."
- Backend clones repo, detects framework, identifies entry points
- Upon completion, dashboard updates: "PR Ready" with direct link to the PR on GitHub

**3. Review & Merge (user-paced)**
- User clicks through to GitHub
- Reviews the PR (sees exactly what code is being added)
- Merges via normal GitHub flow
- Deploys via their existing CI/CD

**4. Live Analytics**
- Dashboard updates to show: "Receiving events"
- User sees real-time event stream and basic analytics
- No additional setup required

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Marketing Site                                                 │
│  └─► "Add to GitHub" button                                     │
│                         │                                       │
│                         ▼                                       │
│  GitHub App Install Flow                                        │
│  └─► User selects repos                                         │
│                         │                                       │
│                         ▼                                       │
│  Dashboard (app.productname.com)                                │
│  └─► Status: "Analyzing..."                                     │
│  └─► Status: "PR Ready" + [View PR] link                        │
│                         │                                       │
│                         ▼                                       │
│  GitHub (user reviews PR)                                       │
│  └─► User merges PR                                             │
│  └─► User deploys (their CI/CD)                                 │
│                         │                                       │
│                         ▼                                       │
│  Dashboard                                                      │
│  └─► Status: "Receiving events"                                 │
│  └─► Live analytics visible                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| **Unsupported framework detected** | Show clear message: "We don't support [framework] yet." Offer waitlist signup for that framework. Do not generate a PR. |
| **Framework detection fails** | Show error in dashboard: "We hit a snag analyzing your repo." Provide "Retry" button. Log failure for debugging. |
| **Existing analytics detected** (PostHog, Amplitude, etc.) | Show warning: "We detected [tool] in this repo. You can still add [ProductName], but you may want to remove [tool] first to avoid duplicate tracking." Allow user to proceed anyway. |
| **Monorepo detected** | Show message: "Monorepo detected — we don't support this yet, but we're working on it." Offer waitlist signup. Do not generate a PR. |
| **User closes PR without merging** | PR remains closed. User can click "Regenerate PR" button in dashboard to create a fresh PR. |
| **User never merges PR** | Do nothing proactively in MVP. PR sits open indefinitely. |
| **PR generation fails** (GitHub API error, etc.) | Show error in dashboard with "Retry" button. Message: "We hit a snag analyzing your repo. Click Retry, or contact support if it keeps happening." |
| **Repo structure changes after PR created** | User can click "Regenerate PR" in dashboard to trigger fresh analysis and new PR. |

---

## MVP Features

### What Gets Tracked (Auto-Instrumented)

| Event | Description |
|-------|-------------|
| **Page views** | Every route/page navigation |
| **Session start** | New visitor or returning after 30 minutes of inactivity |
| **Referrer** | Traffic source |
| **Device/browser** | Basic user agent parsing |

No custom events in auto-generated code. No funnels, cohorts, or retention curves.

### Dashboard Views

**1. Live Feed**
- Real-time event stream
- Shows events as they happen (e.g., "Someone viewed /pricing — 3 seconds ago")

**2. Overview**
- Page views over time (line chart)
- Top pages (ranked list)
- Top referrers (ranked list)

**3. Sessions**
- Session count over time
- New vs. returning visitors

### What's NOT in MVP

- Custom event tracking (users can manually call `identify()` and add custom events, but no UI support)
- Funnels
- Cohorts
- Retention curves
- Data export
- Multiple frameworks beyond Next.js
- Monorepo support
- GitLab/Bitbucket support

---

## SDK Specification

### Technical Requirements

| Attribute | Specification |
|-----------|---------------|
| **Size** | < 5kb gzipped |
| **Events endpoint** | `events.productname.com` (subdomain to avoid ad blockers) |
| **Session tracking** | Anonymous UUID stored in first-party cookie |
| **Session expiry** | 30 minutes of inactivity |
| **DNT (Do Not Track)** | Respected by default; SDK does not send events if DNT is set. Configurable. |
| **JavaScript disabled** | Not supported. JS required. |
| **Cookie vs localStorage** | Cookie (works better cross-tab) |

### SDK Methods

| Method | Description | Auto-generated in PR? |
|--------|-------------|----------------------|
| `init()` | Initialize SDK with project ID | Yes |
| `trackPageView()` | Track page view (called automatically on route change) | Yes |
| `identify(userId)` | Associate events with a user ID | No (available for manual use) |

### Privacy & Compliance

- No PII collected by default
- First-party cookie with random UUID only
- GDPR/CCPA-friendly approach (no cross-site tracking)
- DNT respected by default
- Recommend legal review before launch

### Quota Behavior

When a project exceeds its monthly event limit:
- SDK continues sending events normally (no client-side errors)
- Backend continues ingesting and storing events
- Dashboard shows banner: "You've exceeded your monthly limit. Events are still being collected but hidden. Upgrade to unlock."
- Upon upgrade, all ingested events become visible

---

## PR Generation Specification

### Branch Naming

`add-[productname]-analytics`

Example: `add-trackly-analytics`

### PR Title

"Add [ProductName] analytics"

### PR Description Template

```markdown
This PR adds [ProductName] for automatic page view tracking.

## Changes
- Added `@productname/sdk` to package.json
- Added initialization in [file path, e.g., `app/layout.tsx`]
- Added automatic page view tracking on route changes

## What happens next
1. Review and merge this PR
2. Deploy via your normal process
3. Visit [dashboard link] to see your analytics

## Questions?
Reply to this PR or email support@productname.com
```

### Code Comments

Include minimal inline comment near initialization:

```javascript
// [ProductName] analytics - see docs.productname.com/setup
```

### Framework Support (MVP)

| Framework | Supported | Entry Point |
|-----------|-----------|-------------|
| Next.js 13+ (App Router) | ✅ | `app/layout.tsx` or `app/layout.js` |
| Next.js (Pages Router) | ✅ | `pages/_app.tsx` or `pages/_app.js` |
| Remix | ❌ (v2) | — |
| SvelteKit | ❌ (v2) | — |
| Astro | ❌ (v2) | — |
| Vue/Nuxt | ❌ (v2) | — |

---

## Authentication & Authorization

### Authentication Method

**Magic link (passwordless email)**

Flow:
1. User enters email address
2. System sends email with login link
3. User clicks link
4. User is authenticated and redirected to dashboard

No passwords. No OAuth dependencies.

Implementation: Use service like Resend or Postmark for email delivery.

### Authorization Model

**Write access to repo = dashboard access**

- When user authenticates, fetch their GitHub repos via GitHub API
- For each repo where the GitHub App is installed, check if user has write access
- User can only view dashboards for repos they have write access to
- This check happens on each login (permissions may change)

---

## Data Persistence

### What Data is Stored

| Data Type | Storage Duration | Notes |
|-----------|------------------|-------|
| **Events** (page views, sessions, etc.) | 90 days (raw) | All tiers |
| **Aggregates** (daily/weekly rollups) | Indefinite | For historical charts |
| **User accounts** | Indefinite | Email, auth tokens |
| **Project metadata** | Indefinite | Repo name, install date, settings |
| **GitHub tokens** | Indefinite (refreshed) | For repo access checks |

### Storage Technology

| Component | Recommendation |
|-----------|----------------|
| Event storage | Tinybird or ClickHouse Cloud (time-series optimized) |
| User/project metadata | PostgreSQL or PlanetScale |
| Session/auth | Redis or database-backed sessions |

---

## Dashboard Onboarding

### Status Checklist

Display a simple status indicator for new users:

```
✅ GitHub App installed
⏳ PR open (waiting for merge) — [View PR]
⬜ Receiving events
```

Once all three are complete, the checklist disappears or minimizes.

No modals. No multi-step wizards. No tooltips.

---

## Business Model

### Pricing Tiers

| Tier | Price | Events/Month | Projects | Data Retention |
|------|-------|--------------|----------|----------------|
| Free | $0 | 10,000 | 1 | 90 days |
| Pro | $9/month | 100,000 | Unlimited | 90 days |
| Team | $29/month | 1,000,000 | Unlimited | 90 days |

### Quota Enforcement

- Events continue to be ingested past quota
- Dashboard shows upgrade banner
- Events past quota are hidden until upgrade
- Upon upgrade, all events become visible retroactively

---

## Support

### MVP Support Channels

| Channel | Purpose |
|---------|---------|
| Email (`support@productname.com`) | General support inquiries |
| GitHub Issues (public repo) | Bug reports, feature requests |

No live chat. No ticketing system. Email scales fine for early users.

---

## Internal Success Metrics

Track these metrics for the product itself:

| Metric | Purpose |
|--------|---------|
| GitHub App installs | Top of funnel |
| PRs generated | Conversion from install |
| PRs merged | Conversion from generated (key metric) |
| Active dashboards viewed (weekly) | Engagement / stickiness |
| Events ingested (total) | Cost monitoring |

---

## MVP Scope & Timeline

### Week 1-2
- GitHub App scaffolding
- Next.js App Router detection and code generation
- Next.js Pages Router detection and code generation
- Basic PR creation

### Week 3-4
- SDK (page views, sessions, referrer, device)
- Event ingestion endpoint
- Storage setup (Tinybird)

### Week 5-6
- Dashboard (live feed, overview, sessions)
- Magic link authentication
- GitHub permission checks
- Onboarding status checklist
- Polish and deploy

**Total: 6 weeks to working MVP**

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Unsupported framework handling | Show message + waitlist, don't generate broken PR |
| PR customization | No customization in MVP; read-only preview only |
| Abandoned PRs | Do nothing proactively |
| Re-trigger analysis | "Regenerate PR" button in dashboard |
| Existing analytics detected | Warn but allow proceeding |
| Auth method | Magic link (email-based, passwordless) |
| Dashboard access control | Write access to repo via GitHub permissions |
| Data retention (free tier) | 90 days |
| Quota exceeded behavior | Continue ingesting, gate visibility, upgrade prompt |
| Export functionality | Not in MVP |
| DNT handling | Respect by default, configurable |
| No-JS fallback | Not supported |
| User identification | Anonymous UUID cookie; optional `identify()` method |
| Events domain | Subdomain (`events.productname.com`) |
| Pages Router support | Yes, support both App Router and Pages Router |
| Branch naming | `add-[productname]-analytics` |
| Code comments | Minimal inline comment with docs link |
| Monorepo support | Not in MVP; detect and show waitlist |
| Notifications | No separate notification; dashboard shows PR link |
| Error handling | Show in dashboard with Retry button |
| Onboarding | Simple status checklist |
| Support channels | Email + GitHub Issues |

---

## Future Considerations (v2+)

- Additional frameworks: Remix, SvelteKit, Astro, Vue/Nuxt
- Custom events UI
- Funnels and retention curves
- "Questions → PRs" feature (e.g., "Track signup conversions" generates instrumentation)
- GitLab and Bitbucket support
- Monorepo support
- Data export
- Self-hosted option
- Team collaboration features
