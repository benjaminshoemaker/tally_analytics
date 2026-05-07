# V2 Enhanced Metrics — Feature Specification

## Overview

**Goal:** Transform Tally from a basic pageview counter into actionable analytics by adding engagement metrics, acquisition attribution, and user-configured conversion tracking—all while maintaining the zero-config, privacy-first philosophy.

**Success Metrics:**
- Users can identify their top conversion paths within 5 minutes of configuring a conversion
- Average engagement time and scroll depth are visible on the Overview page without any setup
- UTM parameters are automatically captured and displayed without user configuration

---

## Problem Statement

Tally V1 answers "how many people visited?" but not:
- **"Are users actually engaging?"** — Page views don't distinguish 2-second bounces from 5-minute reads
- **"Where do users come from?"** — Referrer URLs are messy; UTM parameters aren't captured
- **"Are users converting?"** — No way to define or track conversion events
- **"Where am I losing users?"** — No visibility into exit pages or drop-off points
- **"Are users coming back?"** — No distinction between new and returning visitors

These are the questions early-stage founders ask daily. V2 answers them with zero additional instrumentation.

---

## User Stories

### US-1: Understand Content Engagement
**As a** founder with a content-heavy site,  
**I want to** see how long users engage with each page and how far they scroll,  
**So that** I can identify which content resonates and which needs improvement.

**Acceptance Criteria:**
- Overview page shows average engagement time across all pages
- Top Pages table includes engagement time and scroll depth columns
- Engagement time only counts active time (not idle tabs)
- Scroll depth shows percentage of page scrolled (25/50/75/100% milestones)

### US-2: Track Acquisition Channels
**As a** founder running marketing campaigns,  
**I want to** see which channels and campaigns drive traffic,  
**So that** I can allocate marketing budget effectively.

**Acceptance Criteria:**
- UTM parameters (source, medium, campaign, term, content) are automatically captured
- Overview page shows traffic breakdown by source/medium
- Referrer domains are parsed into readable channel names (e.g., "google.com" → "Google")
- No manual instrumentation required

### US-3: Configure Conversion Tracking
**As a** founder who wants to measure success,  
**I want to** define what "conversion" means for my app,  
**So that** I can track conversion rates and optimize my funnel.

**Acceptance Criteria:**
- After 50+ sessions (or 7 days), dashboard prompts user to set up conversion tracking
- System suggests candidate conversion pages based on traffic patterns
- User can select a suggested page or enter a custom path
- Conversion rate appears on Overview page once configured

### US-4: Visualize Conversion Funnels
**As a** founder who has configured a conversion,  
**I want to** see the most common paths users take to convert,  
**So that** I can understand what's working and optimize underperforming paths.

**Acceptance Criteria:**
- New "Conversions" tab shows funnel visualization
- Funnels are auto-detected from page sequences (no manual step definition)
- Top 3-5 paths to conversion are displayed with session counts and percentages
- Conversion rate over time chart is visible

### US-5: Identify Exit Points
**As a** founder trying to reduce drop-off,  
**I want to** see which pages users leave from,  
**So that** I can identify and fix leaky pages.

**Acceptance Criteria:**
- Overview page shows "Exit Pages" card with top 5 exit pages
- Exit rate percentage shown for each page

### US-6: Understand Retention
**As a** founder measuring product-market fit,  
**I want to** see new vs. returning visitor breakdown,  
**So that** I can understand if users find value and come back.

**Acceptance Criteria:**
- Overview page shows new vs. returning visitor stat card
- Visitor status is determined by presence of long-lived visitor cookie
- Returning = has visited before (within 1 year); New = first visit

### US-7: Track CTA Effectiveness
**As a** founder optimizing conversion,  
**I want to** see which CTAs users click,  
**So that** I can understand what drives action.

**Acceptance Criteria:**
- Clicks on conversion-intent elements (signup links, submit buttons, pricing links) are tracked
- Top clicked CTAs are displayed on the Conversions tab
- CTA text is truncated to 30 characters for privacy
- Only href domain is captured (not full URL with parameters)

---

## Feature Components

### Component 1: SDK Enhancements

#### 1.1 Engagement Time Tracking

