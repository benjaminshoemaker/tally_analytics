# Execution Plan: V2 Enhanced Metrics

## Overview

| Metric | Value |
|--------|-------|
| Feature | V2 Enhanced Metrics (engagement, attribution, conversions) |
| Target Project | fast_pr_analytics (Tally) |
| Total Phases | 4 |
| Total Steps | 10 |
| Total Tasks | 24 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `packages/sdk/src/tracker.ts` | modifies | Integrate new tracking modules |
| `packages/sdk/src/types.ts` | extends | Add V2 event fields |
| `packages/sdk/src/session.ts` | extends | Add visitor ID alongside session ID |
| `apps/events/app/v1/track/route.ts` | modifies | Accept new event fields |
| `apps/web/lib/db/schema.ts` | extends | Add conversion columns to projects |
| `apps/web/app/api/projects/[id]/analytics/overview/route.ts` | modifies | Add V2 metrics queries |
| `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` | modifies | Add new dashboard sections |
| `apps/web/components/dashboard/stat-card.tsx` | uses | Existing component for new metrics |

## Phase Dependency Graph

```
┌─────────────────────────┐
│ Phase 1: Foundation     │
│ (SDK Modules + Schema)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase 2: Event Pipeline │
│ (Events App + SDK Int.) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase 3: Backend APIs   │
│ (Overview + Conversion) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase 4: Dashboard UI   │
│ (Components + Pages)    │
└─────────────────────────┘
```

---

## Phase 1: Foundation

**Goal:** Create SDK tracking modules and update database schemas to support V2 metrics
**Depends On:** None

### Pre-Phase Setup

Human must complete before starting:
- [ ] Ensure Tinybird CLI access is configured (`tb auth`)
- [ ] Verify database connection string is set in `.env.local`
- [ ] Run `pnpm install` to ensure dependencies are current

---

### Step 1.1: SDK Core Tracking Modules

**Depends On:** None

---

#### Task 1.1.A: Create Engagement Time Tracker

**Description:**
Create the engagement time tracking module that monitors user activity (scroll, click, keydown, mousemove) and visibility state. This module tracks how long users actively engage with each page, pausing when the tab is hidden or user goes idle.

**Acceptance Criteria:**
- [x] `createEngagementTracker()` returns an object with `getEngagementTimeMs()`, `reset()`, and `destroy()` methods
- [x] Engagement time only accumulates when tab is visible AND user is active (activity within last 30 seconds)
- [x] Activity is detected via scroll, click, keydown, and mousemove events with passive listeners
- [x] `visibilitychange` event pauses/resumes tracking correctly
- [x] Idle timeout of 30 seconds stops time accumulation
- [x] All tests pass: `pnpm --filter sdk test engagement`

**Files to Create:**
- `packages/sdk/src/engagement.ts` — engagement time tracking module
- `packages/sdk/test/engagement.test.ts` — unit tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `packages/sdk/src/session.ts` — pattern for browser API usage and cookie handling
- `packages/sdk/src/tracker.ts` — pattern for module structure

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 4.1 Engagement Time Tracking

**Requires Browser Verification:** No

---

#### Task 1.1.B: Create Scroll Depth Tracker

**Description:**
Create the scroll depth tracking module that calculates the maximum scroll depth reached on a page. Records the highest percentage scrolled, handling edge cases like pages that fit in the viewport.

**Acceptance Criteria:**
- [x] `createScrollTracker()` returns an object with `getMaxScrollDepth()`, `reset()`, and `destroy()` methods
- [x] Scroll depth calculated as `scrollTop / (docHeight - viewportHeight) * 100`
- [x] Returns 100% if page fits entirely in viewport (no scrollbar)
- [x] Tracks maximum depth reached, not current position
- [x] Uses passive scroll event listener for performance
- [x] All tests pass: `pnpm --filter sdk test scroll`

**Files to Create:**
- `packages/sdk/src/scroll.ts` — scroll depth tracking module
- `packages/sdk/test/scroll.test.ts` — unit tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `packages/sdk/src/engagement.ts` — pattern from Task 1.1.A

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 4.2 Scroll Depth Tracking

**Requires Browser Verification:** No

---

#### Task 1.1.C: Create Visitor ID Manager

**Description:**
Create the visitor ID module that manages a persistent visitor cookie for detecting returning visitors. Creates a new UUID on first visit, returns existing ID on subsequent visits.

