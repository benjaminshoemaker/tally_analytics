# Execution Plan: Public Demo

## Overview

| Metric | Value |
|--------|-------|
| Feature | Public demo |
| Target Project | Tally Analytics web app |
| Total Phases | 3 |
| Total Steps | 7 |
| Total Tasks | 7 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/web/app/(marketing)/page.tsx` | modifies | Add the public demo CTA without removing existing setup/pricing CTAs. |
| `apps/web/components/marketing/hero.tsx` or product-proof section | modifies | Place or expose "View demo dashboard" as the public entry point. |
| `apps/web/app/(marketing)/demo/page.tsx` | creates | Public no-login demo route rendered from static fixture data. |
| `apps/web/components/dashboard/stat-card.tsx` | uses | Pure presentational metric card. |
| `apps/web/components/dashboard/page-views-chart.tsx` | uses | Prop-driven page-view chart with adjacent text summary. |
| `apps/web/components/dashboard/sessions-chart.tsx` | uses | Prop-driven sessions chart with adjacent text summary. |
| `apps/web/components/dashboard/top-list.tsx` | uses | Pure presentational top pages/referrers list. |
| `apps/web/components/dashboard/live-event.tsx` | uses | Presentational live event card if fixture shape matches. |
| `apps/web/lib/demo/public-demo-data.ts` | creates | Static Acme Forms fixture data and deterministic Ask Tally matcher. |
| `apps/web/e2e/public-demo.spec.ts` | creates | Browser flow verification for the public demo. |

## Phase Dependency Graph

```text
Phase 1: Demo Data + Presentational Shell
  -> Phase 2: Public Route + Landing Entry
    -> Phase 3: Browser Flow + Regression Closeout
