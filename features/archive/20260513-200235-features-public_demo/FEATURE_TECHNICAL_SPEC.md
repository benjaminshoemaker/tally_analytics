# Public Demo Technical Specification

## Existing Code Analysis

### Similar Functionality Audit

SIMILAR FUNCTIONALITY FOUND
---------------------------

- `apps/web/app/(marketing)/page.tsx`: marketing landing page composition. This
  is the CTA integration point for "View demo dashboard".
- `apps/web/components/marketing/hero.tsx`: hero already owns the primary
  "Start with MCP" CTA and secondary "See how it works" CTA. It can accept an
  additional demo URL prop or render a second secondary link.
- `apps/web/components/marketing/product-proof.tsx`: product proof section
  already explains "Ask a question. If Tally can't answer it, your agent gets
  the task." This is the best marketing-adjacent placement for the demo CTA if
  the hero should stay focused.
- `apps/web/components/marketing/how-it-works.tsx`: current anchored proof flow
  and dashboard screenshot. This is another acceptable CTA placement.
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx`: authenticated
  Overview page pattern. It fetches via React Query and `/api/projects/...`;
  reuse layout/visual decisions, not the page component.
- `apps/web/app/(dashboard)/projects/[id]/live/page.tsx`: authenticated Live
  feed pattern. It uses `useLiveFeed` and `useProject`; reuse `LiveEvent` only
  if passed fixture events directly.
- `apps/web/app/(dashboard)/projects/[id]/sessions/page.tsx`: authenticated
  Sessions page pattern. It uses React Query; reuse `SessionsChart` and `StatCard`
  with fixture data.
- `apps/web/components/dashboard/stat-card.tsx`: pure presentational card that
  can be reused directly.
- `apps/web/components/dashboard/page-views-chart.tsx`: prop-driven chart that
  can be reused directly, with a text summary adjacent in the demo.
- `apps/web/components/dashboard/sessions-chart.tsx`: prop-driven chart that can
  be reused directly after adding a wrapper/text summary if needed.
- `apps/web/components/dashboard/top-list.tsx`: pure presentational list that
  can be reused directly.
- `apps/web/components/dashboard/live-event.tsx`: mostly presentational event
  component typed against `LiveFeedEvent`; either reuse by matching the fixture
  shape or extract a local event type if the hook type import is undesirable.
- `apps/web/components/dashboard/analytics-tasks/analytics-question-result.tsx`:
  presentational result component using existing result types. It can inspire
  styling and aria-live behavior, but do not reuse it directly because the demo
  needs `partial_answer`, `cannot_answer_yet`, and `unrecognized` result shapes
  with read-only task plus simulated MCP/agent output.
- `apps/web/components/dashboard/analytics-tasks/task-draft-card.tsx`: currently
  editable and action-oriented. Do not use it directly for the public demo unless
  actions are disabled or replaced by a demo-only read-only card.
- `apps/web/components/dashboard/analytics-tasks/pending-task-list.tsx`: shows
  task statuses but exposes archive/delete/reopen controls when callbacks are
  passed. For demo use, prefer a demo-specific agent task preview to avoid
  implying real queue mutation.
- `apps/web/e2e/scenarios/*.json`: existing scenario fixture pattern. Useful
  inspiration for structured fake data, but `/demo` should use static bundled
  fixture modules rather than seeded DB scenarios.

Recommendation: hybrid approach. Reuse pure dashboard visual components
directly, extract small presentational wrappers only where necessary, and create
new demo-specific shell/Ask Tally components so no authenticated hooks or APIs
enter the public route.

### Pattern Compliance

EXISTING PATTERNS
-----------------

- File organization: Next.js App Router routes live under `apps/web/app`.
  Marketing routes live under `apps/web/app/(marketing)`. Dashboard reusable UI
  lives under `apps/web/components/dashboard`; marketing UI lives under
  `apps/web/components/marketing`; client hooks live under `apps/web/lib/hooks`.
- Naming convention: route files use `page.tsx`; components use kebab-case
  filenames with default exports; tests use `*.test.ts` under `apps/web/tests`.
- Client/server boundary: pages that need state or browser interaction start
  with `'use client'`; server-rendered marketing pages remain server components
  unless interactivity is needed.
- Data fetching: authenticated dashboard pages use React Query hooks and
  `/api/projects/...` endpoints. `/demo` must not follow this data-fetching
  pattern.
- Styling: Tailwind classes are inline and use the existing warm/brand palette.
  Cards use small radii and restrained dashboard styling.
- Error handling: UI tests assert rendered copy and markup; API tests assert
  response shapes. For `/demo`, errors should be local validation states rather
  than network failures.
- Testing approach: Vitest server-render tests use `renderToStaticMarkup`;
  interactive component tests use Testing Library and `user-event`; browser
  verification uses Playwright through `pnpm --filter web e2e`.

### Integration Point Map

INTEGRATION POINTS
------------------

| File | Risk | Coverage | Notes |
|------|------|----------|-------|
| `apps/web/app/(marketing)/page.tsx` | Low | Covered by `marketing-landing-page.test.ts` | Add the demo CTA without removing existing setup/pricing CTAs. |
| `apps/web/components/marketing/hero.tsx` | Low | Covered via landing-page tests | If CTA is added here, prefer explicit `demoUrl` prop with default internal href. |
| `apps/web/components/marketing/product-proof.tsx` | Low | Covered via landing-page tests | Good section for proof-oriented CTA; update tests if copy changes. |
| `apps/web/app/(marketing)/demo/page.tsx` | Medium | New tests required | New public route. Should be a server page that renders a demo client component or a client page with static imports only. |
| `apps/web/components/demo/public-demo-dashboard.tsx` | Medium | New component tests required | New interactive shell for tabs/questions. Must not import auth/data hooks. |
| `apps/web/lib/demo/public-demo-data.ts` | Low | New unit tests required | Static fixture and mock-response source of truth. No DB/API access. |
| `apps/web/components/dashboard/stat-card.tsx` | Low | Existing indirect coverage | Pure presentational; safe to reuse. |
| `apps/web/components/dashboard/page-views-chart.tsx` | Medium | Existing page coverage | Recharts can be awkward in test/jsdom; route tests may assert copy and data summary instead of chart internals. |
| `apps/web/components/dashboard/sessions-chart.tsx` | Medium | Existing page coverage | Same Recharts caveat. Add adjacent text summaries for accessibility. |
| `apps/web/components/dashboard/top-list.tsx` | Low | Existing indirect coverage | Pure presentational; safe to reuse. |
| `apps/web/components/dashboard/live-event.tsx` | Low | Covered by `live-event.test.ts` | Reuse with matching fixture shape or extract shared type to avoid hook coupling. |
| `apps/web/components/dashboard/analytics-tasks/analytics-question-result.tsx` | Low | Covered by `dashboard-pending-tasks-components.test.ts` | Styling reference only; demo result contract differs from the authenticated union. |
| `apps/web/tests/marketing-landing-page.test.ts` | Low | Existing | Add assertions for `href="/demo"` and "View demo dashboard". |
| `apps/web/tests/public-demo-page.test.tsx` | Medium | New | Server/static render and interaction coverage for the route/shell. |
| `apps/web/e2e/dashboard.spec.ts` or new `apps/web/e2e/public-demo.spec.ts` | Medium | Existing Playwright harness | Add browser flow only if needed for viewport/no-overlap verification. |

High-risk integration points: none. The main risk is accidentally importing
authenticated dashboard data-fetching code into `/demo`.

## Codebase Maturity Assessment

This is an active brownfield Next.js app with substantial tests and clear local
patterns. The relevant areas are mature enough for safe extension, but there are
two technical debt considerations:

- Authenticated dashboard pages mix presentation with React Query fetching. The
  demo should not reuse page components directly; it should reuse or extract
  pure presentational components.
- Recharts components render SVG/canvas-like output that is not always useful in
  static tests. Demo tests should assert visible summaries and component wiring,
  then use browser verification for visual layout.

No data migration, API contract change, external provider integration, or new
dependency is needed.

## Architecture

### Recommended Shape

Use a static, fixture-backed public route:

```text
apps/web/app/(marketing)/demo/page.tsx
  -> imports PublicDemoDashboard from components/demo
  -> imports static fixture data from lib/demo

apps/web/components/demo/public-demo-dashboard.tsx
  -> client component for tab state and Ask Tally state
  -> receives all data as props
  -> renders Overview, Live, Sessions, Ask Tally views

apps/web/lib/demo/public-demo-data.ts
  -> Acme Forms fixture data
  -> scripted Ask Tally response definitions
  -> normalization/matching helper
```

Do not place demo data under `apps/web/e2e/scenarios`; those files are for DB
seed/harness flows. The public demo should be bundled static app data.

### Technical Decision Matrix: Data Source

| Criterion | Static TS fixture | Seeded DB project | API mock route |
|-----------|-------------------|-------------------|----------------|
| Fit with existing spec | Extends | Conflicts | New pattern |
| Implementation effort | Small | Large | Medium |
| Risk to public safety | Low | Medium | Medium |
| Test coverage impact | Minimal | Significant | Moderate |
| New dependencies | 0 | 0 | 0 |
| Rerun/debug simplicity | High | Medium | Medium |

Recommendation: static TypeScript fixture.

Confidence: high.

Rationale: The feature explicitly forbids public writes, auth bypasses, and
authenticated API access. Static fixtures satisfy the product goal with the
least operational surface.

### Technical Decision Matrix: Component Reuse

| Criterion | Reuse authenticated pages | Reuse pure visual components | Build all demo UI separately |
|-----------|---------------------------|------------------------------|------------------------------|
| Fit with no-auth boundary | Conflicts | Extends | Extends |
| Implementation effort | Medium | Medium | Medium |
| Risk to existing flows | High | Low | Low |
| Visual consistency | High | High | Medium |
| Maintainability | Low | High | Medium |

Recommendation: reuse pure visual components, not authenticated pages.

Confidence: high.

Rationale: Existing dashboard pages are coupled to React Query and authenticated
APIs. Reusing visual components gives the product feel without violating the
public route boundary.

## Files To Create

- `apps/web/app/(marketing)/demo/page.tsx`
  - Server component by default.
  - Imports fixture data and renders the demo shell.
  - Must not import `Providers`, `getUserFromSession`, dashboard layouts, or
    dashboard hooks.

- `apps/web/components/demo/public-demo-dashboard.tsx`
  - Client component.
  - Owns local React state for active tab, question input, and current mocked
    Ask Tally result.
  - Renders the light public dashboard frame.
  - Uses `button`-based tabs with `aria-selected`/`role="tab"` semantics.

- `apps/web/components/demo/demo-ask-tally-panel.tsx`
  - Client component or child of `public-demo-dashboard.tsx`.
  - Uses local scripted responses only.
  - Shows a read-only draft task and simulated MCP/agent preview.
  - Owns demo-specific result rendering instead of importing
    `AnalyticsQuestionResult`, because the demo result union includes
    `partial_answer`, `cannot_answer_yet`, and `unrecognized`.

- `apps/web/components/demo/demo-agent-task-preview.tsx`
  - Presentational component for the simulated agent/MCP output.
  - Must label output as simulated.
  - No action buttons that imply a real queue mutation.

- `apps/web/lib/demo/public-demo-data.ts`
  - Exports `publicDemoProject`, overview metrics, live events, sessions data,
    suggested questions, scripted responses, and `matchDemoQuestion(question)`.
  - All data should be deterministic.

- `apps/web/tests/public-demo-page.test.tsx`
  - Server/static rendering tests plus interactive jsdom tests for tabs and Ask
    Tally behavior.

Optional if extraction is needed:

- `apps/web/components/dashboard/dashboard-tabs.tsx`
  - Only if a shared prop-driven tab presentation is useful.
- `apps/web/components/dashboard/chart-summary.tsx`
  - Only if chart text alternatives are repeated.

## Files To Modify

- `apps/web/app/(marketing)/page.tsx`
  - Add the demo CTA path into the landing page composition if the CTA lives at
    page level.

- `apps/web/components/marketing/hero.tsx`
  - Add `demoUrl?: string` if the CTA lives in the hero.
  - Preserve `docsUrl` behavior and external URL handling.

- `apps/web/components/marketing/product-proof.tsx`
  - Alternative or additional location for "View demo dashboard".

- `apps/web/tests/marketing-landing-page.test.ts`
  - Assert the landing page renders "View demo dashboard" and `href="/demo"`.

Do not modify database schema, Tinybird files, auth routes, MCP routes, or SDK
package code for this feature.

## Data Contracts

Use exported TypeScript types in `apps/web/lib/demo/public-demo-data.ts`:

```ts
export type DemoOverview = {
  pageViews: {
    total: number;
    change: number;
    timeSeries: Array<{ date: string; count: number }>;
  };
  sessions: {
    total: number;
    change: number;
  };
  topPages: Array<{ path: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; count: number; percentage: number }>;
};

export type DemoLiveEvent = {
  id: string;
  eventType: string;
  path: string;
  referrer: string | null;
  timestamp: string;
  relativeTime: string;
  environment: "production";
};

export type DemoSessions = {
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{
    date: string;
    newSessions: number;
    returningSessions: number;
  }>;
};

export type DemoQuestionResult =
  | {
      kind: "answered";
      summary: string;
      metrics: Array<{ label: string; value: string | number }>;
    }
  | {
      kind: "partial_answer";
      summary: string;
      limitation: string;
      draftTask: DemoDraftTask;
      simulatedAgentOutput: DemoAgentOutput;
    }
  | {
      kind: "cannot_answer_yet";
      summary: string;
      limitation: string;
      draftTask: DemoDraftTask;
      simulatedAgentOutput: DemoAgentOutput;
    }
  | {
      kind: "unrecognized";
      summary: string;
      suggestedQuestions: string[];
    };
```

Question normalization:

- Convert to lowercase.
- Trim leading/trailing whitespace.
- Collapse repeated internal whitespace.
- Remove trailing `?`, `.`, or `!`.
- Match normalized strings exactly against the four suggested questions.

No JSON serialization boundary is required because data is local module data
passed through React props.

## API And Storage Changes

No API changes.

No database changes.

No Tinybird changes.

No MCP changes.

No new environment variables.

`/demo` must not call:

- `/api/projects/*`
- `/api/mcp`
- `/api/oauth/*`
- `/api/auth/*`
- `/api/stripe/*`
- Tinybird-backed analytics endpoints
- third-party AI services

## UI Implementation Details

### Route

`apps/web/app/(marketing)/demo/page.tsx` should render inside the existing
marketing layout. Because `apps/web/app/(marketing)/layout.tsx` checks cookies
to show logged-in nav state, the route may inherit dynamic rendering, but the
demo page itself must not depend on auth.

The route should include metadata if the local pattern supports route metadata.

### Demo Shell

The shell should:

- Use a constrained dashboard width consistent with `max-w-6xl`/`max-w-[1200px]`.
- Render the demo-data banner near the top.
- Render Overview as the default active view.
- Render a short product value summary near the top that explains: "See what
  Tally looks like after your agent installs analytics."
- Include a visible Ask Tally entry point or suggested question in the initial
  desktop viewport.
- Keep the "Start with MCP" CTA linked to `/docs/setup`.

### Reused Components

Safe direct reuse:

- `StatCard`
- `PageViewsChart`
- `SessionsChart`
- `TopList`
- `LiveEvent` if fixture shape matches
- Use `AnalyticsQuestionResult` only as a visual/aria-live reference. Do not
  import it into the demo shell unless the demo result contract is changed to
  exactly match the authenticated analytics question union and still renders the
  simulated agent preview.

Avoid direct reuse:

- `DashboardLayout`
- `ProjectLayout`
- `ProjectDashboardSummary`
- `AskTallyPanel`
- `PendingTaskList` with mutation affordances
- Any `useProject`, `useLiveFeed`, `useAnalyticsQuestion`, or
  `useAnalyticsTasks` hook

### Accessibility

- Tabs should use `role="tablist"`, `role="tab"`, `aria-selected`, and
  associated panels or equivalent accessible button navigation.
- Question result region should use `aria-live="polite"`.
- Empty-question validation should be visible and screen-reader reachable.
- Charts should have adjacent text summaries that state the total and trend.
- The simulated MCP/agent output should be text content, not image-only output.

## Testing Strategy

### Unit And Component Tests

Add `apps/web/tests/public-demo-page.test.tsx`:

- Renders `/demo` page static markup and asserts:
  - "This is demo data. Connect your repo for real analytics."
  - "Acme Forms"
  - "Start with MCP"
  - `href="/docs/setup"`
  - Overview metrics and Ask Tally entry copy.
  - Product value summary appears in the initial route markup.
- Renders `PublicDemoDashboard` in jsdom and asserts:
  - Default view is Overview.
  - Switching to Live shows fixture event names and paths.
  - Switching to Sessions shows total/new/returning sessions.
  - Switching to Ask Tally shows suggested questions.
  - Empty question cannot submit or shows validation.
  - Unrecognized question returns the generic deterministic response and sample
    question suggestions.
  - Each suggested question maps to the expected deterministic response kind.
  - "What should we track next?" shows draft task plus simulated MCP/agent
    output label.
- Spies on `globalThis.fetch` for interactive tests and asserts it is not
  called by `/demo` interactions.

Update `apps/web/tests/marketing-landing-page.test.ts`:

- Assert "View demo dashboard" appears.
- Assert `href="/demo"` appears.

Optional focused data test:

- `apps/web/tests/public-demo-data.test.ts` for `matchDemoQuestion` normalization.

### Browser Verification

Use the existing Playwright harness after implementation:

```bash
pnpm --filter web e2e --grep @public-demo
```

If adding a new tag is not worth it, use the repo's current Playwright test
command against a new public demo spec. Browser coverage should verify:

- `/demo` loads without login.
- No primary text overlap on desktop and mobile.
- At a desktop viewport, the initial viewport shows the demo-data banner,
  product value summary, Overview metrics, and Ask Tally entry/suggested
  question before scrolling.
- Tabs can be clicked.
- Ask Tally mocked response appears.
- Setup CTA navigates or points to `/docs/setup`.

### Regression Commands

Minimum implementation verification:

```bash
pnpm --filter web test -- public-demo marketing-landing-page
pnpm --filter web typecheck
pnpm --filter web build
```

If dashboard components are extracted or changed:

```bash
pnpm --filter web test -- overview-page sessions-page live-feed-page dashboard-pending-tasks-components
```

If browser flow is implemented:

```bash
pnpm --filter web e2e --grep @public-demo
```

## Regression Risk Assessment

- **Authenticated dashboard behavior changes:** Avoid by not importing
  authenticated pages into `/demo`; if extracting presentational components,
  preserve existing tests.
- **Marketing CTA regressions:** Update existing landing page tests and preserve
  "Start with MCP", pricing, docs, and logged-in Dashboard behavior.
- **Accidental API calls:** Add a test-level `fetch` spy that fails on any demo
  interaction fetch.
- **Chart rendering flakiness:** Assert adjacent summaries in tests; use browser
  verification for visual checks.
- **Overpromising MCP behavior:** Keep simulated output labeled and avoid real
  queue/action controls.

## Implementation Sequence

1. Add static demo data and question matcher in `apps/web/lib/demo/public-demo-data.ts`.
   - This creates the contract before UI work and can be unit tested.

2. Build demo-only presentational components under `apps/web/components/demo/`.
   - Start with Overview, Live, Sessions, and Ask Tally panels using fixture
     props.
   - Reuse pure dashboard components where possible.

3. Add `apps/web/app/(marketing)/demo/page.tsx`.
   - Wire fixture data into the demo shell.
   - Confirm no auth/data hooks are imported.

4. Add landing-page CTA.
   - Prefer adding "View demo dashboard" near the product proof / how-it-works
     path; if placed in hero, use a `demoUrl` prop and update tests.

5. Add/expand tests.
   - Data matcher tests first, then component/route render tests, then landing
     page tests.

6. Run verification commands and browser check.

## Migration And Rollback

Migration risk checklist:

- [x] Data migration required? No.
- [x] Breaking API changes? No.
- [x] Dependent services affected? No.
- [x] Feature flags needed? No for MVP; route can be removed or unlinked if
  needed.
- [x] Rollback plan: remove `/demo` route and landing CTA, leaving no persisted
  state behind.

## Human Decision Points

No blocking human technical decisions remain. Product choices already selected:

- CTA copy: "View demo dashboard".
- Demo app: "Acme Forms".
- Ask Tally depth: product-level deterministic responses.
- Frame: light public frame with real dashboard components where safe.