**Behavior:**
- Track active engagement time on each page
- "Active" = user has scrolled, clicked, typed, or moved mouse within last 30 seconds
- Pause counting when tab is hidden (visibilitychange API)
- Resume counting when tab becomes visible AND user is active
- Send engagement time for previous page with each `page_view` event
- On session's last page, send via `beforeunload` or `visibilitychange`

**Edge Cases:**
| Scenario | Behavior |
|----------|----------|
| User navigates away in <1 second | Record as 0ms |
| Single-page session (bounce) | Send on `beforeunload`/`visibilitychange` |
| Tab left open overnight | Stop counting after 30s idle; cap engagement |
| Page loads in background tab | Don't start counting until tab visible |

#### 1.2 Scroll Depth Tracking

**Behavior:**
- Calculate scroll depth as percentage: `scrollTop / (docHeight - viewportHeight) * 100`
- Track maximum scroll depth reached (not final position)
- Record milestone crossings: 25%, 50%, 75%, 100%
- Send max scroll depth with `page_view` event (for previous page)

**Edge Cases:**
| Scenario | Behavior |
|----------|----------|
| Page fits in viewport (no scrollbar) | Record as 100% |
| Infinite scroll / dynamic content | Record max depth at navigation time |
| User scrolls down then back up | Record max depth reached |

#### 1.3 Visitor ID (Return Visitor Detection)

**Behavior:**
- Create new cookie `tally_vid` on first `session_start`
- Cookie duration: 1 year
- Cookie scope: first-party, SameSite=Lax, Secure (on HTTPS)
- Include `visitor_id` and `is_returning` flag in `session_start` event

**Cookie Specification:**
| Attribute | Value |
|-----------|-------|
| Name | `tally_vid` |
| Value | UUID v4 |
| Max-Age | 31536000 (1 year) |
| Path | `/` |
| SameSite | Lax |
| Secure | Yes (on HTTPS) |

#### 1.4 UTM Parameter Capture

**Behavior:**
- On `session_start`, parse URL for UTM parameters
- Capture: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- Truncate each value to 100 characters
- Only capture on `session_start` (not every page view)

#### 1.5 CTA Click Tracking

**Behavior:**
- Listen for clicks on conversion-intent elements
- Auto-detect selectors:
  ```
  button[type="submit"]
  a[href*="signup"], a[href*="sign-up"]
  a[href*="register"]
  a[href*="pricing"]
  a[href*="demo"]
  a[href*="trial"]
  a[href*="contact"]
  a[href*="get-started"], a[href*="getstarted"]
  [data-tally-cta]  (explicit opt-in)
  ```
- Capture per click:
  - Element type (button/a)
  - Text content (truncated to 30 chars)
  - Href domain only (not full URL)
  - Timestamp
- Count every click (no deduplication)
- Queue clicks and send with next `page_view` or on `beforeunload`

**Privacy Constraints:**
- Never capture form field contents
- Only capture href domain, not full URL or query params
- Truncate text to prevent accidental PII capture

#### 1.6 DNT Compliance

All new tracking respects Do Not Track:
- If `navigator.doNotTrack === "1"`, SDK sends no events
- This includes: engagement time, scroll depth, visitor ID, UTM capture, CTA clicks
- Behavior matches existing V1 DNT handling

---

### Component 2: Backend Enhancements (Tinybird)

#### 2.1 Updated Event Schema

