# Execution Plan: MCP Analytics Querying

Commands in `Verify:` lines are run from this feature directory unless they explicitly `cd ../..` to the project root.

This is a planned feature workstream. It does not supersede the primary active workstream in `../../plans/PLAN_STATUS.md`; execute it only when the human explicitly requests this feature or marks it active.

## Overview

| Metric | Value |
|--------|-------|
| Feature | MCP analytics querying |
| Target Project | fast_pr_analytics |
| Total Phases | 5 |
| Total Steps | 10 |
| Total Tasks | 17 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/web/app/api/mcp/route.ts` | uses | Keep hosted MCP auth and `mcp:install` authority unchanged. |
| `apps/web/lib/mcp/server.ts` | modifies | Register the analytics read tools after existing smoke/install tools. |
| `apps/web/lib/mcp/tools/**` | creates/modifies | Add analytics schemas, shared auth helper, tool handlers, and result shaping. |
| `apps/web/lib/db/queries/projects.ts` | modifies | Add read-only owned project listing, lookup, and MCP repo-context resolution helpers. |
| `apps/web/app/api/projects/[id]/analytics/**` | modifies | Refactor overview, sessions, and live routes to shared services while preserving HTTP response shapes. |
| `apps/web/lib/analytics/**` | creates/modifies | Create the shared analytics service layer used by dashboard routes and MCP tools. |
| `apps/web/lib/analytics/e2e-fixtures.ts` | modifies | Broaden local fixture parsing to accept custom event types while preserving dashboard semantics. |
| `apps/web/e2e/scenarios/*.json` | creates/modifies | Add MCP analytics scenarios for signup, partial data, no-events, and project ambiguity. |
| `apps/web/scripts/mcp-self-test.mjs` | references | Reuse local DB, server startup, OAuth token, MCP client, and cleanup patterns. |
| `apps/web/scripts/mcp-analytics-querying-self-test.mjs` | creates | Add the MCP-transport flow verification harness. |
| `docs/agent-testing.md` | modifies | Document the new agent-runnable MCP analytics verification command. |
| `packages/sdk/**` | none | Must remain unchanged for this feature. |
| `apps/events/**` | none | Must remain unchanged for this feature. |

## Phase Dependency Graph

```text
Phase 1: Shared Analytics Foundation
  -> Phase 2: Event Insight Services
      -> Phase 3: MCP Tool Surface
          -> Phase 4: MCP Flow Harness
              -> Phase 5: Regression Hardening
```

---

## Phase 1: Shared Analytics Foundation

**Goal:** Create the shared read-only analytics foundation and move dashboard-compatible query behavior behind services before exposing it through MCP.
**Depends On:** None

### Pre-Phase Setup

- [x] (CODE) This workstream is recorded as planned or active without changing the primary active workstream.
  - Verify: `cd ../.. && rg -q '\`features/mcp_analytics_querying/\` \| feature \| (planned|active)' plans/PLAN_STATUS.md && rg -q 'Primary active workstream: \`features/mcp_onboarding/\`' plans/PLAN_STATUS.md`
- [x] (CODE) Feature specification inputs exist.
  - Verify: `test -f FEATURE_SPEC.md && test -f FEATURE_TECHNICAL_SPEC.md && test -f FLOW_VERIFICATION_PLAN.md`
- [x] (CODE) Dashboard analytics route tests exist before refactor work starts.
  - Verify: `cd ../.. && rg -l 'analytics.*(overview|sessions|live)|overview.*analytics|sessions.*analytics|live.*analytics' apps/web/tests`
- [x] (CODE) SDK and event ingestion packages are present but out of scope.
  - Verify: `cd ../.. && test -d packages/sdk && test -d apps/events`

### Step 1.1: Shared Analytics Primitives

**Depends On:** None

---

#### Task 1.1.A: Add Analytics Period, URL, Provenance, And Tinybird Primitives

**Description:**
Create the common analytics utility modules that all service functions will use for period parsing, rolling UTC data windows, dashboard URLs, sanitization, and Tinybird error handling. These utilities prevent MCP tools from duplicating route-level parsing or leaking query internals.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Shared Analytics Service Layer"; FEATURE_SPEC.md "Analytics Semantics" and "Authorization And Privacy"

**Acceptance Criteria:**
- [x] (CODE) Shared period, URL, Tinybird, type, and service entrypoint files exist under `apps/web/lib/analytics/`.
  - Verify: `cd ../.. && test -f apps/web/lib/analytics/periods.ts && test -f apps/web/lib/analytics/urls.ts && test -f apps/web/lib/analytics/tinybird.ts && test -f apps/web/lib/analytics/types.ts && test -f apps/web/lib/analytics/service.ts`
- [x] (TEST) Period tests cover only `24h`, `7d`, and `30d`, rolling UTC windows, `dataThrough`, and invalid periods.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview`
- [x] (TEST) Sanitization tests strip query strings/fragments, bound untrusted strings, and convert referrers to safe display values.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-events analytics-service-recommendations`
- [x] (CODE) Tinybird wrappers map failures to sanitized `service_error` values without raw SQL, bearer tokens, stack traces, or credentials.
  - Verify: `cd ../.. && rg -q 'service_error' apps/web/lib/analytics/tinybird.ts && ! rg -n 'stack|TINYBIRD|Authorization|Bearer|rawSql' apps/web/lib/analytics/tinybird.ts`
- [x] (CODE) Shared response types include project provenance fields `projectName`, `generatedAt`, `dataWindow`, and `queryBasis`.
  - Verify: `cd ../.. && rg -q 'projectName|generatedAt|dataWindow|queryBasis' apps/web/lib/analytics/types.ts`

**Files to Create:**
- `apps/web/lib/analytics/periods.ts` - Period parsing and rolling UTC data-window helpers.
- `apps/web/lib/analytics/urls.ts` - Dashboard URL builders and safe path/referrer sanitizers.
- `apps/web/lib/analytics/tinybird.ts` - Safe Tinybird query wrapper and error mapping.
- `apps/web/lib/analytics/types.ts` - Shared analytics response and provenance types.
- `apps/web/lib/analytics/service.ts` - Shared analytics service exports.
- `apps/web/tests/analytics-service-overview.test.ts` - Period and provenance coverage tied to overview service behavior.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` - Current period parsing and Tinybird query behavior.
- `apps/web/app/api/projects/[id]/analytics/sessions/route.ts` - Current sessions semantics.
- `apps/web/app/api/projects/[id]/analytics/live/route.ts` - Current live feed semantics.

**Dependencies:**
- None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Analytics Service Contracts"

**Browser Verification:**
- Criteria IDs: None
- Notes: No browser behavior in this task.

---

#### Task 1.1.B: Add Read-Only Project Access And Repo Resolution Helpers

**Description:**
Add read-only owned project helpers for analytics access and implement MCP repo-context resolution using the existing fingerprint concepts. Every analytics service will depend on this layer before querying fixtures or Tinybird.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Project Access And Resolution"; FEATURE_SPEC.md "Project Selection From Current Repo"

**Acceptance Criteria:**
- [x] (CODE) Project query module exports `listOwnedAnalyticsProjects`, `getOwnedAnalyticsProject`, `resolveOwnedMcpProjectForRepoContext`, and `dashboardUrlsForProject`.
  - Verify: `cd ../.. && rg -q 'listOwnedAnalyticsProjects|getOwnedAnalyticsProject|resolveOwnedMcpProjectForRepoContext|dashboardUrlsForProject' apps/web/lib/db/queries/projects.ts`
- [x] (TEST) Project query tests cover exact fingerprint match, no match, broad multiple matches, malformed repo context returning `invalid_repo_context`, and another user's matching project.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-project-queries`
- [x] (TEST) Multiple-match coverage uses broad owned candidates and does not require duplicate exact fingerprints.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-project-queries`
- [x] (CODE) Resolution helpers reuse `normalizeGitRemote`, `buildMcpProjectFingerprintInput`, and `mcpFingerprint` rather than creating a second fingerprint algorithm.
  - Verify: `cd ../.. && rg -q 'normalizeGitRemote|buildMcpProjectFingerprintInput|mcpFingerprint' apps/web/lib/db/queries/projects.ts`
- [x] (TEST) Owned-project helper tests prove analytics project listing does not expose fingerprints, GitHub installation ids, OAuth token data, or billing fields.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-project-queries`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/db/queries/projects.ts` - Add read-only analytics project helpers and repo-context resolution.
- `apps/web/tests/mcp-project-queries.test.ts` - Extend MCP project helper coverage.

**Existing Code to Reference:**
- `apps/web/lib/db/queries/projects.ts` - Existing MCP project fingerprint and dashboard URL behavior.
- `apps/web/tests/mcp-project-queries.test.ts` - Existing MCP project reuse test patterns.

**Dependencies:**
- Task 1.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Project Access And Resolution"

**Browser Verification:**
- Criteria IDs: None
- Notes: Query-layer task.

---

### Step 1.2: Dashboard-Compatible Analytics Services

**Depends On:** Step 1.1

---

#### Task 1.2.A: Extract Project Overview Service Without Changing Dashboard API Shape

**Description:**
Move overview route logic into the shared analytics service and keep the route adapter returning the existing dashboard JSON shape. The service should produce richer provenance for MCP while the HTTP route remains backward compatible.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Dashboard Semantics"; FEATURE_SPEC.md "get_project_overview"

**Acceptance Criteria:**
- [x] (CODE) `getProjectOverview` is exported from the shared analytics service and called by the overview route.
  - Verify: `cd ../.. && rg -q 'getProjectOverview' apps/web/lib/analytics apps/web/app/api/projects/[id]/analytics/overview/route.ts`
- [x] (TEST) Existing overview API tests pass after the route delegates to the shared service.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-overview-api`
- [x] (TEST) Service tests cover `ok` and `no_events` overview statuses with zero metrics for empty projects.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview`
- [x] (TEST) Overview service output includes project provenance and exact resolved data-window timestamps for period-based MCP responses.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview`
- [x] (CODE) The dashboard overview route response does not include MCP-only provenance fields.
  - Verify: `cd ../.. && ! rg -n 'projectName|queryBasis|dataWindow' apps/web/app/api/projects/[id]/analytics/overview/route.ts`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/analytics/service.ts` - Add overview service behavior.
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` - Adapt route to shared service.
- `apps/web/tests/analytics-overview-api.test.ts` - Preserve dashboard API golden behavior.
- `apps/web/tests/analytics-service-overview.test.ts` - Add service-level MCP semantics coverage.

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` - Existing query semantics and HTTP shape.
- `apps/web/tests/analytics-overview-api.test.ts` - Existing dashboard API expectations.

**Dependencies:**
- Tasks 1.1.A and 1.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "`get_project_overview`"

**Browser Verification:**
- Criteria IDs: None
- Notes: API/service task.

---

#### Task 1.2.B: Extract Sessions, Live Events, Top Pages, And Top Referrers Services

**Description:**
Extract sessions and live route behavior into shared service functions and add top-page/top-referrer wrappers over overview semantics. The route adapters should preserve existing dashboard behavior while MCP can consume compact project-specific results with dashboard URLs.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Dashboard Semantics"; FEATURE_SPEC.md "`get_sessions_summary`", "`get_live_events`", "`get_top_pages`", and "`get_top_referrers`"

**Acceptance Criteria:**
- [x] (CODE) Shared service exports `getSessionsSummary`, `getLiveEvents`, `getTopPages`, and `getTopReferrers`.
  - Verify: `cd ../.. && rg -q 'getSessionsSummary|getLiveEvents|getTopPages|getTopReferrers' apps/web/lib/analytics/service.ts`
- [x] (TEST) Existing sessions and live API tests pass after route extraction.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-sessions-api analytics-live-feed-api`
- [x] (TEST) Service tests verify sessions keep existing dashboard semantics, including Tinybird returning visitors behavior.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview`
- [x] (TEST) Top pages and top referrers match overview values for the same project, period, and limit.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview`
- [x] (TEST) Live event service validates `limit` and `since`, preserves ordering, and returns `no_events` with `hasMore: false` when empty.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/analytics/service.ts` - Add sessions, live, top pages, and top referrers services.
- `apps/web/app/api/projects/[id]/analytics/sessions/route.ts` - Delegate to shared service.
- `apps/web/app/api/projects/[id]/analytics/live/route.ts` - Delegate to shared service.
- `apps/web/tests/analytics-sessions-api.test.ts` - Preserve dashboard API behavior.
- `apps/web/tests/analytics-live-feed-api.test.ts` - Preserve dashboard API behavior.
- `apps/web/tests/analytics-service-overview.test.ts` - Add service-level coverage.

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/analytics/sessions/route.ts` - Existing sessions semantics.
- `apps/web/app/api/projects/[id]/analytics/live/route.ts` - Existing live feed semantics.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Existing fixture-backed analytics behavior.

**Dependencies:**
- Task 1.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "`get_sessions_summary`", "`get_live_events`", and "`get_top_pages` And `get_top_referrers`"

**Browser Verification:**
- Criteria IDs: None
- Notes: API/service task.

---

### Phase 1 Checkpoint

**Automated Checks:**
- [x] (TEST) Dashboard route and service tests for overview, sessions, and live analytics pass.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-overview-api analytics-sessions-api analytics-live-feed-api analytics-service-overview`
- [x] (TYPE) Web type checking passes after service extraction.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [x] (TEST) Existing MCP install route tests still pass after shared auth/project code changes.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route mcp-auth prepare-nextjs-install-patch`
- [x] (CODE) SDK and event ingestion files are not modified for this feature.
  - Verify: `cd ../.. && git diff --name-only -- packages/sdk apps/events | wc -l | tr -d ' ' | grep -q '^0$'`

---

## Phase 2: Event Insight Services

**Goal:** Add event discovery, event schema, path-to-event, and deterministic recommendation services on top of the shared analytics layer.
**Depends On:** Phase 1

### Pre-Phase Setup

- [x] (TEST) Phase 1 service and route tests pass before event-specific services are added.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-overview-api analytics-sessions-api analytics-live-feed-api analytics-service-overview`
- [x] (CODE) Existing scenario seeder and fixture parser are present.
  - Verify: `cd ../.. && test -f apps/web/scripts/seed-e2e-scenario.mjs && test -f apps/web/lib/analytics/e2e-fixtures.ts`

### Step 2.1: Fixture And Scenario Support

**Depends On:** Phase 1

---

#### Task 2.1.A: Broaden Local Analytics Fixture Parsing For Custom Event Types

**Description:**
Allow local E2E analytics fixtures to include custom event types such as `signup_completed` without changing production ingestion behavior. Dashboard-compatible aggregations must continue to count only the event types that existing dashboard routes understand.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Scenario Fixtures"; FEATURE_SPEC.md "Data Persistence" and "Verification Guidance"

**Acceptance Criteria:**
- [x] (CODE) `ParsedFixtureEvent.event_type` accepts generic strings in fixture mode.
  - Verify: `cd ../.. && rg -q 'event_type.*string|string.*event_type' apps/web/lib/analytics/e2e-fixtures.ts`
- [x] (TEST) Fixture tests prove custom event names parse successfully.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-analytics-fixtures`
- [x] (TEST) Fixture tests prove dashboard page/session aggregations still filter to dashboard-compatible event names.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-analytics-fixtures`
- [x] (TEST) Scenario contract tests permit custom analytics event names without weakening required scenario fields.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-scenarios`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/analytics/e2e-fixtures.ts` - Broaden fixture event parsing.
- `apps/web/tests/e2e-analytics-fixtures.test.ts` - Add custom-event fixture parser coverage.
- `apps/web/tests/e2e-scenarios.test.ts` - Permit custom analytics event names.

**Existing Code to Reference:**
- `apps/web/lib/analytics/e2e-fixtures.ts` - Fixture parsing and aggregation logic.
- `apps/web/tests/e2e-analytics-fixtures.test.ts` - Existing fixture behavior tests.

**Dependencies:**
- Phase 1

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "For E2E fixtures"

**Browser Verification:**
- Criteria IDs: None
- Notes: Fixture parser task.

---

#### Task 2.1.B: Add MCP Analytics Scenario Fixtures

**Description:**
Add deterministic scenarios for signup-path success, partial signup data, and multiple project ambiguity. Exact `resolve_project` scenarios must compute fingerprints from the same repo/app context the MCP tool receives; the multiple-project scenario is the only broad-match legacy exception.

**Requirement:** FLOW_VERIFICATION_PLAN.md "Setup/State"; FEATURE_TECHNICAL_SPEC.md "Scenario Fixtures"

**Acceptance Criteria:**
- [x] (CODE) Required MCP analytics scenario files exist.
  - Verify: `cd ../.. && test -f apps/web/e2e/scenarios/mcp-active-with-signup-events.json && test -f apps/web/e2e/scenarios/mcp-active-partial-signup-data.json && test -f apps/web/e2e/scenarios/mcp-multiple-projects.json`
- [x] (TEST) Scenario tests verify exact resolver fixtures compute `mcpFingerprint` from `buildMcpProjectFingerprintInput` and `mcpFingerprint`.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-scenarios`
- [x] (TEST) The `mcp-multiple-projects` scenario is the only scenario allowed to use null or deliberately non-matching fingerprints for broad-match ambiguity.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-scenarios`
- [x] (TEST) Scenario listing includes the new MCP analytics scenarios.
  - Verify: `cd ../.. && pnpm --filter web e2e:scenarios | rg 'mcp-active-with-signup-events|mcp-active-partial-signup-data|mcp-multiple-projects'`
- [x] (TEST) Local seeding succeeds for the new scenario fixtures against a local database URL.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:seed mcp-active-with-signup-events`

**Files to Create:**
- `apps/web/e2e/scenarios/mcp-active-with-signup-events.json` - Signup path happy-path scenario.
- `apps/web/e2e/scenarios/mcp-active-partial-signup-data.json` - Partial path/recommendation scenario.
- `apps/web/e2e/scenarios/mcp-multiple-projects.json` - Broad-match project ambiguity scenario.

**Files to Modify:**
- `apps/web/scripts/seed-e2e-scenario.mjs` - Compute or validate MCP fingerprints where required.
- `apps/web/tests/e2e-scenarios.test.ts` - Add scenario contract coverage.

**Existing Code to Reference:**
- `apps/web/e2e/scenarios/mcp-active-with-events.json` - Existing MCP scenario style.
- `apps/web/e2e/scenarios/mcp-active-no-events.json` - Existing no-events scenario style.
- `apps/web/lib/db/queries/projects.ts` - Fingerprint helpers.

**Dependencies:**
- Task 2.1.A

**Spec Reference:** FLOW_VERIFICATION_PLAN.md "Setup/State"

**Browser Verification:**
- Criteria IDs: None
- Notes: Scenario seeding task.

---

### Step 2.2: Event Query Services

**Depends On:** Step 2.1

---

#### Task 2.2.A: Implement Event Discovery And Event Schema Services

**Description:**
Add services that list observed event names and summarize safe properties for one exact event name. These services let agents discover event taxonomy before attempting event-specific answers.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "`list_events`" and "`get_event_schema`"; FEATURE_SPEC.md "Event Matching"

**Acceptance Criteria:**
- [x] (CODE) Shared service exports `listEvents` and `getEventSchema`.
  - Verify: `cd ../.. && rg -q 'listEvents|getEventSchema' apps/web/lib/analytics/service.ts`
- [x] (TEST) Event discovery tests cover observed custom event names, counts, first/last seen timestamps, safe common properties, and no-events state.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-events`
- [x] (TEST) Event schema tests exclude raw identifiers, bound example values to 128 characters, and cap example values at three per property.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-events`
- [x] (TEST) Event-specific services require exact event names and do not silently choose between multiple signup-like events.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-events`
- [x] (CODE) Common property normalization maps warehouse snake_case fields to MCP camelCase names.
  - Verify: `cd ../.. && rg -q 'sessionId|utmSource|engagementTimeMs|scrollDepth|ctaClicks' apps/web/lib/analytics/service.ts apps/web/lib/analytics/types.ts`

**Files to Create:**
- `apps/web/tests/analytics-service-events.test.ts` - Event discovery and schema service coverage.

**Files to Modify:**
- `apps/web/lib/analytics/service.ts` - Add event discovery and schema services.
- `apps/web/lib/analytics/types.ts` - Add event discovery/schema response types.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Expose fixture reads needed by event services.

**Existing Code to Reference:**
- `tinybird/datasources/events.datasource` - Event warehouse columns and event type source.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Local fixture read model.

**Dependencies:**
- Tasks 2.1.A and 2.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "`list_events`" and "`get_event_schema`"

**Browser Verification:**
- Criteria IDs: None
- Notes: Service task.

---

#### Task 2.2.B: Implement Paths-To-Event Service

**Description:**
Add a path reconstruction service that summarizes page paths before an exact target event in the same session. It must report coverage and return `ok`, `partial_data`, `insufficient_data`, or `no_events` according to the technical spec thresholds.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "`get_paths_to_event`"; FEATURE_SPEC.md "Happy Path: Page Behavior Before Signup"

**Acceptance Criteria:**
- [x] (CODE) Shared service exports `getPathsToEvent`.
  - Verify: `cd ../.. && rg -q 'getPathsToEvent' apps/web/lib/analytics/service.ts`
- [x] (TEST) Path tests cover absent target event as `insufficient_data` with suggested events.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-paths`
- [x] (TEST) Path tests cover fewer than 5 target events and below-50-percent prior-path coverage as `partial_data`.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-paths`
- [x] (TEST) Path tests cover grouped path sequences sorted by count descending and sequence string ascending.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-paths`
- [x] (TEST) Path tests cover target-event and page-view query caps producing `partial_data` limitations when reached.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-paths`

**Files to Create:**
- `apps/web/tests/analytics-service-paths.test.ts` - Path-to-event service coverage.

**Files to Modify:**
- `apps/web/lib/analytics/service.ts` - Add path-to-event service.
- `apps/web/lib/analytics/types.ts` - Add path response and coverage types.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Support path reconstruction from fixture rows.

**Existing Code to Reference:**
- `apps/web/lib/analytics/e2e-fixtures.ts` - Existing fixture event ordering and timestamp normalization.
- `tinybird/datasources/events.datasource` - Event columns used for path reconstruction.

**Dependencies:**
- Task 2.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "`get_paths_to_event`"

**Browser Verification:**
- Criteria IDs: None
- Notes: Service task.

---

#### Task 2.2.C: Implement Deterministic Next-Event Recommendation Service

**Description:**
Add deterministic recommendations based on observed pages, referrers, event names, and an optional bounded goal string. This service must never create pending tasks or invoke an LLM.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "`suggest_next_events`"; FEATURE_SPEC.md "suggest_next_events"

**Acceptance Criteria:**
- [x] (CODE) Shared service exports `suggestNextEvents`.
  - Verify: `cd ../.. && rg -q 'suggestNextEvents' apps/web/lib/analytics/service.ts`
- [x] (TEST) Recommendation tests cover signup, onboarding, pricing/CTA, checkout/payment, and feature-usage goal terms.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-recommendations`
- [x] (TEST) Recommendation tests suppress events already observed in the selected period.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-recommendations`
- [x] (TEST) Recommendation tests cover `no_events`, `partial_data`, and `insufficient_data` statuses with evidence and limitations where required.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-recommendations`
- [x] (TEST) `createsPendingTasks` is always false and no pending-task write function is called.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-recommendations`

**Files to Create:**
- `apps/web/tests/analytics-service-recommendations.test.ts` - Recommendation service coverage.

**Files to Modify:**
- `apps/web/lib/analytics/service.ts` - Add recommendation service.
- `apps/web/lib/analytics/types.ts` - Add recommendation response types.

**Existing Code to Reference:**
- `features/dashboard_pending_tasks/FEATURE_SPEC.md` - Future pending-task context to avoid coupling in this feature.
- `apps/web/lib/analytics/service.ts` - Overview and event discovery services used as evidence.

**Dependencies:**
- Tasks 2.2.A and 2.2.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "`suggest_next_events`"

**Browser Verification:**
- Criteria IDs: None
- Notes: Service task.

---

### Phase 2 Checkpoint

**Automated Checks:**
- [x] (TEST) Event, path, recommendation, fixture, and scenario tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-events analytics-service-paths analytics-service-recommendations e2e-analytics-fixtures e2e-scenarios`
- [x] (TYPE) Web type checking passes after event service additions.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [x] (TEST) Dashboard-compatible analytics route tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-overview-api analytics-sessions-api analytics-live-feed-api`
- [x] (CODE) Production ingestion remains unchanged.
  - Verify: `cd ../.. && git diff --name-only -- apps/events packages/sdk | wc -l | tr -d ' ' | grep -q '^0$'`

---

## Phase 3: MCP Tool Surface

**Goal:** Register authenticated read-only MCP analytics tools that call the shared services and return compact structured responses with dashboard URLs.
**Depends On:** Phase 2

### Pre-Phase Setup

- [x] (TEST) Analytics service tests pass before MCP handlers are added.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-service-overview analytics-service-events analytics-service-paths analytics-service-recommendations`
- [x] (CODE) Existing MCP server registration files exist.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/server.ts && test -f apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts && test -f apps/web/lib/mcp/tools/schemas.ts`

### Step 3.1: Schemas And Result Shaping

**Depends On:** Phase 2

---

#### Task 3.1.A: Add MCP Analytics Auth Helper And Permissive Schemas

**Description:**
Add a shared MCP auth helper for extracting `userId` from `extra.authInfo` and define analytics input/output schemas. Input schemas must be permissive for recoverable invalid values so handlers can return documented structured statuses instead of only SDK validation failures.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "MCP Tool Implementation" and "Validation Matrix"

**Acceptance Criteria:**
- [x] (CODE) MCP auth helper exists and install and analytics tools use the same `userIdFromAuth` helper.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/tools/auth.ts && rg -q 'userIdFromAuth' apps/web/lib/mcp/tools`
- [x] (CODE) Analytics schema file exports input and output schemas for all 11 analytics tools.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/tools/analytics-schemas.ts && rg -q 'listProjects|resolveProject|listEvents|getEventSchema|getPathsToEvent|getProjectOverview|getLiveEvents|getSessionsSummary|getTopPages|getTopReferrers|suggestNextEvents' apps/web/lib/mcp/tools/analytics-schemas.ts`
- [x] (TEST) Schema tests prove invalid `period`, `limit`, `since`, `goal`, `eventName`, `targetEvent`, `maxSteps`, and repo path values reach handler validation and return structured `invalid_period`, `invalid_limit`, `invalid_since`, `invalid_goal`, `invalid_event_name`, `invalid_steps`, and `invalid_repo_context` statuses.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (CODE) Tool schemas define `outputSchema` for documented `structuredContent`.
  - Verify: `cd ../.. && rg -q 'outputSchema' apps/web/lib/mcp/tools/analytics-schemas.ts apps/web/lib/mcp/tools/analytics.ts`
- [x] (CODE) No new OAuth scope constant is introduced for analytics reads.
  - Verify: `cd ../.. && ! rg -n 'mcp:analytics|ANALYTICS.*SCOPE|MCP_ANALYTICS' apps/web/lib apps/web/app`

**Files to Create:**
- `apps/web/lib/mcp/tools/auth.ts` - Shared MCP tool auth helper.
- `apps/web/lib/mcp/tools/analytics-schemas.ts` - Analytics MCP input/output schemas.
- `apps/web/tests/mcp-analytics-tools.test.ts` - MCP tool schema and result-shaping coverage.

**Files to Modify:**
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Use shared auth helper without changing install behavior.
- `apps/web/lib/mcp/tools/schemas.ts` - Keep install schemas separate or re-export shared schema helpers if needed.

**Existing Code to Reference:**
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Current auth/result pattern.
- `apps/web/lib/mcp/tools/schemas.ts` - Existing schema organization.
- `apps/web/lib/mcp/auth.ts` - Current bearer-token auth model.

**Dependencies:**
- Phase 2

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Validation Matrix"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP schema task.

---

#### Task 3.1.B: Add Analytics Tool Result Mapping And Sanitized Error Statuses

**Description:**
Implement the shared MCP result adapter that places service data in `structuredContent`, emits one compact text summary, and sets `isError` only for documented execution error statuses.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Status Mapping"; FEATURE_SPEC.md "Response Design"

**Acceptance Criteria:**
- [x] (CODE) `toAnalyticsToolResult` maps service results into MCP `structuredContent` and `content[{ type: "text" }]`.
  - Verify: `cd ../.. && rg -q 'toAnalyticsToolResult|structuredContent|content' apps/web/lib/mcp/tools/analytics.ts`
- [x] (TEST) Domain success statuses do not set `isError`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (TEST) Invalid input, unauthorized, project-not-found, and service-error statuses set `isError: true`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (TEST) Missing `extra.authInfo.extra.userId` returns structured `unauthorized`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (TEST) Result text never includes OAuth tokens, Tinybird credentials, raw SQL, GitHub installation ids, billing fields, or private source content.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`

**Files to Create:**
- `apps/web/lib/mcp/tools/analytics.ts` - Analytics tool registration helpers and result adapter.

**Files to Modify:**
- `apps/web/tests/mcp-analytics-tools.test.ts` - Add result mapping and sanitized error coverage.

**Existing Code to Reference:**
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Current structured MCP result pattern.
- `apps/web/lib/mcp/server.ts` - Tool registration entrypoint.

**Dependencies:**
- Task 3.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Status Mapping" and "Tool List"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP result-shaping task.

---

### Step 3.2: Tool Registration

**Depends On:** Step 3.1

---

#### Task 3.2.A: Register Project And Dashboard-Semantics Analytics Tools

**Description:**
Register read-only MCP tools for project discovery, repo resolution, project overview, live events, sessions, top pages, and top referrers. These tools should call only shared services and owned-project helpers.

**Requirement:** FEATURE_SPEC.md "`list_projects`", "`resolve_project`", "`get_project_overview`", "`get_live_events`", "`get_sessions_summary`", "`get_top_pages`", and "`get_top_referrers`"

**Acceptance Criteria:**
- [x] (CODE) MCP server registers `list_projects`, `resolve_project`, `get_project_overview`, `get_live_events`, `get_sessions_summary`, `get_top_pages`, and `get_top_referrers`.
  - Verify: `cd ../.. && rg -q 'list_projects|resolve_project|get_project_overview|get_live_events|get_sessions_summary|get_top_pages|get_top_referrers' apps/web/lib/mcp/server.ts apps/web/lib/mcp/tools/analytics.ts`
- [x] (TEST) Tool registration tests assert titles, descriptions, input schemas, output schemas, and read-only annotations for these tools.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-route`
- [x] (TEST) Ownership tests prove project ids owned by another user return `project_not_found` before analytics queries run.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-project-queries`
- [x] (TEST) Tool responses include dashboard URLs, compact summaries, and provenance fields for project-specific responses.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (TEST) Existing install MCP tool behavior still passes after analytics registration.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route prepare-nextjs-install-patch`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/mcp/server.ts` - Register analytics tools.
- `apps/web/lib/mcp/tools/analytics.ts` - Add handlers for project and dashboard-semantics tools.
- `apps/web/tests/mcp-analytics-tools.test.ts` - Add registration and handler coverage.
- `apps/web/tests/mcp-route.test.ts` - Preserve existing MCP route expectations and include tool list checks where appropriate.

**Existing Code to Reference:**
- `apps/web/lib/mcp/server.ts` - Current tool registration style.
- `apps/web/tests/mcp-route.test.ts` - Existing MCP route test style.

**Dependencies:**
- Tasks 3.1.A and 3.1.B

**Spec Reference:** FEATURE_SPEC.md "MCP Tool Set"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP tool registration task.

---

#### Task 3.2.B: Register Event Discovery, Path, And Recommendation Tools

**Description:**
Register read-only MCP tools for event discovery, event schema inspection, paths to event, and next-event recommendations. These tools support the conversational analytics loop without creating dashboards, pending tasks, or code changes.

**Requirement:** FEATURE_SPEC.md "`list_events`", "`get_event_schema`", "`get_paths_to_event`", and "`suggest_next_events`"

**Acceptance Criteria:**
- [x] (CODE) MCP server registers `list_events`, `get_event_schema`, `get_paths_to_event`, and `suggest_next_events`.
  - Verify: `cd ../.. && rg -q 'list_events|get_event_schema|get_paths_to_event|suggest_next_events' apps/web/lib/mcp/server.ts apps/web/lib/mcp/tools/analytics.ts`
- [x] (TEST) Tool registration tests assert read-only annotations and output schemas for event/path/recommendation tools.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-route`
- [x] (TEST) Event-specific tool tests cover exact event names, ambiguous signup-like candidates exposed through `list_events`, and no silent fuzzy event selection.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools analytics-service-events`
- [x] (TEST) Path and recommendation MCP tests cover `ok`, `partial_data`, `insufficient_data`, and `no_events` responses with limitations and recommendations where required.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools analytics-service-paths analytics-service-recommendations`
- [x] (TEST) `suggest_next_events` MCP tests prove no pending task is created and `createsPendingTasks` is always false.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools analytics-service-recommendations`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/mcp/tools/analytics.ts` - Add event, path, and recommendation handlers.
- `apps/web/tests/mcp-analytics-tools.test.ts` - Add event/path/recommendation handler coverage.
- `apps/web/tests/mcp-route.test.ts` - Include all analytics tools in tool-list assertions.

**Existing Code to Reference:**
- `apps/web/lib/analytics/service.ts` - Event/path/recommendation service contracts.
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Structured result style.

**Dependencies:**
- Task 3.2.A

**Spec Reference:** FEATURE_SPEC.md "Core User Experience"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP tool registration task.

---

### Phase 3 Checkpoint

**Automated Checks:**
- [x] (TEST) MCP analytics tool, route, project-query, and service tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-route mcp-project-queries analytics-service-overview analytics-service-events analytics-service-paths analytics-service-recommendations`
- [x] (TYPE) Web type checking passes after MCP tool registration.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [x] (TEST) Existing MCP install and OAuth tests still pass with the same `mcp:install` authority.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-auth mcp-oauth-register mcp-oauth-token prepare-nextjs-install-patch`
- [x] (CODE) No free-form natural-language analytics endpoint, raw SQL MCP tool, or prompt-generated dashboard tool is registered.
  - Verify: `cd ../.. && ! rg -n 'natural_language|freeform|raw_sql|sql_query|generated_dashboard|create_dashboard' apps/web/lib/mcp apps/web/app/api/mcp`

---

## Phase 4: MCP Flow Harness

**Goal:** Prove the core conversational analytics flow through the hosted MCP transport with seeded local data and local OAuth tokens.
**Depends On:** Phase 3

### Pre-Phase Setup

- [x] (CODE) Existing MCP self-test harness is available as the implementation pattern.
  - Verify: `cd ../.. && test -f apps/web/scripts/mcp-self-test.mjs`
- [x] (CODE) Port 3000 is not already occupied by an unknown local server before the harness starts.
  - Verify: `! lsof -iTCP:3000 -sTCP:LISTEN -n -P >/dev/null 2>&1`
- [ ] (CODE) Required local E2E database URL is set before harness runs.
  - Verify: `test "${DATABASE_URL:-}" = "postgres://postgres:postgres@127.0.0.1:5432/postgres"`

### Step 4.1: Self-Test Harness

**Depends On:** Phase 3

---

#### Task 4.1.A: Add MCP Analytics Self-Test Startup, OAuth, And Client Plumbing

**Description:**
Create the MCP analytics querying self-test script and package script. The harness should start the local web app in E2E mode, seed local state, create a local OAuth token for the MCP resource, and connect an MCP SDK client to `/api/mcp`.

**Requirement:** FLOW_VERIFICATION_PLAN.md "Harness Shape" and "Driver"

**Acceptance Criteria:**
- [x] (CODE) `apps/web/scripts/mcp-analytics-querying-self-test.mjs` exists and `apps/web/package.json` exposes `e2e:mcp-analytics-querying`.
  - Verify: `cd ../.. && test -f apps/web/scripts/mcp-analytics-querying-self-test.mjs && node -e "const p=require('./apps/web/package.json'); if(!p.scripts['e2e:mcp-analytics-querying']) process.exit(1)"`
- [x] (CODE) Harness uses `E2E_TEST_MODE=1`, `E2E_ANALYTICS_FIXTURE_DIR`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, and the local database URL.
  - Verify: `cd ../.. && rg -q 'E2E_TEST_MODE|E2E_ANALYTICS_FIXTURE_DIR|NEXT_PUBLIC_APP_URL|DATABASE_URL' apps/web/scripts/mcp-analytics-querying-self-test.mjs`
- [x] (CODE) Harness creates a local OAuth access token for resource `http://localhost:3000/api/mcp` and the v1 install/read authority.
  - Verify: `cd ../.. && rg -q 'http://localhost:3000/api/mcp|mcp:install|oauth' apps/web/scripts/mcp-analytics-querying-self-test.mjs`
- [x] (CODE) Harness uses MCP SDK `Client` and `StreamableHTTPClientTransport` rather than direct service imports or dashboard HTTP APIs.
  - Verify: `cd ../.. && rg -q 'Client|StreamableHTTPClientTransport' apps/web/scripts/mcp-analytics-querying-self-test.mjs && ! rg -n 'from .*/lib/analytics/service|/api/projects/.*/analytics' apps/web/scripts/mcp-analytics-querying-self-test.mjs`