**Acceptance Criteria:**
- [x] `getOrCreateVisitorId()` returns `{ visitorId: string; isReturning: boolean }`
- [x] Creates `tally_vid` cookie with UUID v4 value on first visit
- [x] Cookie has 1-year max-age, path=/`, SameSite=Lax, Secure on HTTPS
- [x] Returns `isReturning: true` when cookie already exists
- [x] Handles SSR gracefully (returns null/empty when `document` undefined)
- [x] All tests pass: `pnpm --filter sdk test visitor`

**Files to Create:**
- `packages/sdk/src/visitor.ts` — visitor ID cookie management
- `packages/sdk/test/visitor.test.ts` — unit tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `packages/sdk/src/session.ts` — cookie management patterns (getCookie, setCookie)

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 4.3 Visitor ID Management

**Requires Browser Verification:** No

---

#### Task 1.1.D: Create UTM Parameter Capture

**Description:**
Create the UTM parameter capture module that parses URL query parameters on session start. Captures utm_source, utm_medium, utm_campaign, utm_term, and utm_content with truncation to 100 characters.

**Acceptance Criteria:**
- [x] `captureUTMParams()` returns object with optional utm_source, utm_medium, utm_campaign, utm_term, utm_content
- [x] Parses parameters from current URL's query string
- [x] Truncates each value to 100 characters maximum
- [x] Returns empty object if no UTM params present
- [x] Handles SSR gracefully (returns empty object when `window` undefined)
- [x] All tests pass: `pnpm --filter sdk test utm`

**Files to Create:**
- `packages/sdk/src/utm.ts` — UTM parameter parsing
- `packages/sdk/test/utm.test.ts` — unit tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `packages/sdk/src/tracker.ts` — URL handling patterns

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 4.4 UTM Parameter Capture

**Requires Browser Verification:** No

---

#### Task 1.1.E: Create CTA Click Tracker

**Description:**
Create the CTA click tracking module that listens for clicks on conversion-intent elements (signup links, submit buttons, pricing links, etc.). Captures element type, truncated text, and href domain only for privacy.

**Acceptance Criteria:**
- [x] `setupCTATracking()` returns object with `getAndClearClicks()` and `destroy()` methods
- [x] Detects clicks on selectors: `button[type="submit"]`, `a[href*="signup"]`, `a[href*="register"]`, `a[href*="pricing"]`, `a[href*="demo"]`, `a[href*="trial"]`, `a[href*="contact"]`, `a[href*="get-started"]`, `[data-tally-cta]`
- [x] Captures: element type (button/link), text (max 30 chars), href domain only (no full URL)
- [x] Uses capture phase listener to catch bubbled events
- [x] `getAndClearClicks()` returns array and clears internal queue
- [x] All tests pass: `pnpm --filter sdk test cta`

**Files to Create:**
- `packages/sdk/src/cta.ts` — CTA click tracking
- `packages/sdk/test/cta.test.ts` — unit tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `packages/sdk/src/tracker.ts` — event listener patterns

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 4.5 CTA Click Tracking

**Requires Browser Verification:** No

---

### Step 1.2: Schema Migrations

**Depends On:** None (can run in parallel with Step 1.1)

---

#### Task 1.2.A: Add Tinybird Schema Columns

**Description:**
Add new nullable columns to the Tinybird `events` data source for V2 metrics. Uses Tinybird CLI to alter the schema without downtime. All new columns are nullable for backward compatibility.

**Acceptance Criteria:**
- [ ] Tinybird `events` data source has new columns: `engagement_time_ms` (Nullable UInt32), `scroll_depth` (Nullable UInt8), `visitor_id` (Nullable String), `is_returning` (Nullable UInt8), `utm_source` (Nullable String), `utm_medium` (Nullable String), `utm_campaign` (Nullable String), `utm_term` (Nullable String), `utm_content` (Nullable String), `cta_clicks` (Nullable String)
- [ ] Migration commands documented in a script or README
- [ ] Existing events query correctly (historical data unaffected)
- [ ] New columns can be queried with NULL handling

**Files to Create:**
- `scripts/tinybird-v2-migration.sh` — migration script with `tb datasource alter` commands

**Files to Modify:**
- None (Tinybird schema is external)

**Existing Code to Reference:**
- `apps/events/lib/tinybird.ts` — existing Tinybird integration

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 2.1 Tinybird Events Schema

**Requires Browser Verification:** No

---

#### Task 1.2.B: Add PostgreSQL Conversion Columns

**Description:**
Add conversion configuration columns to the `projects` table in PostgreSQL using Drizzle migrations. These columns store the user's configured conversion path and prompt dismissal state.

**Acceptance Criteria:**
- [ ] `projects` table has new columns: `conversion_path` (varchar 255), `conversion_label` (varchar 100), `conversion_configured_at` (timestamp), `conversion_prompt_dismissed_at` (timestamp)
- [ ] Drizzle schema file updated with new column definitions
- [ ] Migration generated with `pnpm db:generate`
- [ ] Migration applies successfully with `pnpm db:push`
- [ ] Existing projects data unaffected (columns are nullable)

**Files to Create:**
- `apps/web/drizzle/migrations/XXXX_add_conversion_columns.sql` — generated by Drizzle

**Files to Modify:**
- `apps/web/lib/db/schema.ts` — add conversion columns to projects table

**Existing Code to Reference:**
- `apps/web/lib/db/schema.ts` — existing column patterns
- `apps/web/drizzle.config.ts` — migration configuration

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 2.2 PostgreSQL Schema

**Requires Browser Verification:** No

---

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] All SDK tests pass: `pnpm --filter sdk test`
- [ ] Type checking passes: `pnpm --filter sdk typecheck`
- [ ] Existing web tests still pass: `pnpm --filter web test`

**Regression Verification:**
- [ ] Existing SDK functionality unchanged (session management, page views)
- [ ] Existing database queries work (projects, users)

**Manual Verification:**
- [ ] Tinybird migration applied and queryable
- [ ] PostgreSQL migration applied, new columns visible
- [ ] SDK bundle size still under 3KB gzipped (check with `pnpm --filter sdk build && gzip -c packages/sdk/dist/index.js | wc -c`)

---

## Phase 2: Event Pipeline

**Goal:** Update event validation and integrate SDK modules into the tracker
**Depends On:** Phase 1

### Pre-Phase Setup

Human must complete before starting:
- [ ] Verify Phase 1 migrations are applied (Tinybird + PostgreSQL)
- [ ] Ensure events app is running locally for testing

---

### Step 2.1: Events App Schema Update

**Depends On:** Phase 1 Step 1.2.A (Tinybird schema)

---

#### Task 2.1.A: Update Events App Zod Schema

**Description:**
Update the Zod validation schema in the events app track route to accept the new V2 event fields. All new fields are optional for backward compatibility with existing SDK versions.

**Acceptance Criteria:**
- [ ] Zod schema accepts new optional fields: `engagement_time_ms`, `scroll_depth`, `visitor_id`, `is_returning`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `cta_clicks`
- [ ] Existing V1 events (without new fields) continue to validate successfully
- [ ] V2 events with all new fields validate successfully
- [ ] Invalid field values (wrong types) are rejected
- [ ] All tests pass: `pnpm --filter web test events-track`

**Files to Create:**
- None

**Files to Modify:**
- `apps/events/app/v1/track/route.ts` — extend `analyticsEventSchema`

**Existing Code to Reference:**
- `apps/events/app/v1/track/route.ts` — existing Zod schema pattern

**Dependencies:** Task 1.2.A (Tinybird schema must accept new fields)

**Spec Reference:** Technical Spec > Section 2.3 SDK Type Changes

**Requires Browser Verification:** No

---

### Step 2.2: SDK Integration

**Depends On:** Step 2.1, Phase 1 Step 1.1

---

#### Task 2.2.A: Update SDK Types

**Description:**
Update the SDK TypeScript types to include all V2 event fields. This ensures type safety when constructing events with the new metrics.

**Acceptance Criteria:**
- [ ] `AnalyticsEvent` interface includes optional V2 fields: `engagement_time_ms`, `scroll_depth`, `visitor_id`, `is_returning`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `cta_clicks`
- [ ] Types are correctly exported from `packages/sdk/src/types.ts`
- [ ] No type errors in existing code
- [ ] All tests pass: `pnpm --filter sdk test types`

**Files to Create:**
- None

**Files to Modify:**
- `packages/sdk/src/types.ts` — add V2 event fields

**Existing Code to Reference:**
- `packages/sdk/src/types.ts` — existing type patterns

**Dependencies:** None

**Spec Reference:** Technical Spec > Section 2.3 SDK Type Changes

**Requires Browser Verification:** No

---

#### Task 2.2.B: Integrate Tracking Modules into Tracker

**Description:**
Wire up all new tracking modules into the main tracker. Initialize modules on `init()`, include V2 data in events, send final page data on unload. Respect DNT preference for all new tracking.

**Acceptance Criteria:**
- [ ] `init()` creates engagement, scroll, and CTA trackers (when DNT disabled)
- [ ] `session_start` event includes visitor_id, is_returning, and UTM params
- [ ] `page_view` events include engagement_time_ms, scroll_depth, and cta_clicks
- [ ] `beforeunload` and `visibilitychange` events send final page data
- [ ] DNT check (`navigator.doNotTrack === "1"`) skips V2 module initialization
- [ ] All existing SDK tests still pass
- [ ] All tests pass: `pnpm --filter sdk test tracker`

**Files to Create:**
- None

**Files to Modify:**
- `packages/sdk/src/tracker.ts` — integrate new modules
- `packages/sdk/src/index.ts` — export new modules if needed

**Existing Code to Reference:**
- `packages/sdk/src/tracker.ts` — existing event flow
- `packages/sdk/src/session.ts` — session management pattern

**Dependencies:** Tasks 1.1.A through 1.1.E, Task 2.2.A

**Spec Reference:** Technical Spec > Section 4.6 DNT Compliance, Section 4.7 Integration

**Requires Browser Verification:** No

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] All SDK tests pass: `pnpm --filter sdk test`
- [ ] Events app tests pass: `pnpm --filter web test events`
- [ ] Type checking passes across all packages

**Regression Verification:**
- [ ] V1 SDK events still accepted by events app
- [ ] Existing dashboard still displays data correctly

**Manual Verification:**
- [ ] Build SDK and verify bundle size: `pnpm --filter sdk build`
- [ ] Manually test SDK in browser: V2 fields appear in network requests
- [ ] Verify Tinybird receives and stores new fields

---

## Phase 3: Backend APIs

**Goal:** Add V2 metrics to overview API and create conversion configuration endpoints
**Depends On:** Phase 2

### Pre-Phase Setup

Human must complete before starting:
- [ ] Verify SDK is sending V2 events (check Tinybird data)
- [ ] Ensure PostgreSQL conversion columns exist

---

### Step 3.1: Overview API Enhancements

**Depends On:** Phase 2

---

#### Task 3.1.A: Add Engagement and Scroll Metrics to Overview API

**Description:**
Extend the overview API to query and return average engagement time and average scroll depth. These metrics aggregate data from V2 events for the selected time period.

**Acceptance Criteria:**
- [ ] Response includes `avgEngagementTime: { seconds: number; change: number }` when data exists
- [ ] Response includes `avgScrollDepth: { percentage: number; change: number }` when data exists
- [ ] Metrics show null/undefined gracefully when no V2 data exists
- [ ] Change percentage calculated vs previous period (same as existing metrics)
- [ ] Query performance acceptable (<500ms for 30-day range)
- [ ] All tests pass: `pnpm --filter web test analytics-overview`

**Files to Create:**
- `apps/web/tests/analytics-overview-v2-metrics.test.ts` — tests for new metrics

**Files to Modify:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — add new queries and response fields

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — existing Tinybird query patterns
- `apps/web/lib/tinybird/client.ts` — SQL query execution

**Dependencies:** Phase 2 complete (V2 events flowing)

**Spec Reference:** Technical Spec > Section 3.2 Updated Endpoints

**Requires Browser Verification:** No

---

#### Task 3.1.B: Add New vs Returning and Exit Pages to Overview API

**Description:**
Add new/returning visitor breakdown and exit pages analysis to the overview API. Uses visitor_id and is_returning fields from V2 events.

**Acceptance Criteria:**
- [ ] Response includes `newVsReturning: { new: { count, percentage }, returning: { count, percentage } }`
- [ ] Response includes `exitPages: Array<{ path, exits, exitRate }>` with top 5 exit pages
- [ ] Exit rate calculated as percentage of sessions that ended on that page
- [ ] Handles case where no V2 data exists (returns empty/zero values)
- [ ] All tests pass: `pnpm --filter web test analytics-overview`

**Files to Create:**
- None (extend existing test file)

**Files to Modify:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — add new queries

**Existing Code to Reference:**
- Technical Spec > Section 5.2 Exit Pages Query
- Technical Spec > Section 5.3 New vs Returning Query

**Dependencies:** Task 3.1.A

**Spec Reference:** Technical Spec > Sections 5.2, 5.3

**Requires Browser Verification:** No

---

#### Task 3.1.C: Add Traffic Sources to Overview API

**Description:**
Add traffic sources breakdown with parsed channel names. Maps referrer domains and UTM source/medium to readable channel names (Google, Facebook, Direct, etc.).

**Acceptance Criteria:**
- [ ] Response includes `trafficSources: Array<{ channel, sessions, percentage }>`
- [ ] Channel mapping follows spec: google→Google, facebook/fb→Facebook, etc.
- [ ] Falls back to raw domain if not in mapping
- [ ] Empty referrer mapped to "Direct"
- [ ] UTM source/medium takes precedence over referrer when present
- [ ] All tests pass: `pnpm --filter web test analytics-overview`

**Files to Create:**
- None (extend existing test file)

**Files to Modify:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — add channel mapping query

**Existing Code to Reference:**
- Technical Spec > Section 5.1 Referrer Channel Mapping

**Dependencies:** Task 3.1.B

**Spec Reference:** Technical Spec > Section 5.1

**Requires Browser Verification:** No

---

### Step 3.2: Conversion Configuration APIs

**Depends On:** Phase 1 Step 1.2.B (PostgreSQL schema)

---

#### Task 3.2.A: Create Conversion CRUD Endpoints

**Description:**
Create API endpoints to configure, view, and remove conversion paths for a project. Stores configuration in PostgreSQL projects table.

**Acceptance Criteria:**
- [ ] `POST /api/projects/[id]/conversion` sets conversion_path, conversion_label, conversion_configured_at
- [ ] `DELETE /api/projects/[id]/conversion` clears conversion configuration
- [ ] Both endpoints require authentication and project ownership
- [ ] POST validates path format (must start with `/`)
- [ ] Response includes matching paths preview for prefix matching
- [ ] All tests pass: `pnpm --filter web test conversion`

**Files to Create:**
- `apps/web/app/api/projects/[id]/conversion/route.ts` — POST and DELETE handlers
- `apps/web/tests/conversion-api.test.ts` — API tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/route.ts` — auth and ownership patterns
- `apps/web/lib/db/queries/projects.ts` — project query patterns

