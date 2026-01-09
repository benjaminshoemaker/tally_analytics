# V2 Enhanced Metrics — Technical Specification

## Overview

This document specifies the technical implementation of V2 Enhanced Metrics for Tally, transforming it from a basic pageview counter into actionable analytics with engagement metrics, acquisition attribution, and conversion tracking.

**Reference:** [FEATURE_SPEC.md](./FEATURE_SPEC.md)

---

## Architecture Summary

The implementation spans three packages in the monorepo:

| Package | Changes | Complexity |
|---------|---------|------------|
| `packages/sdk` | New tracking modules for engagement, scroll, visitor ID, UTM, CTA clicks | High |
| `apps/events` | Updated event schema validation, Tinybird schema migration | Medium |
| `apps/web` | New API endpoints, dashboard components, conversion configuration | High |

---

## 1. Integration Analysis

### 1.1 Files to Modify

#### SDK (`packages/sdk`)

| File | Changes |
|------|---------|
| `src/types.ts` | Add new event fields, extend `EventType` union |
| `src/tracker.ts` | Add engagement data to page_view events, integrate new modules |
| `src/session.ts` | Add visitor ID cookie management alongside session ID |
| `src/index.ts` | Export new modules if needed |

#### Events App (`apps/events`)

| File | Changes |
|------|---------|
| `app/v1/track/route.ts` | Update Zod schema to accept new event fields |
| `lib/tinybird.ts` | No changes needed (generic event appender) |

#### Web App (`apps/web`)

| File | Changes |
|------|---------|
| `lib/db/schema.ts` | Add conversion columns to `projects` table |
| `app/api/projects/[id]/analytics/overview/route.ts` | Add queries for engagement, scroll, new/returning, exit pages, UTM |
| `app/(dashboard)/projects/[id]/overview/page.tsx` | Add new stat cards and sections |
| `app/(dashboard)/projects/[id]/layout.tsx` | Add Conversions tab to navigation |
| `components/dashboard/stat-card.tsx` | May need variant for conversion rate display |

### 1.2 Files to Create

#### SDK (`packages/sdk`)

| File | Purpose |
|------|---------|
| `src/engagement.ts` | Engagement time tracking (activity detection, visibility API) |
| `src/scroll.ts` | Scroll depth tracking (milestone detection) |
| `src/visitor.ts` | Visitor ID cookie management, returning visitor detection |
| `src/utm.ts` | UTM parameter parsing and capture |
| `src/cta.ts` | CTA click tracking with selector matching |
| `test/engagement.test.ts` | Unit tests for engagement tracking |
| `test/scroll.test.ts` | Unit tests for scroll tracking |
| `test/visitor.test.ts` | Unit tests for visitor ID |
| `test/utm.test.ts` | Unit tests for UTM parsing |
| `test/cta.test.ts` | Unit tests for CTA click tracking |

#### Web App (`apps/web`)

| File | Purpose |
|------|---------|
| `app/api/projects/[id]/analytics/conversions/route.ts` | GET conversion stats and funnel data |
| `app/api/projects/[id]/analytics/conversion-candidates/route.ts` | GET suggested conversion pages |
| `app/api/projects/[id]/conversion/route.ts` | POST/DELETE conversion path config |
| `app/api/projects/[id]/conversion/dismiss/route.ts` | POST dismiss setup prompt |
| `app/(dashboard)/projects/[id]/conversions/page.tsx` | Conversions tab page |
| `components/dashboard/conversion-prompt.tsx` | Setup prompt component |
| `components/dashboard/funnel-chart.tsx` | Sankey-based path visualization |
| `components/dashboard/exit-pages-card.tsx` | Exit pages section |
| `components/dashboard/new-returning-card.tsx` | New vs returning pie chart |
| `components/dashboard/traffic-sources-card.tsx` | UTM/referrer breakdown |
| `tests/conversion-*.test.ts` | Tests for conversion APIs |
| `tests/engagement-*.test.ts` | Tests for engagement metrics |

### 1.3 Existing Patterns to Follow

#### SDK Patterns