- [x] (TEST) Harness starts with a tools-list stage and asserts analytics tools are present with read-only annotations.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`

**Files to Create:**
- `apps/web/scripts/mcp-analytics-querying-self-test.mjs` - MCP analytics flow verification harness.

**Files to Modify:**
- `apps/web/package.json` - Add `e2e:mcp-analytics-querying` script.
- `apps/web/tests/mcp-analytics-tools.test.ts` - Add tool-list assertion helpers if reused by harness.

**Existing Code to Reference:**
- `apps/web/scripts/mcp-self-test.mjs` - Local server, OAuth, MCP client, and cleanup patterns.
- `apps/web/scripts/seed-e2e-scenario.mjs` - Scenario seeding patterns.

**Dependencies:**
- Phase 3

**Spec Reference:** FLOW_VERIFICATION_PLAN.md "Harness Shape"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP transport task, no browser UI assertions.

---

#### Task 4.1.B: Add Harness Scenario Assertions, Failure Output, And Cleanup

**Description:**
Fill the harness with the required conversational tool sequences, invalid-input checks, ownership checks, sanitized failure reporting, and idempotent cleanup. The harness is the primary end-to-end proof for this feature.

**Requirement:** FLOW_VERIFICATION_PLAN.md "Driver", "Assertions", "Evidence", and "Teardown/Rerun"

**Acceptance Criteria:**
- [x] (TEST) Harness passes locally and prints compact JSON with `ok: true` and named stages for tools-list, usage-summary, and signup-path.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying`
- [x] (TEST) Harness asserts usage summary, data arrival, event discovery/schema, signup path, missing signup recommendation, no-events, ownership guard, and invalid input sequences through MCP tools.
  - Verify: `cd ../.. && pnpm --filter web e2e:mcp-analytics-querying`