**Dependencies:** Task 1.2.B (conversion columns exist)

**Spec Reference:** Technical Spec > Section 3.1 New Endpoints

**Requires Browser Verification:** No

---

#### Task 3.2.B: Create Conversion Dismiss Endpoint

**Description:**
Create endpoint to dismiss the conversion setup prompt for 30 days. User can re-dismiss after 30 days if they still haven't configured a conversion.

**Acceptance Criteria:**
- [ ] `POST /api/projects/[id]/conversion/dismiss` sets conversion_prompt_dismissed_at to current timestamp
- [ ] Requires authentication and project ownership
- [ ] Returns success response with dismissal timestamp
- [ ] All tests pass: `pnpm --filter web test conversion-dismiss`

**Files to Create:**
- `apps/web/app/api/projects/[id]/conversion/dismiss/route.ts` — POST handler

**Files to Modify:**
- `apps/web/tests/conversion-api.test.ts` — add dismiss tests

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/conversion/route.ts` — from Task 3.2.A

**Dependencies:** Task 3.2.A

**Spec Reference:** Technical Spec > Section 3.1 New Endpoints

**Requires Browser Verification:** No

---

#### Task 3.2.C: Create Conversion Candidates API

**Description:**
Create endpoint that analyzes traffic patterns and suggests potential conversion pages. Implements scoring algorithm based on URL patterns, session sequences, exit rates, and bounce rates.

**Acceptance Criteria:**
- [ ] `GET /api/projects/[id]/analytics/conversion-candidates` returns scored candidates array
- [ ] Scoring follows spec: URL patterns (+3), follows signup flow (+3), high exit rate (+2), low bounce (+1)
- [ ] Returns top 3 candidates sorted by score, then by visits
- [ ] `eligibleForPrompt` is true when 50+ sessions OR project age > 7 days
- [ ] Requires authentication and project ownership
- [ ] All tests pass: `pnpm --filter web test conversion-candidates`

**Files to Create:**
- `apps/web/app/api/projects/[id]/analytics/conversion-candidates/route.ts` — GET handler
- `apps/web/tests/conversion-candidates-api.test.ts` — API tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- Technical Spec > Section 3.1 Conversion Candidate Scoring Algorithm
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — Tinybird query patterns

**Dependencies:** Task 3.1.B (exit pages query pattern)

**Spec Reference:** Technical Spec > Section 3.1 (scoring algorithm)

**Requires Browser Verification:** No

---

### Step 3.3: Conversions Analytics API

**Depends On:** Step 3.2

---

#### Task 3.3.A: Create Conversions Analytics Endpoint

**Description:**
Create endpoint that returns conversion statistics, rate over time, funnel paths, and CTA click data for projects with configured conversions.

**Acceptance Criteria:**
- [ ] `GET /api/projects/[id]/analytics/conversions` returns full conversion analytics
- [ ] Response includes: conversion rate, converted sessions, rate change, time series
- [ ] Response includes top 5 conversion paths (using Sankey-compatible data structure)
- [ ] Response includes top clicked CTAs from converted sessions
- [ ] Returns 404 or empty response if no conversion configured
- [ ] All tests pass: `pnpm --filter web test conversions-analytics`

**Files to Create:**
- `apps/web/app/api/projects/[id]/analytics/conversions/route.ts` — GET handler
- `apps/web/tests/conversions-analytics-api.test.ts` — API tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- Technical Spec > Section 5.4 Conversion Funnel Query
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — response patterns

**Dependencies:** Task 3.2.A (conversion config must exist)

**Spec Reference:** Technical Spec > Section 3.1 (conversions endpoint)

**Requires Browser Verification:** No

---

#### Task 3.3.B: Add Conversion Prompt Logic to Overview API

**Description:**
Add `showConversionPrompt` field to overview API response. Determines whether to show the conversion setup prompt based on thresholds and dismissal state.

**Acceptance Criteria:**
- [ ] Response includes `showConversionPrompt: boolean`
- [ ] Returns `true` when: no conversion_path AND (50+ sessions OR project age > 7 days) AND (not dismissed OR dismissed > 30 days ago)
- [ ] Returns `false` when conversion already configured
- [ ] Returns `false` when dismissed within last 30 days
- [ ] All tests pass: `pnpm --filter web test analytics-overview`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` — add prompt logic