```typescript
// Event creation pattern (from tracker.ts)
export function createPageViewEvent(options: {
  projectId: string;
  sessionId: string;
  path: string;
  // ... new fields added here
}): AnalyticsEvent {
  return {
    project_id: options.projectId,
    // ...
  };
}
```

```typescript
// Cookie management pattern (from session.ts)
const COOKIE_NAME = "tally_vid";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

function setCookie(name: string, value: string) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${value}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; samesite=lax${secure}`;
}
```

#### API Route Patterns

```typescript
// Auth check pattern (from overview/route.ts)
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  // ... ownership check, then business logic
}
```

```typescript
// Tinybird SQL pattern (from overview/route.ts)
const result = await runTinybirdQuery<{ count: number }>(
  client,
  "query_name",
  `SELECT count() AS count FROM events WHERE ...`
);
```

#### Component Patterns

```tsx
// Dashboard card pattern (from overview/page.tsx)
<div className="opacity-0 animate-fade-in stagger-1">
  <StatCard label="Page views" value={data.total.toLocaleString()} change={data.change} />
</div>
```

---

## 2. Data Model Changes

### 2.1 Tinybird Events Schema (Additive)

Add nullable columns to the existing `events` data source:

```sql
-- New columns (all nullable for backward compatibility)
`engagement_time_ms` Nullable(UInt32) `json:$.engagement_time_ms`,
`scroll_depth` Nullable(UInt8) `json:$.scroll_depth`,
`visitor_id` Nullable(String) `json:$.visitor_id`,
`is_returning` Nullable(UInt8) `json:$.is_returning`,
`utm_source` Nullable(String) `json:$.utm_source`,
`utm_medium` Nullable(String) `json:$.utm_medium`,
`utm_campaign` Nullable(String) `json:$.utm_campaign`,
`utm_term` Nullable(String) `json:$.utm_term`,
`utm_content` Nullable(String) `json:$.utm_content`,
`cta_clicks` Nullable(String) `json:$.cta_clicks`
```

**Migration Strategy:**
1. Use Tinybird CLI to add columns: `tb datasource alter events --add-column "engagement_time_ms Nullable(UInt32)"`
2. Columns are added without downtime
3. Historical events will have `NULL` for new columns
4. No data backfill required — V2 metrics are forward-looking only

### 2.2 PostgreSQL Schema (Migration Required)

Add columns to `projects` table:

```sql
ALTER TABLE projects
ADD COLUMN conversion_path VARCHAR(255),
ADD COLUMN conversion_label VARCHAR(100),
ADD COLUMN conversion_configured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN conversion_prompt_dismissed_at TIMESTAMP WITH TIME ZONE;
```

**Drizzle Schema Update:**

```typescript
// In lib/db/schema.ts - add to projects table definition
conversionPath: varchar("conversion_path", { length: 255 }),
conversionLabel: varchar("conversion_label", { length: 100 }),
conversionConfiguredAt: timestamp("conversion_configured_at", { withTimezone: true }),
conversionPromptDismissedAt: timestamp("conversion_prompt_dismissed_at", { withTimezone: true }),
```

**Migration File:** Generate with `pnpm db:generate`, apply with `pnpm db:push`

### 2.3 SDK Type Changes

```typescript
// src/types.ts
export type EventType = "page_view" | "session_start";

export interface AnalyticsEvent {
  project_id: string;
  session_id: string;
  event_type: EventType;
  timestamp: string;
  url?: string;
  path?: string;
  referrer?: string;
  user_agent?: string;
  screen_width?: number;
  user_id?: string;