- [x] (TEST) Harness verifies `resolve_project` exact match does not create projects and `mcp-multiple-projects` returns `multiple_matches`.
  - Verify: `cd ../.. && pnpm --filter web e2e:mcp-analytics-querying`
- [x] (TEST) Harness verifies invalid recoverable inputs return structured statuses such as `invalid_period`, `invalid_limit`, `invalid_since`, `invalid_goal`, `invalid_event_name`, `invalid_steps`, and `invalid_repo_context`.
  - Verify: `cd ../.. && pnpm --filter web e2e:mcp-analytics-querying`
- [x] (CODE) Harness supports `--keep`, deletes temporary fixtures and OAuth rows by default, and exits before starting the web process when port 3000 is already occupied.
  - Verify: `cd ../.. && rg -q -- '--keep|cleanup|3000' apps/web/scripts/mcp-analytics-querying-self-test.mjs`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/scripts/mcp-analytics-querying-self-test.mjs` - Add stage assertions, failure reporting, and cleanup.

**Existing Code to Reference:**
- `apps/web/scripts/mcp-self-test.mjs` - Cleanup and local server management.
- `features/mcp_analytics_querying/FLOW_VERIFICATION_PLAN.md` - Required MCP flow assertions.

**Dependencies:**
- Task 4.1.A

**Spec Reference:** FLOW_VERIFICATION_PLAN.md "Assertions"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP transport task, no screenshots required.

---

### Step 4.2: Agent-Facing Verification Documentation

**Depends On:** Step 4.1

---

#### Task 4.2.A: Add Prompt-Sequence Tests And Agent Testing Docs

**Description:**
Document the new MCP analytics self-test command and add test coverage for prompt-shaped tool sequences. The goal is to prove agents receive enough structured data, limitations, recommendations, exact time windows, and dashboard URLs to synthesize conversational answers.

**Requirement:** FEATURE_SPEC.md "Verification Guidance"; FLOW_VERIFICATION_PLAN.md "Flow Claim"

**Acceptance Criteria:**
- [x] (CODE) `docs/agent-testing.md` documents `pnpm --filter web e2e:mcp-analytics-querying` and the MCP transport boundary.
  - Verify: `cd ../.. && rg -q 'e2e:mcp-analytics-querying|MCP analytics' docs/agent-testing.md`
- [x] (TEST) Prompt-sequence tests cover usage summary, pages before signup with a target event, pages before signup without the target event, next-event suggestions, and multiple project selection.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (TEST) Prompt-sequence tests verify responses include data, limitations where needed, suggested events where needed, exact data window, and dashboard URL.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`
- [x] (TEST) Multiple plausible signup events test proves the agent-facing data exposes candidates instead of silently selecting an event.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools analytics-service-events`

**Files to Create:**
- None

**Files to Modify:**
- `docs/agent-testing.md` - Add MCP analytics querying harness guidance.
- `apps/web/tests/mcp-analytics-tools.test.ts` - Add prompt-sequence coverage over tool calls.

**Existing Code to Reference:**
- `docs/agent-testing.md` - Existing local scenario testing guidance.
- `apps/web/tests/mcp-route.test.ts` - MCP route and tools-list patterns.

**Dependencies:**
- Task 4.1.B

**Spec Reference:** FEATURE_SPEC.md "Prompt-level scenario tests"

**Browser Verification:**
- Criteria IDs: None
- Notes: Agent-facing verification is MCP/tool based, not browser UI based.

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] (TEST) MCP analytics self-test passes against local fixtures and MCP transport.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying`
- [ ] (TEST) Prompt-sequence and MCP tool tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools`

**Regression Verification:**
- [ ] (TEST) Existing MCP onboarding self-test still passes.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-self-test`
- [ ] (CODE) Harness does not use production data, a human GitHub account, personal OAuth tokens, or direct service imports.
  - Verify: `cd ../.. && ! rg -n 'github.com/login|personal access|process.env.GITHUB_TOKEN|from .*/lib/analytics/service' apps/web/scripts/mcp-analytics-querying-self-test.mjs`