**Existing Code to Reference:**
- `apps/web/lib/db/schema.ts` — project conversion columns
- Feature Spec > Component 4.3 Conversion Setup Prompt Logic

**Dependencies:** Tasks 3.2.A, 3.2.B

**Spec Reference:** Feature Spec > Section 4.3 (prompt logic flowchart)

**Requires Browser Verification:** No

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] All API tests pass: `pnpm --filter web test`
- [ ] Type checking passes: `pnpm --filter web typecheck`
- [ ] Linting passes: `pnpm --filter web lint`

**Regression Verification:**
- [ ] Existing overview API response fields unchanged
- [ ] Existing dashboard still works with updated API

**Manual Verification:**
- [ ] Test API endpoints via curl or API client
- [ ] Verify conversion candidate scoring with real data
- [ ] Check funnel query performance with production-like data volume

---

## Phase 4: Dashboard UI

**Goal:** Update dashboard to display V2 metrics and add conversion management UI
**Depends On:** Phase 3

### Pre-Phase Setup

Human must complete before starting:
- [ ] Verify all Phase 3 APIs return expected data
- [ ] Have sample V2 event data in Tinybird for testing

---

### Step 4.1: Overview Page Enhancements

**Depends On:** Phase 3 Step 3.1

---

#### Task 4.1.A: Add Engagement and Scroll Stat Cards