```sql
SCHEMA >
    `project_id` String `json:$.project_id`,
    `session_id` String `json:$.session_id`,
    `visitor_id` Nullable(String) `json:$.visitor_id`,
    `event_type` LowCardinality(String) `json:$.event_type`,
    `timestamp` DateTime64(3) `json:$.timestamp`,
    `url` Nullable(String) `json:$.url`,
    `path` Nullable(String) `json:$.path`,
    `referrer` Nullable(String) `json:$.referrer`,
    `user_agent` Nullable(String) `json:$.user_agent`,
    `screen_width` Nullable(UInt16) `json:$.screen_width`,
    `user_id` Nullable(String) `json:$.user_id`,
    `country` Nullable(String) `json:$.country`,
    `city` Nullable(String) `json:$.city`,
    -- V2 additions
    `engagement_time_ms` Nullable(UInt32) `json:$.engagement_time_ms`,
    `scroll_depth` Nullable(UInt8) `json:$.scroll_depth`,
    `is_returning` Nullable(UInt8) `json:$.is_returning`,
    `utm_source` Nullable(String) `json:$.utm_source`,
    `utm_medium` Nullable(String) `json:$.utm_medium`,
    `utm_campaign` Nullable(String) `json:$.utm_campaign`,
    `utm_term` Nullable(String) `json:$.utm_term`,
    `utm_content` Nullable(String) `json:$.utm_content`,
    `cta_clicks` Nullable(String) `json:$.cta_clicks`

ENGINE MergeTree
ENGINE_PARTITION_KEY toYYYYMM(timestamp)
ENGINE_SORTING_KEY project_id, timestamp
ENGINE_TTL toDateTime(timestamp) + INTERVAL 90 DAY
```

#### 2.2 New Tinybird Pipes

| Pipe | Purpose | Key Output |
|------|---------|------------|
| `referrer_channels` | Parse referrer domains into channel names | Channel name, session count |
| `exit_pages` | Identify last page of each session | Path, exit count, exit rate |
| `new_vs_returning` | Aggregate visitor type | New count, returning count, percentages |
| `utm_breakdown` | Group sessions by UTM parameters | Source/medium/campaign breakdown |
| `conversion_funnel` | Analyze paths to conversion | Top paths, conversion rates |
| `conversion_candidates` | Suggest potential conversion pages | Candidate paths with scores |
| `top_pages_enhanced` | Extend top_pages with engagement/scroll | Path, views, avg engagement, avg scroll |

#### 2.3 Referrer Channel Mapping

```sql
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
    referrer_domain  -- fallback to raw domain
) as channel
```

---

### Component 3: Conversion Configuration

#### 3.1 Data Model

Add to `projects` table (PostgreSQL):

```sql
ALTER TABLE projects 
ADD COLUMN conversion_path VARCHAR(255),
ADD COLUMN conversion_label VARCHAR(100),
ADD COLUMN conversion_configured_at TIMESTAMP,
ADD COLUMN conversion_prompt_dismissed_at TIMESTAMP;
```

| Column | Type | Purpose |
|--------|------|---------|
| `conversion_path` | VARCHAR(255) | Path prefix to match (e.g., `/welcome`) |
| `conversion_label` | VARCHAR(100) | User-friendly name (e.g., "Signup Complete") |
| `conversion_configured_at` | TIMESTAMP | When conversion was set up |
| `conversion_prompt_dismissed_at` | TIMESTAMP | When user dismissed setup prompt |

#### 3.2 Conversion Path Matching

Conversions use **prefix matching**:
- Config: `/welcome`
- Matches: `/welcome`, `/welcome?ref=google`, `/welcome/step-2`
- Does not match: `/welcome-back`, `/user/welcome`

Display to user: *"This will match `/welcome`, `/welcome?ref=google`, `/welcome/step-2`"*

#### 3.3 Conversion Candidate Scoring

When suggesting conversion pages, score candidates by:

| Signal | Points | Detection |
|--------|--------|-----------|
| URL matches common patterns (`/thank*`, `/welcome`, `/success`, `/confirmed`, `/dashboard`) | +3 | Regex match |
| Page follows `/signup`, `/checkout`, `/register` in session | +3 | Sequence analysis |
| First view of `/dashboard` or `/app/*` in session | +2 | Session-first detection |
| Page is often last in session (high exit rate) | +2 | Exit rate > 50% |
| Page has low bounce rate | +1 | Bounce rate < 30% |

Return top 3 candidates sorted by score.

---

### Component 4: Dashboard Updates