  // V2 additions
  engagement_time_ms?: number;
  scroll_depth?: number;
  visitor_id?: string;
  is_returning?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  cta_clicks?: string; // JSON stringified array
}
```

---

## 3. API Changes

### 3.1 New Endpoints

#### `GET /api/projects/[id]/analytics/conversions`

Returns conversion stats and funnel data for projects with configured conversion paths.

**Response:**
```typescript
{
  conversionPath: string;
  conversionLabel: string;
  stats: {
    rate: number;           // percentage
    convertedSessions: number;
    totalSessions: number;
    rateChange: number;     // vs previous period
  };
  rateTimeSeries: Array<{ date: string; rate: number }>;
  topPaths: Array<{
    steps: string[];        // e.g., ["/", "/pricing", "/signup", "/welcome"]
    sessions: number;
    percentage: number;
  }>;
  topCtas: Array<{
    text: string;
    type: "button" | "link";
    clicks: number;
  }>;
}
```

#### `GET /api/projects/[id]/analytics/conversion-candidates`

Returns suggested conversion pages based on traffic patterns.

**Response:**
```typescript
{
  candidates: Array<{
    path: string;
    score: number;          // 0-10 based on scoring criteria
    reason: string;         // e.g., "High exit rate after /signup"
    visits: number;
  }>;
  eligibleForPrompt: boolean; // true if threshold met
}
```

**Conversion Candidate Scoring Algorithm:**

Each candidate page is scored based on the following signals:

| Signal | Points | Detection Method |
|--------|--------|------------------|
| URL matches common patterns (`/thank*`, `/welcome`, `/success`, `/confirmed`, `/dashboard`) | +3 | Regex: `^/(thank|welcome|success|confirmed|dashboard)` |
| Page follows `/signup`, `/checkout`, `/register` in session | +3 | Session sequence analysis: check if path appears after these entry points |
| First view of `/dashboard` or `/app/*` in session | +2 | Query: page appears first in session AND matches `/dashboard` or `/app/*` |
| Page has high exit rate (>50%) | +2 | Exit rate calculation from exit_pages query |
| Page has low bounce rate (<30%) | +1 | Bounce rate: single-page sessions / total sessions for that page |

**Scoring Query (Pseudocode):**

```sql
WITH page_stats AS (
  SELECT
    path,
    count() AS visits,
    -- Exit rate
    countIf(is_last_in_session) / count() AS exit_rate,
    -- Check if follows signup/checkout
    countIf(preceded_by_signup_checkout) > 0 AS follows_funnel
  FROM session_page_sequences
  WHERE project_id = {projectId}
    AND timestamp >= {start}
  GROUP BY path
)
SELECT
  path,
  visits,
  -- Score calculation
  (CASE WHEN path REGEXP '^/(thank|welcome|success|confirmed|dashboard)' THEN 3 ELSE 0 END)
  + (CASE WHEN follows_funnel THEN 3 ELSE 0 END)
  + (CASE WHEN exit_rate > 0.5 THEN 2 ELSE 0 END)
  + (CASE WHEN bounce_rate < 0.3 THEN 1 ELSE 0 END) AS score,
  -- Reason generation
  CASE
    WHEN follows_funnel THEN 'Often follows signup flow'
    WHEN exit_rate > 0.5 THEN 'High exit rate (' || round(exit_rate * 100) || '%)'
    ELSE 'Matches conversion pattern'
  END AS reason
FROM page_stats
WHERE score > 0
ORDER BY score DESC, visits DESC
LIMIT 3
```

**Eligibility Threshold:**

`eligibleForPrompt` is `true` when:
- Project has 50+ sessions in the current period, OR
- Project was created more than 7 days ago

#### `POST /api/projects/[id]/conversion`

Sets the conversion path for a project.

**Request:**
```typescript
{
  path: string;             // e.g., "/welcome"
  label?: string;           // e.g., "Signup Complete"
}
```

**Response:**
```typescript
{
  success: true;
  conversionPath: string;
  conversionLabel: string;
  matchingPaths: string[];  // Preview of paths that will match
}
```

#### `DELETE /api/projects/[id]/conversion`

Removes conversion configuration.

#### `POST /api/projects/[id]/conversion/dismiss`

Dismisses the conversion setup prompt for 30 days.

### 3.2 Updated Endpoints

#### `GET /api/projects/[id]/analytics/overview`

Add to existing response:

```typescript
{
  // ... existing fields ...

  // V2 additions
  avgEngagementTime?: {
    seconds: number;
    change: number;
  };
  avgScrollDepth?: {
    percentage: number;
    change: number;
  };
  conversionRate?: {        // Only if conversion configured
    percentage: number;
    change: number;
  };
  newVsReturning: {
    new: { count: number; percentage: number };
    returning: { count: number; percentage: number };
  };
  exitPages: Array<{
    path: string;
    exits: number;
    exitRate: number;
  }>;
  trafficSources: Array<{
    channel: string;        // Parsed channel name
    sessions: number;
    percentage: number;
  }>;
  showConversionPrompt: boolean;
}
```

---

## 4. SDK Implementation Details

### 4.1 Engagement Time Tracking (`src/engagement.ts`)

```typescript
type EngagementState = {
  startTime: number;
  totalActiveTime: number;
  lastActivityTime: number;
  isActive: boolean;
  isVisible: boolean;
};

const IDLE_THRESHOLD_MS = 30_000; // 30 seconds

export function createEngagementTracker() {
  let state: EngagementState = {
    startTime: Date.now(),
    totalActiveTime: 0,
    lastActivityTime: Date.now(),
    isActive: true,
    isVisible: !document.hidden,
  };

  // Activity detection: scroll, click, keydown, mousemove
  const activityEvents = ["scroll", "click", "keydown", "mousemove"];

  function onActivity() {
    const now = Date.now();
    if (!state.isActive && state.isVisible) {
      // Resuming from idle
      state.isActive = true;
    }
    state.lastActivityTime = now;
  }

  // Visibility change handling
  function onVisibilityChange() {
    const wasVisible = state.isVisible;
    state.isVisible = !document.hidden;

    if (wasVisible && !state.isVisible) {
      // Tab hidden - accumulate time if was active
      if (state.isActive) {
        state.totalActiveTime += Date.now() - state.lastActivityTime;
      }
    }
  }

  // Idle check (run on interval)
  function checkIdle() {
    if (state.isActive && Date.now() - state.lastActivityTime > IDLE_THRESHOLD_MS) {
      state.totalActiveTime += IDLE_THRESHOLD_MS;
      state.isActive = false;
    }
  }

  function getEngagementTimeMs(): number {
    let total = state.totalActiveTime;
    if (state.isActive && state.isVisible) {
      total += Date.now() - state.lastActivityTime;
    }
    return Math.round(total);
  }

  function reset() {
    state = {
      startTime: Date.now(),
      totalActiveTime: 0,
      lastActivityTime: Date.now(),
      isActive: true,
      isVisible: !document.hidden,
    };
  }

  // Setup listeners
  activityEvents.forEach(event =>
    document.addEventListener(event, onActivity, { passive: true })
  );
  document.addEventListener("visibilitychange", onVisibilityChange);
  const idleInterval = setInterval(checkIdle, 5000);

  return {
    getEngagementTimeMs,
    reset,
    destroy() {
      activityEvents.forEach(event =>
        document.removeEventListener(event, onActivity)
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(idleInterval);
    },
  };
}
```

### 4.2 Scroll Depth Tracking (`src/scroll.ts`)

```typescript
export function createScrollTracker() {
  let maxScrollDepth = 0;

  function calculateScrollDepth(): number {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;

    // If page fits in viewport, 100%
    if (docHeight <= viewportHeight) return 100;

    const scrollable = docHeight - viewportHeight;
    return Math.min(100, Math.round((scrollTop / scrollable) * 100));
  }

  function onScroll() {
    const current = calculateScrollDepth();
    if (current > maxScrollDepth) {
      maxScrollDepth = current;
    }
  }

  // Check initial state (page might fit in viewport)
  maxScrollDepth = calculateScrollDepth();

  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    getMaxScrollDepth: () => maxScrollDepth,
    reset() {
      maxScrollDepth = calculateScrollDepth();
    },
    destroy() {
      window.removeEventListener("scroll", onScroll);
    },
  };
}
```

### 4.3 Visitor ID Management (`src/visitor.ts`)

```typescript
const VISITOR_COOKIE_NAME = "tally_vid";
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export function getOrCreateVisitorId(): { visitorId: string; isReturning: boolean } {
  const existing = getCookie(VISITOR_COOKIE_NAME);

  if (existing) {
    return { visitorId: existing, isReturning: true };
  }

  const visitorId = crypto.randomUUID();
  setCookie(VISITOR_COOKIE_NAME, visitorId, VISITOR_COOKIE_MAX_AGE);
  return { visitorId, isReturning: false };
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax${secure}`;
}
```

### 4.4 UTM Parameter Capture (`src/utm.ts`)

```typescript
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const MAX_UTM_LENGTH = 100;

export type UTMParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export function captureUTMParams(): UTMParams {
  if (typeof window === "undefined") return {};

  const url = new URL(window.location.href);
  const params: UTMParams = {};

  for (const param of UTM_PARAMS) {
    const value = url.searchParams.get(param);
    if (value) {
      params[param] = value.slice(0, MAX_UTM_LENGTH);
    }
  }

  return params;
}
```

### 4.5 CTA Click Tracking (`src/cta.ts`)

```typescript
const CTA_SELECTORS = [
  'button[type="submit"]',
  'a[href*="signup"]', 'a[href*="sign-up"]',
  'a[href*="register"]',
  'a[href*="pricing"]',
  'a[href*="demo"]',
  'a[href*="trial"]',
  'a[href*="contact"]',
  'a[href*="get-started"]', 'a[href*="getstarted"]',
  '[data-tally-cta]',
];

type CTAClick = {
  type: "button" | "link";
  text: string;
  domain?: string;
  timestamp: string;
};

const MAX_TEXT_LENGTH = 30;
const clickQueue: CTAClick[] = [];

export function setupCTATracking() {
  function onClick(event: Event) {
    const target = event.target as Element;
    const ctaElement = target.closest(CTA_SELECTORS.join(", "));

    if (!ctaElement) return;

    const isButton = ctaElement.tagName === "BUTTON";
    const text = (ctaElement.textContent || "").trim().slice(0, MAX_TEXT_LENGTH);
    const href = ctaElement.getAttribute("href");
    const domain = href ? extractDomain(href) : undefined;

    clickQueue.push({
      type: isButton ? "button" : "link",
      text,
      domain,
      timestamp: new Date().toISOString(),
    });
  }

  document.addEventListener("click", onClick, { capture: true });

  return {
    getAndClearClicks(): CTAClick[] {
      const clicks = [...clickQueue];
      clickQueue.length = 0;
      return clicks;
    },
    destroy() {
      document.removeEventListener("click", onClick, { capture: true });
    },
  };
}

function extractDomain(url: string): string | undefined {
  try {
    return new URL(url, window.location.origin).hostname;
  } catch {
    return undefined;
  }
}
```

### 4.6 DNT (Do Not Track) Compliance

All V2 tracking modules must respect the user's Do Not Track preference. The existing SDK already checks `navigator.doNotTrack` in `tracker.ts`.

**Implementation Pattern:**

Each new module should be gated by a DNT check at initialization:

```typescript
// In tracker.ts init()
const dntEnabled = navigator.doNotTrack === "1";

if (!dntEnabled) {
  engagementTracker = createEngagementTracker();
  scrollTracker = createScrollTracker();
  ctaTracker = setupCTATracking();
  visitorData = getOrCreateVisitorId();
  utmParams = captureUTMParams();
}
```

**DNT Behavior by Module:**

| Module | DNT Enabled Behavior |
|--------|---------------------|
| `engagement.ts` | Not initialized; `getEngagementTimeMs()` returns `undefined` |
| `scroll.ts` | Not initialized; `getMaxScrollDepth()` returns `undefined` |
| `visitor.ts` | Not called; no `tally_vid` cookie created |
| `utm.ts` | Not called; no UTM params captured |
| `cta.ts` | Not initialized; no click listeners attached |

**Event Payload with DNT:**

When DNT is enabled, V2 fields are omitted (not sent as `null`):

```typescript
// DNT disabled - full payload
{
  project_id: "...",
  session_id: "...",
  event_type: "page_view",
  engagement_time_ms: 45000,
  scroll_depth: 78,
  visitor_id: "uuid-...",
  // ...
}

// DNT enabled - V2 fields omitted
{
  project_id: "...",
  session_id: "...",
  event_type: "page_view",
  // No engagement_time_ms, scroll_depth, visitor_id, etc.
}
```

### 4.7 Integration in Tracker (`src/tracker.ts`)

The main tracker needs to be updated to:

1. Initialize engagement, scroll, visitor, and CTA trackers on load
2. Capture UTM params on `session_start`
3. Include engagement time and scroll depth from **previous** page in `page_view` events
4. Send final page data on `beforeunload`/`visibilitychange`

```typescript
// Simplified integration pattern
let engagementTracker: ReturnType<typeof createEngagementTracker> | null = null;
let scrollTracker: ReturnType<typeof createScrollTracker> | null = null;
let ctaTracker: ReturnType<typeof setupCTATracking> | null = null;
let previousPageData: { engagementMs: number; scrollDepth: number } | null = null;

export function init(options: InitOptions) {
  // ... existing init logic ...

  engagementTracker = createEngagementTracker();
  scrollTracker = createScrollTracker();
  ctaTracker = setupCTATracking();

  // Capture final data on unload
  window.addEventListener("beforeunload", sendFinalPageData);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) sendFinalPageData();
  });
}

function sendFinalPageData() {
  if (!engagementTracker || !scrollTracker) return;

  const event = createPageViewEvent({
    // ... standard fields ...
    engagement_time_ms: engagementTracker.getEngagementTimeMs(),
    scroll_depth: scrollTracker.getMaxScrollDepth(),
    cta_clicks: JSON.stringify(ctaTracker?.getAndClearClicks() ?? []),
  });

  postEvents(eventsUrl, [event]);
}
```

---

## 5. Tinybird Queries

### 5.1 Referrer Channel Mapping

```sql
SELECT
  multiIf(
    referrer_domain = '', 'Direct',
    referrer_domain LIKE '%google%', 'Google',
    referrer_domain LIKE '%bing%', 'Bing',
    referrer_domain LIKE '%duckduckgo%', 'DuckDuckGo',
    referrer_domain LIKE '%facebook%' OR referrer_domain LIKE '%fb.%', 'Facebook',
    referrer_domain LIKE '%twitter%' OR referrer_domain = 't.co', 'Twitter/X',
    referrer_domain LIKE '%linkedin%', 'LinkedIn',
    referrer_domain LIKE '%reddit%', 'Reddit',
    referrer_domain LIKE '%youtube%', 'YouTube',
    referrer_domain = 'news.ycombinator.com', 'Hacker News',
    referrer_domain LIKE '%github%', 'GitHub',
    referrer_domain
  ) AS channel,
  count() AS sessions
FROM events
WHERE project_id = {projectId:String}
  AND event_type = 'session_start'
  AND timestamp >= {start:DateTime64(3)}
  AND timestamp < {end:DateTime64(3)}
GROUP BY channel
ORDER BY sessions DESC
```

### 5.2 Exit Pages Query

```sql
WITH last_pages AS (
  SELECT
    session_id,
    argMax(path, timestamp) AS exit_path
  FROM events
  WHERE project_id = {projectId:String}
    AND event_type = 'page_view'
    AND timestamp >= {start:DateTime64(3)}
    AND timestamp < {end:DateTime64(3)}
  GROUP BY session_id
),
session_counts AS (
  SELECT count(DISTINCT session_id) AS total
  FROM events
  WHERE project_id = {projectId:String}
    AND event_type = 'page_view'
    AND timestamp >= {start:DateTime64(3)}
    AND timestamp < {end:DateTime64(3)}
)
SELECT
  exit_path AS path,
  count() AS exits,
  round(count() * 100.0 / sc.total, 2) AS exit_rate
FROM last_pages
CROSS JOIN session_counts AS sc
GROUP BY path, sc.total
ORDER BY exits DESC
LIMIT 5
```

### 5.3 New vs Returning Query

```sql
SELECT
  countIf(is_returning = 0 OR is_returning IS NULL) AS new_visitors,
  countIf(is_returning = 1) AS returning_visitors
FROM events
WHERE project_id = {projectId:String}
  AND event_type = 'session_start'
  AND timestamp >= {start:DateTime64(3)}
  AND timestamp < {end:DateTime64(3)}
```

### 5.4 Conversion Funnel Query

```sql
WITH converted_sessions AS (
  SELECT DISTINCT session_id
  FROM events
  WHERE project_id = {projectId:String}
    AND event_type = 'page_view'
    AND path LIKE {conversionPath:String} || '%'
    AND timestamp >= {start:DateTime64(3)}
    AND timestamp < {end:DateTime64(3)}
),
session_paths AS (
  SELECT
    e.session_id,
    groupArray(e.path) AS path_array
  FROM events AS e
  INNER JOIN converted_sessions AS cs ON e.session_id = cs.session_id
  WHERE e.project_id = {projectId:String}
    AND e.event_type = 'page_view'
    AND e.timestamp >= {start:DateTime64(3)}
    AND e.timestamp < {end:DateTime64(3)}
  GROUP BY e.session_id
)
SELECT
  path_array,
  count() AS sessions
FROM session_paths
GROUP BY path_array
ORDER BY sessions DESC
LIMIT 5
```

---

## 6. Regression Risk Assessment

### 6.1 High Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK bundle size exceeds 3KB | Users may not upgrade | Monitor bundle size in CI; tree-shake aggressively |
| `beforeunload` event not firing reliably | Lost engagement data | Use `visibilitychange` as primary; `beforeunload` as backup |
| Cookie blocking (Safari ITP) | Visitor ID not persisted | Accept limitation; document in privacy policy |
| Tinybird schema migration fails | Events rejected | Test migration in staging; nullable columns minimize risk |

### 6.2 Medium Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing tests fail after SDK changes | CI blocks deployment | Run full test suite before merging |
| Overview API response breaks clients | Dashboard errors | Version API or maintain backward compatibility |
| Performance impact of activity listeners | User experience | Use passive event listeners; throttle handlers |

### 6.3 Low Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| PostgreSQL migration fails | Conversion config unavailable | Standard Drizzle migration; easy rollback |
| New dashboard components render incorrectly | UI issues | Component-level testing; Storybook if available |

---

## 7. Implementation Sequence

The implementation should proceed in this order to minimize integration risk:

### Phase 1: Foundation (SDK + Schema)

1. **SDK: Core tracking modules** — engagement, scroll, visitor, UTM
   - These are independent modules with no external dependencies
   - Can be tested in isolation

2. **Tinybird schema migration** — Add nullable columns
   - Must complete before SDK changes are deployed
   - No impact on existing data

3. **PostgreSQL migration** — Add conversion columns
   - Independent of other changes
   - Required for Phase 3

### Phase 2: Event Pipeline

4. **Events app: Update Zod schema** — Accept new fields
   - Must complete after Tinybird schema is updated
   - Backward compatible (new fields optional)

5. **SDK: Integration** — Wire modules into tracker
   - Depends on events app accepting new fields
   - Release as minor version bump

### Phase 3: Backend APIs

6. **Overview API enhancements** — Add new metrics
   - Depends on SDK sending new data
   - Can show "no data yet" for new metrics initially

7. **Conversion APIs** — CRUD for conversion config
   - Independent of metrics data
   - Required for Phase 4

8. **Conversion candidates API** — Scoring logic
   - Depends on having sufficient event data

### Phase 4: Dashboard UI

9. **Overview page updates** — New stat cards, sections
   - Depends on API changes (Phase 3)

10. **Conversion prompt component** — Setup flow
    - Depends on candidates API

11. **Conversions tab** — Funnel visualization
    - Depends on conversion APIs

---

## 8. Testing Strategy

### 8.1 Unit Tests (Vitest)

| Module | Test Focus |
|--------|------------|
| `engagement.ts` | Activity detection, visibility handling, idle timeout |
| `scroll.ts` | Depth calculation, max tracking, viewport-fit edge case |
| `visitor.ts` | Cookie creation, returning detection |
| `utm.ts` | Parameter parsing, truncation |
| `cta.ts` | Selector matching, text truncation, domain extraction |
| Conversion APIs | CRUD operations, validation, auth |
| Tinybird queries | Query correctness with mock data |

### 8.2 Integration Tests

| Scenario | Approach |
|----------|----------|
| SDK sends V2 events | Mock fetch, verify payload shape |
| Events app accepts V2 events | HTTP tests against route handler |
| Overview API returns V2 metrics | Mock Tinybird responses |

### 8.3 E2E Tests (Playwright)

| Scenario | Approach |
|----------|----------|
| Conversion setup flow | Navigate dashboard, configure conversion, verify display |
| New metrics display | Verify stat cards render with data |
| Funnel visualization | Verify Sankey chart renders paths |

---

## 9. Rollback Plan

### If SDK deployment fails:
- Revert npm publish; previous version remains available
- Users on auto-update will stay on old version

### If Tinybird schema breaks:
- New columns are nullable; can be ignored
- No data loss possible with additive changes

### If PostgreSQL migration fails:
- Run `drizzle-kit drop` to remove migration
- Conversion features remain unavailable until fixed

### If Dashboard breaks:
- Feature flag new UI components (if desired)
- Revert frontend deployment via Vercel

---

## 10. Dependencies

### New Dependencies: None

The implementation uses only existing dependencies:
- **Recharts** (already installed) — For Sankey funnel chart
- **Zod** (already installed) — For API validation
- **TanStack Query** (already installed) — For data fetching

### SDK Bundle Impact

Estimated additions:
- `engagement.ts`: ~0.5KB gzipped
- `scroll.ts`: ~0.2KB gzipped
- `visitor.ts`: ~0.3KB gzipped
- `utm.ts`: ~0.2KB gzipped
- `cta.ts`: ~0.4KB gzipped

**Total: ~1.6KB** — Well within the 3KB limit (current SDK is ~1KB)

---

## 11. Open Questions

These items may require human decision during implementation:

1. **Conversion path matching granularity** — The spec uses prefix matching. Should we also support regex or exact match modes?

2. **CTA click attribution** — Should CTA clicks be attributed to the page where clicked, or tracked as separate events?

3. **Engagement time cap** — The spec mentions capping engagement time but doesn't specify a maximum. Recommend 30 minutes per page.

4. **Historical backfill** — Should we attempt to derive any V2 metrics from existing V1 data, or start fresh?

---

## Appendix: File Change Summary

### New Files (19)
```
packages/sdk/src/engagement.ts
packages/sdk/src/scroll.ts
packages/sdk/src/visitor.ts
packages/sdk/src/utm.ts
packages/sdk/src/cta.ts
packages/sdk/test/engagement.test.ts
packages/sdk/test/scroll.test.ts
packages/sdk/test/visitor.test.ts
packages/sdk/test/utm.test.ts
packages/sdk/test/cta.test.ts
apps/web/app/api/projects/[id]/analytics/conversions/route.ts
apps/web/app/api/projects/[id]/analytics/conversion-candidates/route.ts
apps/web/app/api/projects/[id]/conversion/route.ts
apps/web/app/api/projects/[id]/conversion/dismiss/route.ts
apps/web/app/(dashboard)/projects/[id]/conversions/page.tsx
apps/web/components/dashboard/conversion-prompt.tsx
apps/web/components/dashboard/funnel-chart.tsx
apps/web/components/dashboard/exit-pages-card.tsx
apps/web/components/dashboard/new-returning-card.tsx
apps/web/components/dashboard/traffic-sources-card.tsx
```

### Modified Files (8)
```
packages/sdk/src/types.ts
packages/sdk/src/tracker.ts
packages/sdk/src/session.ts
apps/events/app/v1/track/route.ts
apps/web/lib/db/schema.ts
apps/web/app/api/projects/[id]/analytics/overview/route.ts
apps/web/app/(dashboard)/projects/[id]/overview/page.tsx
apps/web/app/(dashboard)/projects/[id]/layout.tsx
```