**Description:**
Add new stat cards to the overview page for average engagement time and average scroll depth. Follow existing StatCard component patterns.

**Acceptance Criteria:**
- [ ] Overview page displays "Avg. Engagement" stat card with time formatted as "Xm Ys"
- [ ] Overview page displays "Avg. Scroll Depth" stat card with percentage
- [ ] Both cards show change indicator (up/down arrow with percentage)
- [ ] Cards gracefully handle missing data (show "—" or similar)
- [ ] Existing stat cards unchanged
- [ ] Page renders without errors: `pnpm --filter web test overview-page`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — add new stat cards

**Existing Code to Reference:**
- `apps/web/components/dashboard/stat-card.tsx` — existing component
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — existing layout

**Dependencies:** Task 3.1.A (API returns engagement/scroll data)

**Spec Reference:** Feature Spec > Section 4.1 Overview Page Layout

**Requires Browser Verification:** Yes
- Verify stat cards display correctly
- Verify change indicators show correct direction

---

#### Task 4.1.B: Add Exit Pages Card

**Description:**
Create and add an exit pages card component showing the top 5 pages where users leave the site.

**Acceptance Criteria:**
- [ ] New ExitPagesCard component displays path, exit count, and exit rate percentage
- [ ] Top 5 exit pages shown in descending order by exit count
- [ ] Card follows existing TopList styling patterns
- [ ] Handles empty state (no exit data)
- [ ] Component has unit tests
- [ ] Page renders correctly: `pnpm --filter web test overview-page`