---

## Phase 5: Regression Hardening

**Goal:** Close privacy, authorization, and compatibility risks before this planned feature is considered implementation-ready.
**Depends On:** Phase 4

### Pre-Phase Setup

- [ ] (TEST) MCP analytics self-test passes before final hardening.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying`
- [ ] (CODE) No migration is required for this feature.
  - Verify: `cd ../.. && ! git diff --name-only -- apps/web/drizzle/migrations apps/web/lib/db/schema.ts | rg -q '.'`

### Step 5.1: Final Hardening And Release Checks

**Depends On:** Phase 4

---

#### Task 5.1.A: Run Privacy, Security, Regression, And Final Verification Sweep

**Description:**
Add or complete final negative tests for auth, privacy, sanitization, and unsupported scope. Run the targeted suite and broad web checks so the feature is ready for a phase checkpoint without relying on manual interpretation.

**Requirement:** FEATURE_SPEC.md "Authorization And Privacy"; FEATURE_TECHNICAL_SPEC.md "Regression Risks And Mitigations"; FLOW_VERIFICATION_PLAN.md "Negative assertions"

**Acceptance Criteria:**
- [ ] (TEST) Tests prove unauthenticated requests, insufficient authority, and foreign project ids do not run analytics queries.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-auth mcp-project-queries`
- [ ] (TEST) Tests prove tool outputs do not expose OAuth tokens, Tinybird credentials, GitHub installation tokens, billing fields, private source files, raw SQL, stack traces, or unrelated project metadata.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools analytics-service-events analytics-service-recommendations`
- [ ] (TEST) Full targeted feature suite passes.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-project-queries analytics-service-overview analytics-service-events analytics-service-paths analytics-service-recommendations e2e-analytics-fixtures e2e-scenarios analytics-overview-api analytics-sessions-api analytics-live-feed-api`
- [ ] (TYPE) Web type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (TEST) MCP analytics flow harness passes through the hosted MCP route.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying`
- [ ] (BUILD) Web build passes after all feature changes.
  - Verify: `cd ../.. && pnpm --filter web build`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/tests/mcp-analytics-tools.test.ts` - Add any missing final privacy/auth negative coverage.