#### 4.1 Overview Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Overview                                           [7 days ▼]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Sessions │  │Page Views│  │Conversion│  │Avg Engage│            │
│  │  1,247   │  │  4,832   │  │   3.2%   │  │  2m 34s  │            │
│  │ +12% ▲   │  │ +8% ▲    │  │ +0.5% ▲  │  │ +15s ▲   │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📊 Set up conversion tracking                      [Dismiss] │   │
│  │                                                               │   │
│  │ We found potential conversion pages in your traffic:         │   │
│  │                                                               │   │
│  │ ○ /welcome (147 visits, often after /signup)                 │   │
│  │ ○ /dashboard (312 visits, first view pattern)                │   │
│  │ ○ /thank-you (89 visits, form completion)                    │   │
│  │ ○ Custom path: [________________________]                    │   │
│  │                                                               │   │
│  │                              [Set as primary conversion]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Traffic Over Time                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Chart: Sessions + Page Views line chart]                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐   │
│  │ Top Pages                   │ │ Traffic Sources             │   │
│  │                             │ │                             │   │
│  │ Path       Views  Eng  Scrl │ │ Channel      Sessions   %   │   │
│  │ /          1,204  1:23  45% │ │ Google          523   42%   │   │
│  │ /pricing     892  2:45  78% │ │ Direct          298   24%   │   │
│  │ /features    567  1:56  62% │ │ Twitter         187   15%   │   │
│  │ /blog/...    445  4:12  89% │ │ Hacker News     142   11%   │   │
│  │ /docs        312  3:34  71% │ │ Other            97    8%   │   │
│  └─────────────────────────────┘ └─────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐   │
│  │ Exit Pages                  │ │ New vs Returning            │   │
│  │                             │ │                             │   │
│  │ Path           Exits    %   │ │ ┌─────────────────────────┐ │   │
│  │ /pricing         234   18%  │ │ │    [PIE CHART]          │ │   │
│  │ /              187   15%  │ │ │  New: 847 (68%)         │ │   │
│  │ /blog/post-1     145   12%  │ │ │  Returning: 400 (32%)   │ │   │
│  │ /features        112    9%  │ │ └─────────────────────────┘ │   │
│  │ /docs/api         98    8%  │ │                             │   │
│  └─────────────────────────────┘ └─────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** Conversion rate stat card and conversion prompt only appear based on state:
- No conversion configured + threshold not met → Show 4 stat cards (no conversion rate)
- No conversion configured + threshold met → Show prompt card
- Conversion configured → Show conversion rate stat card, hide prompt