**Files to Create:**
- `apps/web/components/dashboard/exit-pages-card.tsx` — exit pages component

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — add exit pages card

**Existing Code to Reference:**
- `apps/web/components/dashboard/top-list.tsx` — similar list component

**Dependencies:** Task 3.1.B (API returns exit pages data)

**Spec Reference:** Feature Spec > Section 4.1 (Exit Pages section)

**Requires Browser Verification:** Yes
- Verify exit pages display correctly
- Verify exit rate percentages are formatted

---

#### Task 4.1.C: Add New vs Returning Card

**Description:**
Create and add a new vs returning visitors card with pie chart visualization showing the breakdown.

**Acceptance Criteria:**
- [ ] NewReturningCard component displays pie chart with two segments
- [ ] Shows counts and percentages for new and returning visitors
- [ ] Uses Recharts PieChart component (already installed)
- [ ] Handles edge case where all visitors are new (no returning data yet)
- [ ] Component has unit tests
- [ ] Page renders correctly: `pnpm --filter web test overview-page`

**Files to Create:**
- `apps/web/components/dashboard/new-returning-card.tsx` — pie chart component

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — add new vs returning card

**Existing Code to Reference:**
- `apps/web/components/dashboard/page-views-chart.tsx` — Recharts usage pattern
- Recharts PieChart documentation