- `apps/web/tests/analytics-service-events.test.ts` - Add any missing sanitization coverage.
- `apps/web/tests/analytics-service-recommendations.test.ts` - Add any missing recommendation privacy coverage.
- `features/mcp_analytics_querying/EXECUTION_PLAN.md` - Mark completed tasks after verification passes.

**Existing Code to Reference:**
- `apps/web/tests/mcp-auth.test.ts` - Existing MCP auth failure patterns.
- `features/mcp_analytics_querying/FLOW_VERIFICATION_PLAN.md` - Negative assertions and evidence requirements.

**Dependencies:**
- Phase 4

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Regression Risks And Mitigations"

**Browser Verification:**
- Criteria IDs: None
- Notes: No browser UI verification is required for this MCP-only feature.

---

### Phase 5 Checkpoint

**Automated Checks:**
- [ ] (TEST) Full targeted feature suite passes.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tools mcp-project-queries analytics-service-overview analytics-service-events analytics-service-paths analytics-service-recommendations e2e-analytics-fixtures e2e-scenarios analytics-overview-api analytics-sessions-api analytics-live-feed-api`
- [ ] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (BUILD) Web build passes.
  - Verify: `cd ../.. && pnpm --filter web build`
- [ ] (TEST) MCP analytics self-test passes.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying`