```

---

## Phase 1: Demo Data + Presentational Shell

**Goal:** Create static demo data, deterministic Ask Tally matching, and demo-only UI components without touching authenticated dashboard behavior.
**Depends On:** None

### Pre-Phase Setup

- [ ] Confirm feature context files are present.
  - Verify: `test -f features/public_demo/FEATURE_SPEC.md && test -f features/public_demo/FEATURE_TECHNICAL_SPEC.md && test -f features/public_demo/FLOW_VERIFICATION_PLAN.md`
- [ ] Confirm web test tooling is available.
  - Verify: `pnpm --filter web test -- --help >/dev/null`

### Step 1.1: Static Data Contract

**Depends On:** None

---

#### Task 1.1.A: Add Public Demo Fixture Data

**Description:**
Create the static Acme Forms data module that powers the public demo. This task establishes the typed contract for overview metrics, live events, sessions, suggested questions, deterministic question matching, read-only draft tasks, and simulated agent output.

**Requirement:** Public `/demo` uses fixture-backed fake data, deterministic Ask Tally responses, no API/storage changes.

**Acceptance Criteria:**
- [ ] (CODE) `apps/web/lib/demo/public-demo-data.ts` exists and exports `publicDemoProject`, `publicDemoOverview`, `publicDemoLiveEvents`, `publicDemoSessions`, `publicDemoQuestions`, and `matchDemoQuestion`.
  - Verify: `test -f apps/web/lib/demo/public-demo-data.ts && rg "export const publicDemoProject|export const publicDemoOverview|export const publicDemoLiveEvents|export const publicDemoSessions|export const publicDemoQuestions|export function matchDemoQuestion" apps/web/lib/demo/public-demo-data.ts`
- [ ] (CODE) Fixture data uses the Acme Forms identity and includes `/`, `/pricing`, `/templates`, `/signup`, `/docs`, Google, GitHub, Product Hunt, Hacker News, and direct referrer examples.
  - Verify: `rg "Acme Forms|/pricing|/templates|/signup|/docs|Google|GitHub|Product Hunt|Hacker News|direct" apps/web/lib/demo/public-demo-data.ts`
- [ ] (TEST) Question normalization handles case, whitespace, and terminal punctuation for suggested questions.
  - Verify: `pnpm --filter web test -- public-demo-data`
- [ ] (TEST) `matchDemoQuestion("What should we track next?")` returns a missing-tracking result containing `form_published` and simulated agent output.
  - Verify: `pnpm --filter web test -- public-demo-data`
- [ ] (TEST) Unrecognized questions return the generic deterministic response with sample question suggestions.
  - Verify: `pnpm --filter web test -- public-demo-data`

**Files to Create:**
- `apps/web/lib/demo/public-demo-data.ts` — typed fixture data and question matcher.
- `apps/web/tests/public-demo-data.test.ts` — focused unit tests for deterministic matching.

**Files to Modify:**
- None.

**Existing Code to Reference:**
- `apps/web/lib/analytics/tasks/types.ts` — result-shape inspiration only.
- `apps/web/e2e/scenarios/*.json` — structured fixture inspiration only.

**Dependencies:**
- None.

**Spec Reference:** `FEATURE_SPEC.md` Ask Tally Behavior; `FEATURE_TECHNICAL_SPEC.md` Data Contracts.

**Browser Verification:**
- Criteria IDs: None.
- Notes: Data-only task.

---

### Step 1.2: Demo Components

**Depends On:** Step 1.1

---

#### Task 1.2.A: Build Demo Dashboard Shell

**Description:**
Create the public demo shell and tabbed dashboard experience using local React state only. The shell should render the demo-data banner, product value summary, Overview, Live, Sessions, and Ask Tally tabs while reusing pure visual dashboard components where safe.

**Requirement:** Light public frame, dashboard-like navigation, no authenticated layouts/hooks/API clients, initial viewport summary.

**Acceptance Criteria:**
- [ ] (CODE) `apps/web/components/demo/public-demo-dashboard.tsx` exists and does not import `useProject`, `useLiveFeed`, `useAnalyticsQuestion`, `useAnalyticsTasks`, `Providers`, `DashboardLayout`, `ProjectLayout`, or `getUserFromSession`.
  - Verify: `test -f apps/web/components/demo/public-demo-dashboard.tsx && test -z "$(rg "useProject|useLiveFeed|useAnalyticsQuestion|useAnalyticsTasks|Providers|DashboardLayout|ProjectLayout|getUserFromSession" apps/web/components/demo/public-demo-dashboard.tsx || true)"`
- [ ] (CODE) Demo tabs expose `role="tablist"`, `role="tab"`, and `aria-selected`.
  - Verify: `rg "role=\"tablist\"|role=\"tab\"|aria-selected" apps/web/components/demo/public-demo-dashboard.tsx`
- [ ] (TEST) Default render shows the exact demo-data banner copy, "This is demo data. Connect your repo for real analytics.", product value summary, Acme Forms overview metrics, and an Ask Tally entry point.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) Switching to Live and Sessions shows fixture events and total/new/returning session metrics.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) Interactive demo tab switching does not call `fetch`.
  - Verify: `pnpm --filter web test -- public-demo-page`

**Files to Create:**
- `apps/web/components/demo/public-demo-dashboard.tsx` — public demo shell and tabs.

**Files to Modify:**
- None unless a pure shared presentational wrapper is extracted.

**Existing Code to Reference:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx` — visual layout patterns.
- `apps/web/components/dashboard/stat-card.tsx` — metric card.
- `apps/web/components/dashboard/page-views-chart.tsx` — chart component.
- `apps/web/components/dashboard/sessions-chart.tsx` — chart component.
- `apps/web/components/dashboard/top-list.tsx` — ranked lists.
- `apps/web/components/dashboard/live-event.tsx` — live event card.

**Dependencies:**
- Task 1.1.A.

**Spec Reference:** `FEATURE_SPEC.md` Demo Frame and Dashboard Views; `FEATURE_TECHNICAL_SPEC.md` UI Implementation Details.

**Browser Verification:**
- Criteria IDs: BROWSER:DOM coverage handled in Phase 3.
- Notes: Component behavior is covered by Vitest in this phase.

---

#### Task 1.2.B: Build Demo Ask Tally And Agent Preview

**Description:**
Create demo-specific Ask Tally UI that uses the static matcher and renders answer, partial answer, cannot-answer-yet, and unrecognized states. The task preview must be read-only and the simulated MCP/agent output must be explicitly labeled as simulated.

**Requirement:** Deterministic local Ask Tally behavior, product-level tasks only, simulated MCP/agent preview, no real queue mutation.

**Acceptance Criteria:**
- [ ] (CODE) Demo Ask Tally components exist and do not import `AnalyticsQuestionResult`, `AskTallyPanel`, `TaskDraftCard`, `PendingTaskList`, `useAnalyticsQuestion`, or `useAnalyticsTasks`.
  - Verify: `test -f apps/web/components/demo/demo-ask-tally-panel.tsx && test -f apps/web/components/demo/demo-agent-task-preview.tsx && test -z "$(rg "AnalyticsQuestionResult|AskTallyPanel|TaskDraftCard|PendingTaskList|useAnalyticsQuestion|useAnalyticsTasks" apps/web/components/demo || true)"`
- [ ] (CODE) The simulated agent preview contains visible copy labeling the output as simulated.
  - Verify: `rg "simulated|Simulated" apps/web/components/demo/demo-agent-task-preview.tsx`
- [ ] (CODE) Ask Tally result output uses `aria-live="polite"` for screen-reader announcements.
  - Verify: `rg "aria-live=\"polite\"" apps/web/components/demo/demo-ask-tally-panel.tsx`
- [ ] (TEST) Empty Ask Tally input cannot submit or shows validation.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) Empty Ask Tally validation is screen-reader reachable through visible text, an accessible description, or an alert/status region.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) Each suggested question returns its expected deterministic response kind.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) "What should we track next?" renders `form_published`, draft task copy, and simulated MCP/agent output.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) An unrecognized question renders the generic deterministic response and suggested questions.
  - Verify: `pnpm --filter web test -- public-demo-page`

**Files to Create:**
- `apps/web/components/demo/demo-ask-tally-panel.tsx` — demo-specific question UI.
- `apps/web/components/demo/demo-agent-task-preview.tsx` — simulated agent/MCP output.

**Files to Modify:**
- `apps/web/components/demo/public-demo-dashboard.tsx` — wire Ask Tally panel into shell.
- `apps/web/tests/public-demo-page.test.tsx` — interactive Ask Tally tests.

**Existing Code to Reference:**
- `apps/web/components/dashboard/analytics-tasks/analytics-question-result.tsx` — aria-live and result-card styling reference only.
- `apps/web/components/dashboard/analytics-tasks/pending-task-list.tsx` — status language reference only.

**Dependencies:**
- Task 1.1.A and Task 1.2.A.

**Spec Reference:** `FEATURE_SPEC.md` Ask Tally Behavior; `FEATURE_TECHNICAL_SPEC.md` Reused Components.

**Browser Verification:**
- Criteria IDs: BROWSER:DOM coverage handled in Phase 3.
- Notes: Component behavior is covered by Vitest in this phase.

---

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] Public demo data/component tests pass.
  - Verify: `pnpm --filter web test -- public-demo`
- [ ] Type checking passes.
  - Verify: `pnpm --filter web typecheck`

**Regression Verification:**
- [ ] Existing dashboard component regression tests pass for reused components.
  - Verify: `pnpm --filter web test -- overview-page sessions-page live-feed-page dashboard-pending-tasks-components live-event`

**Browser Verification:**
- Not required until the route and landing entry exist in Phase 2.

---

## Phase 2: Public Route + Landing Entry

**Goal:** Expose the demo at `/demo`, link it from the landing page, and verify the public route does not use authenticated APIs or mutate state outside local React state.
**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] Confirm Phase 1 test surface is green.
  - Verify: `pnpm --filter web test -- public-demo`
- [ ] Confirm marketing tests are runnable before route integration.
  - Verify: `pnpm --filter web test -- marketing-landing-page`

### Step 2.1: Public Route

**Depends On:** Phase 1

---

#### Task 2.1.A: Add Public `/demo` Route

**Description:**
Add the marketing route that renders the demo shell from static fixture data. The route must inherit the public marketing layout without depending on login state, dashboard providers, API routes, or third-party services.

**Requirement:** Public `/demo`, no login, static bundled data sources, setup CTA to `/docs/setup`.

**Acceptance Criteria:**
- [ ] (CODE) `apps/web/app/(marketing)/demo/page.tsx` exists and imports fixture data plus `PublicDemoDashboard`.
  - Verify: `test -f 'apps/web/app/(marketing)/demo/page.tsx' && rg "publicDemo|PublicDemoDashboard" 'apps/web/app/(marketing)/demo/page.tsx'`
- [ ] (CODE) The `/demo` route file does not import dashboard providers, auth/session helpers, API clients, MCP modules, Tinybird modules, or Stripe modules.
  - Verify: `test -z "$(rg "Providers|getUserFromSession|getUserFromRequest|useProject|useLiveFeed|useAnalytics|api/mcp|tinybird|stripe|db/" 'apps/web/app/(marketing)/demo/page.tsx' || true)"`
- [ ] (TEST) Static route render includes the exact demo-data banner copy, "This is demo data. Connect your repo for real analytics.", Acme Forms, "Start with MCP", `href="/docs/setup"`, Overview metrics, and Ask Tally entry copy.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) Static route render does not show account controls, billing/settings controls, or user dropdown controls.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TEST) Route/component interactions do not call `fetch`.
  - Verify: `pnpm --filter web test -- public-demo-page`
- [ ] (TYPE) Type checking passes after route creation.
  - Verify: `pnpm --filter web typecheck`

**Files to Create:**
- `apps/web/app/(marketing)/demo/page.tsx` — public route.

**Files to Modify:**
- `apps/web/tests/public-demo-page.test.tsx` — route render coverage.

**Existing Code to Reference:**
- `apps/web/app/(marketing)/page.tsx` — server marketing route composition.
- `apps/web/app/(marketing)/layout.tsx` — inherited public layout.

**Dependencies:**
- Phase 1.

**Spec Reference:** `FEATURE_SPEC.md` Entry and API Boundary; `FEATURE_TECHNICAL_SPEC.md` Route.

**Browser Verification:**
- Criteria IDs: BROWSER:DOM coverage handled in Phase 3.
- Notes: Route is first verified through static render tests.

---

### Step 2.2: Landing CTA

**Depends On:** Task 2.1.A

---

#### Task 2.2.A: Link Landing Page To Demo

**Description:**
Add "View demo dashboard" to the public marketing surface near the product proof / how-it-works path while preserving existing setup, pricing, docs, login, and logged-in Dashboard behavior.

**Requirement:** Landing-page CTA with `href="/demo"` and existing CTAs preserved.

**Acceptance Criteria:**
- [ ] (CODE) Marketing page or marketing component renders "View demo dashboard" with `href="/demo"`.
  - Verify: `rg "View demo dashboard|href=\"/demo\"" apps/web/app/'(marketing)' apps/web/components/marketing`
- [ ] (TEST) `marketing-landing-page.test.ts` asserts "View demo dashboard" and `href="/demo"`.
  - Verify: `rg "View demo dashboard|href=\\\"/demo\\\"" apps/web/tests/marketing-landing-page.test.ts`
- [ ] (TEST) Existing landing-page tests still assert "Start with MCP", pricing/docs copy, logged-out login behavior, and logged-in Dashboard behavior.
  - Verify: `pnpm --filter web test -- marketing-landing-page`
- [ ] (TEST) Public demo route tests still pass after CTA integration.
  - Verify: `pnpm --filter web test -- public-demo-page`

**Files to Create:**
- None.

**Files to Modify:**
- `apps/web/app/(marketing)/page.tsx` — if CTA is page-level.
- `apps/web/components/marketing/hero.tsx` — if CTA is hero-level.
- `apps/web/components/marketing/product-proof.tsx` — if CTA is proof-section-level.
- `apps/web/tests/marketing-landing-page.test.ts` — CTA regression coverage.

**Existing Code to Reference:**
- `apps/web/components/marketing/hero.tsx` — CTA styling and external URL handling.
- `apps/web/components/marketing/product-proof.tsx` — product proof placement.

**Dependencies:**
- Task 2.1.A.

**Spec Reference:** `FEATURE_SPEC.md` Entry; `FEATURE_TECHNICAL_SPEC.md` Files To Modify.

**Browser Verification:**
- Criteria IDs: BROWSER:DOM coverage handled in Phase 3.
- Notes: This task covers unit/static route tests.

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] Public demo and marketing tests pass.
  - Verify: `pnpm --filter web test -- public-demo marketing-landing-page`
- [ ] Type checking passes.
  - Verify: `pnpm --filter web typecheck`
- [ ] Build passes.
  - Verify: `pnpm --filter web build`

**Regression Verification:**
- [ ] Existing dashboard and marketing regression tests pass for touched surfaces.
  - Verify: `pnpm --filter web test -- overview-page sessions-page live-feed-page dashboard-pending-tasks-components marketing-landing-page`

**Browser Verification:**
- Deferred to Phase 3 flow verification.

---

## Phase 3: Browser Flow + Regression Closeout

**Goal:** Add the agent-runnable browser flow verification from `FLOW_VERIFICATION_PLAN.md`, verify desktop/mobile UI behavior and forbidden-network assertions, then close the feature with full relevant regression checks.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] Confirm Playwright harness can start.
  - Verify: `pnpm --filter web e2e --help >/dev/null`
- [ ] Confirm public demo route tests pass before browser automation.
  - Verify: `pnpm --filter web test -- public-demo-page`

### Step 3.1: Flow Harness

**Depends On:** Phase 2

---

#### Task 3.1.A: Add Public Demo Browser Flow Test

**Description:**
Implement the browser verification plan for the public demo. The Playwright spec should navigate from the landing page to `/demo`, exercise Overview, Live, Sessions, and Ask Tally, assert no login is required, and capture forbidden network requests.

**Requirement:** Agent-runnable flow verification for the public no-login demo.

**Acceptance Criteria:**
- [ ] (CODE) `apps/web/e2e/public-demo.spec.ts` exists and includes `@public-demo`.
  - Verify: `test -f apps/web/e2e/public-demo.spec.ts && rg "@public-demo" apps/web/e2e/public-demo.spec.ts`
- [ ] (BROWSER:DOM) Browser flow opens the homepage, clicks "View demo dashboard", reaches `/demo`, and sees the demo-data banner and Acme Forms.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:DOM) Browser flow reaches Overview, Live, Sessions, and Ask Tally views and sees expected fixture text in each.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:DOM) Browser flow submits "What should we track next?" and sees `form_published` plus simulated MCP/agent output.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:DOM) Browser flow confirms no account controls, billing/settings controls, or user dropdown controls are visible in the demo.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:NETWORK) Browser flow records requests with `page.on("request", ...)` and asserts no request path starts with `/api/projects`, `/api/mcp`, `/api/oauth`, `/api/auth`, `/api/stripe`, or a Tinybird-backed analytics endpoint during demo interactions.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:CONSOLE) Browser flow fails on console errors during the core demo flow.
  - Verify: `pnpm --filter web e2e --grep @public-demo`

**Files to Create:**
- `apps/web/e2e/public-demo.spec.ts` — Playwright public demo flow.

**Files to Modify:**
- None unless Playwright helpers need a small reusable utility.

**Existing Code to Reference:**
- `apps/web/e2e/dashboard.spec.ts` — existing browser test style.
- `apps/web/playwright.config.ts` — local harness behavior.
- `features/public_demo/FLOW_VERIFICATION_PLAN.md` — required flow assertions.

**Dependencies:**
- Phase 2.

**Spec Reference:** `FLOW_VERIFICATION_PLAN.md` Driver, Assertions, Evidence.

**Browser Verification:**
- Criteria IDs: all BROWSER criteria in this task.
- Notes: This task is the dedicated flow harness.

---

#### Task 3.1.B: Add Desktop/Mobile Visual Assertions And Evidence

**Description:**
Extend the public demo browser flow with viewport-specific checks for the initial desktop viewport and mobile layout. The checks should verify primary text is not overlapped or clipped using DOM bounding boxes and screenshot artifacts for debugging.

**Requirement:** Browser verification at desktop and mobile widths with no overlapping or clipped primary UI text.

**Acceptance Criteria:**
- [ ] (BROWSER:DOM) At a desktop viewport, the initial `/demo` viewport shows the demo-data banner, product value summary, Overview metrics, and Ask Tally entry or suggested question before scrolling.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:DOM) At a mobile viewport, primary demo banner, navigation, metric, and Ask Tally/task text is visible after normal page interactions.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:VISUAL) Browser test asserts primary text bounding boxes do not overlap or clip outside the viewport for the checked desktop and mobile states.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (BROWSER:VISUAL) Screenshots are captured for initial `/demo` overview, Ask Tally response, and mobile `/demo` viewport.
  - Verify: `pnpm --filter web e2e --grep @public-demo`

**Files to Create:**
- None.

**Files to Modify:**
- `apps/web/e2e/public-demo.spec.ts` — viewport/evidence assertions.

**Existing Code to Reference:**
- `features/public_demo/FLOW_VERIFICATION_PLAN.md` — evidence requirements.
- `apps/web/e2e/dashboard.spec.ts` — current Playwright conventions.

**Dependencies:**
- Task 3.1.A.

**Spec Reference:** `FEATURE_SPEC.md` Acceptance Criteria; `FLOW_VERIFICATION_PLAN.md` Evidence.

**Browser Verification:**
- Criteria IDs: all BROWSER criteria in this task.
- Notes: Keep assertions objective through DOM visibility and bounding-box checks.

---

### Step 3.2: Final Regression Closeout

**Depends On:** Step 3.1

---

#### Task 3.2.A: Run Final Verification And Update Plan State

**Description:**
Run the focused and broad verification commands for the completed public demo feature, then update the execution plan checkboxes to reflect verified work. This task does not add product behavior; it closes the feature with evidence.

**Requirement:** Verified implementation with route tests, regression tests, browser flow, typecheck, and build.

**Acceptance Criteria:**
- [ ] (TEST) Focused public demo and landing tests pass.
  - Verify: `pnpm --filter web test -- public-demo marketing-landing-page`
- [ ] (TEST) Reused dashboard component regression tests pass.
  - Verify: `pnpm --filter web test -- overview-page sessions-page live-feed-page dashboard-pending-tasks-components live-event`
- [ ] (BROWSER:DOM) Public demo browser flow passes.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] (TYPE) Web typecheck passes.
  - Verify: `pnpm --filter web typecheck`
- [ ] (BUILD) Web build passes.
  - Verify: `pnpm --filter web build`
- [ ] (CODE) `features/public_demo/EXECUTION_PLAN.md` has completed checkboxes for implemented and verified tasks.
  - Verify: `test -z "$(rg "\\[ \\]" features/public_demo/EXECUTION_PLAN.md || true)"`

**Files to Create:**
- None.

**Files to Modify:**
- `features/public_demo/EXECUTION_PLAN.md` — checkbox updates only.

**Existing Code to Reference:**
- `AGENTS.md` — completion report and commit expectations.

**Dependencies:**
- Step 3.1.

**Spec Reference:** `FEATURE_TECHNICAL_SPEC.md` Testing Strategy and Regression Risk Assessment.

**Browser Verification:**
- Criteria IDs: public demo browser flow.
- Notes: Use artifacts from Playwright failures for debugging if needed.

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] Focused web tests pass.
  - Verify: `pnpm --filter web test -- public-demo marketing-landing-page`
- [ ] Dashboard regression tests pass.
  - Verify: `pnpm --filter web test -- overview-page sessions-page live-feed-page dashboard-pending-tasks-components live-event`
- [ ] Type checking passes.
  - Verify: `pnpm --filter web typecheck`
- [ ] Build passes.
  - Verify: `pnpm --filter web build`

**Regression Verification:**
- [ ] Public demo browser flow passes with network and console assertions.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
- [ ] No database, Tinybird, MCP, auth, Stripe, or SDK files were modified for this feature.
  - Verify: `test -z "$(git diff --name-only | rg "drizzle|tinybird|api/(mcp|oauth|auth|stripe)|packages/sdk" || true)"`

**Browser Verification:**
- [ ] Public demo flow checks desktop and mobile UI states.
  - Verify: `pnpm --filter web e2e --grep @public-demo`