**Dependencies:** Task 3.1.B (API returns new/returning data)

**Spec Reference:** Feature Spec > Section 4.1 (New vs Returning section)

**Requires Browser Verification:** Yes
- Verify pie chart renders with correct proportions
- Verify legend displays correctly

---

#### Task 4.1.D: Add Traffic Sources Card

**Description:**
Create and add a traffic sources card showing session breakdown by channel (Google, Facebook, Direct, etc.).

**Acceptance Criteria:**
- [ ] TrafficSourcesCard displays channel name, session count, and percentage
- [ ] Follows TopList styling with horizontal bar indicators
- [ ] Channels sorted by session count descending
- [ ] Handles case with no traffic source data
- [ ] Component has unit tests
- [ ] Page renders correctly: `pnpm --filter web test overview-page`

**Files to Create:**
- `apps/web/components/dashboard/traffic-sources-card.tsx` — traffic sources component

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — add traffic sources card

**Existing Code to Reference:**
- `apps/web/components/dashboard/top-list.tsx` — list styling pattern

**Dependencies:** Task 3.1.C (API returns traffic sources data)

**Spec Reference:** Feature Spec > Section 4.1 (Traffic Sources section)

**Requires Browser Verification:** Yes
- Verify channels display with correct names
- Verify percentage bars are proportional

---

### Step 4.2: Conversion Setup UI

**Depends On:** Phase 3 Step 3.2

---

#### Task 4.2.A: Create Conversion Setup Prompt Component

**Description:**
Create the conversion setup prompt that appears on the overview page when eligible. Shows suggested conversion pages and allows configuration.

**Acceptance Criteria:**
- [ ] ConversionPrompt displays when `showConversionPrompt` is true
- [ ] Shows up to 3 suggested conversion pages with visit counts
- [ ] Includes custom path input field
- [ ] "Set as primary conversion" button calls POST /conversion endpoint
- [ ] "Dismiss" button calls POST /conversion/dismiss endpoint
- [ ] Prompt disappears after configuration or dismissal
- [ ] Component has unit tests

**Files to Create:**
- `apps/web/components/dashboard/conversion-prompt.tsx` — prompt component

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — conditionally render prompt

**Existing Code to Reference:**
- Feature Spec > Section 4.1 (prompt wireframe)
- `apps/web/components/dashboard/stat-card.tsx` — card styling

**Dependencies:** Tasks 3.2.A, 3.2.B, 3.2.C (APIs available)

**Spec Reference:** Feature Spec > Section 4.1, 4.3