**Regression Verification:**
- [ ] (TEST) Existing MCP onboarding self-test still passes.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-self-test`
- [ ] (CODE) No SDK, ingestion, billing, pending-task, or prompt-generated dashboard scope was added on the feature branch.
  - Verify: `cd ../.. && if git diff --name-only "$(git merge-base HEAD origin/main)"...HEAD | rg -q '^(packages/sdk|apps/events|apps/web/lib/stripe|apps/web/app/api/stripe|features/dashboard_pending_tasks)/'; then exit 1; fi && ! rg -n 'createPending|generated_dashboard|raw_sql|natural_language' apps/web/lib/mcp apps/web/lib/analytics`

## Rollback Plan

- Remove analytics tool registration from `apps/web/lib/mcp/server.ts`.
- Leave shared dashboard analytics services in place if dashboard route tests remain stable; otherwise revert route adapters and service extraction together.
- Remove `apps/web/scripts/mcp-analytics-querying-self-test.mjs`, the package script, and the MCP analytics scenario fixtures if the tool surface is rolled back.
- No database migration rollback is required because this feature does not add durable schema changes.

## Out-Of-Scope Guardrails

- Do not add SDK custom-event APIs or modify `apps/events` ingestion validation in this feature.
- Do not create pending analytics tasks from `suggest_next_events`.
- Do not expose raw SQL, arbitrary warehouse queries, or a free-form natural-language MCP query endpoint.
- Do not build prompt-generated dashboards.
- Do not require the GitHub App for analytics querying.
- Do not change the primary active workstream in `../../plans/PLAN_STATUS.md` unless the human explicitly asks.