#### 4.2 Conversions Tab (New)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Conversions                                        [7 days ▼]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Conversion: /welcome (Signup Complete)           [Edit] [Remove]   │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │Conversion│  │Converted │  │ Sessions │                          │
│  │   Rate   │  │ Sessions │  │  Total   │                          │
│  │   3.2%   │  │    40    │  │  1,247   │                          │
│  └──────────┘  └──────────┘  └──────────┘                          │
│                                                                     │
│  Conversion Rate Over Time                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Chart: Conversion rate line chart]                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Top Paths to Conversion                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  / → /pricing → /signup → /welcome                           │   │
│  │  ████████████████████████████████████  18 sessions (45%)     │   │
│  │                                                               │   │
│  │  /blog/* → /pricing → /signup → /welcome                     │   │
│  │  ████████████████████                   9 sessions (22%)     │   │
│  │                                                               │   │
│  │  / → /features → /signup → /welcome                          │   │
│  │  ████████████████                       7 sessions (18%)     │   │
│  │                                                               │   │
│  │  Direct to /signup → /welcome                                │   │
│  │  ██████████                             4 sessions (10%)     │   │
│  │                                                               │   │
│  │  Other paths                                                  │   │
│  │  ████                                   2 sessions (5%)      │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Top Clicked CTAs                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CTA Text                    Type      Clicks                 │   │
│  │ "Get Started Free"          button       89                  │   │
│  │ "View Pricing"              link         67                  │   │
│  │ "Start Trial"               button       45                  │   │
│  │ "Sign Up"                   link         34                  │   │
│  │ "Book Demo"                 link         23                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.3 Conversion Setup Prompt Logic

```
┌─────────────────────────────────────────────────────────┐
│                    Show prompt?                         │
│                         │                               │
│         ┌───────────────┼───────────────┐               │
│         ▼               ▼               ▼               │
│   conversion_path   threshold met?   dismissed?         │
│      is NULL?           │               │               │
│         │               │               │               │
│        YES             YES             NO               │
│         │               │               │               │
│         └───────────────┴───────────────┘               │
│                         │                               │
│                        ALL                              │
│                         │                               │
│                    Show prompt                          │
└─────────────────────────────────────────────────────────┘

Threshold: 50+ sessions OR project created > 7 days ago

Dismissed logic:
- If dismissed_at is NULL → not dismissed
- If dismissed_at < 30 days ago → still dismissed
- If dismissed_at >= 30 days ago → show again
```

---

## API Endpoints

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/[id]/analytics/conversions` | Get conversion stats and funnel data |
| GET | `/api/projects/[id]/analytics/conversion-candidates` | Get suggested conversion pages |
| POST | `/api/projects/[id]/conversion` | Set conversion path |
| DELETE | `/api/projects/[id]/conversion` | Remove conversion path |
| POST | `/api/projects/[id]/conversion/dismiss` | Dismiss setup prompt |

### Updated Endpoints

| Method | Path | Changes |
|--------|------|---------|
| GET | `/api/projects/[id]/analytics/overview` | Add: engagement stats, scroll stats, new/returning, exit pages, UTM breakdown |

---

## Data Persistence Summary

| Data | Storage | Retention |
|------|---------|-----------|
| Engagement time (per page view) | Tinybird `events` | 90 days |
| Scroll depth (per page view) | Tinybird `events` | 90 days |
| Visitor ID | Tinybird `events` | 90 days |
| UTM parameters | Tinybird `events` | 90 days |
| CTA clicks | Tinybird `events` | 90 days |
| Is returning flag | Tinybird `events` | 90 days |
| Conversion path config | PostgreSQL `projects` | Indefinite |
| Prompt dismissal timestamp | PostgreSQL `projects` | Indefinite |
| Visitor ID cookie | User's browser | 1 year |
| Session ID cookie | User's browser | 1 year (30-min inactivity expiry) |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User changes conversion path | Historical data recalculated (query-time filter) |
| User removes conversion path | Conversion stats hidden; data retained |
| Conversion path matches no pages | Show 0% conversion rate; suggest reviewing path |
| UTM params exceed 100 chars | Truncate silently |
| CTA text contains PII | Truncation to 30 chars reduces risk; document limitation |
| User dismisses prompt, returns after 30 days | Prompt reappears if conversion still not set |
| DNT enabled | No new metrics tracked; matches V1 behavior |
| Session has no page views (edge case) | No engagement/scroll data; session_start still recorded |

---

## Out of Scope (MVP)

- Multiple conversion events (V3)
- User-defined funnel steps (V3)
- Cohort analysis (V3)
- A/B test integration (V3)
- Conversion value / revenue tracking (V3)
- Goal-based alerting (V3)
- Custom engagement time thresholds (V3)
- Scroll depth heatmaps (V3)

---

## Privacy Checklist

| Metric | PII Risk | Mitigation |
|--------|----------|------------|
| Engagement time | None | Aggregate milliseconds only |
| Scroll depth | None | Percentage only |
| Visitor ID | None | Anonymous UUID; no cross-site tracking |
| UTM parameters | Low | Truncate to 100 chars; user-controlled input |
| CTA clicks | Low | Text truncated to 30 chars; href domain only |
| Is returning | None | Boolean flag only |

**All metrics maintain GDPR/CCPA compliance. No consent banner required.**

---

## Success Criteria

1. **SDK size remains under 3KB gzipped** after all additions
2. **Zero configuration required** for engagement, scroll, UTM, and referrer metrics
3. **Conversion setup takes under 60 seconds** from prompt to configured
4. **Funnel visualization loads in under 2 seconds** for 90-day date range
5. **All new metrics respect DNT** consistently with V1 behavior

---

## Future Considerations

1. **Multiple Conversions:** Allow users to define secondary conversion events
2. **Custom Funnels:** Let users define specific step sequences to track
3. **Conversion Value:** Track revenue/value associated with conversions
4. **Engagement Segments:** Group users by engagement level (high/medium/low)
5. **Scroll Heatmaps:** Visual representation of where users stop scrolling
6. **Goal Alerts:** Notify users when conversion rate drops below threshold