**Requires Browser Verification:** Yes
- Verify prompt appears when eligible
- Verify selection and configuration flow
- Verify dismissal works

---

### Step 4.3: Conversions Tab

**Depends On:** Step 4.2, Phase 3 Step 3.3

---

#### Task 4.3.A: Add Conversions Tab to Project Layout

**Description:**
Add a "Conversions" tab to the project navigation. Tab only appears when a conversion path is configured.

**Acceptance Criteria:**
- [ ] "Conversions" tab appears in project navigation when conversion_path is set
- [ ] Tab is hidden when no conversion configured
- [ ] Tab links to `/projects/[id]/conversions`
- [ ] Active state styled correctly when on conversions page
- [ ] Navigation still works correctly for existing tabs

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/layout.tsx` — add conditional tab

**Existing Code to Reference:**
- `apps/web/app/(dashboard)/projects/[id]/layout.tsx` — existing navigation

**Dependencies:** Task 3.2.A (conversion config exists)

**Spec Reference:** Feature Spec > Section 4.2 (Conversions Tab)

**Requires Browser Verification:** Yes
- Verify tab appears/disappears based on config
- Verify navigation works

---

#### Task 4.3.B: Create Funnel Chart Component

**Description:**
Create a Sankey-style funnel chart component to visualize top conversion paths. Uses Recharts Sankey component.

**Acceptance Criteria:**
- [ ] FunnelChart accepts array of paths with step arrays and session counts
- [ ] Renders Recharts Sankey diagram showing flow between pages
- [ ] Shows session count and percentage for each path
- [ ] Handles up to 5 paths gracefully
- [ ] Responsive sizing within container
- [ ] Component has unit tests

**Files to Create:**
- `apps/web/components/dashboard/funnel-chart.tsx` — Sankey visualization

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/components/dashboard/page-views-chart.tsx` — Recharts patterns
- Recharts Sankey documentation

**Dependencies:** Task 3.3.A (conversion data available)

**Spec Reference:** Feature Spec > Section 4.2 (funnel visualization wireframe)

**Requires Browser Verification:** Yes
- Verify Sankey diagram renders correctly
- Verify path labels are readable

---

#### Task 4.3.C: Create Conversions Page

**Description:**
Create the conversions page that displays conversion stats, rate over time chart, funnel visualization, and top CTAs.

**Acceptance Criteria:**
- [ ] Page displays at `/projects/[id]/conversions`
- [ ] Shows conversion rate, converted sessions, total sessions as stat cards
- [ ] Shows conversion rate over time line chart
- [ ] Shows FunnelChart with top conversion paths
- [ ] Shows top clicked CTAs table
- [ ] Edit and Remove conversion buttons work
- [ ] Loading and error states handled
- [ ] Page has tests

**Files to Create:**
- `apps/web/app/(dashboard)/projects/[id]/conversions/page.tsx` — conversions page

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — page structure
- Feature Spec > Section 4.2 (Conversions Tab wireframe)

**Dependencies:** Tasks 4.3.A, 4.3.B, 3.3.A

**Spec Reference:** Feature Spec > Section 4.2

**Requires Browser Verification:** Yes
- Verify page layout matches wireframe
- Verify all data displays correctly
- Verify edit/remove functionality

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] All tests pass: `pnpm --filter web test`
- [ ] Type checking passes: `pnpm --filter web typecheck`
- [ ] Linting passes: `pnpm --filter web lint`
- [ ] Build succeeds: `pnpm --filter web build`

**Regression Verification:**
- [ ] Existing overview page functionality unchanged
- [ ] Existing project navigation works
- [ ] No console errors on dashboard pages

**Manual Verification:**
- [ ] Walk through complete conversion setup flow
- [ ] Verify all new stat cards display data
- [ ] Verify funnel chart renders conversion paths
- [ ] Test responsive behavior on mobile viewport
- [ ] Verify dismissal and re-prompt after 30 days logic

**Browser Verification:**
- [ ] All UI acceptance criteria verified
- [ ] No console errors on key pages
- [ ] Screenshots captured for visual changes

---

## Final Checklist

Before marking feature complete:

- [ ] All 4 phases completed and checkpoints passed
- [ ] SDK published (if separate package)
- [ ] Tinybird migration applied to production
- [ ] PostgreSQL migration applied to production
- [ ] Feature documentation updated
- [ ] CHANGELOG updated with V2 metrics feature
