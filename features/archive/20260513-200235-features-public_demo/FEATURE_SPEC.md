# Public Demo Feature Specification

## Summary

Add a public `/demo` route that lets prospective users experience the Tally
Analytics dashboard before signup, MCP setup, or SDK installation.

The demo should be a native product experience, not a screenshot gallery or an
embedded BI tool. It should use believable fixture data for a fictional SaaS app
called "Acme Forms", reuse real dashboard presentation components where
practical, and simulate Ask Tally plus MCP/agent task behavior with deterministic
local responses.

The goal is 60-second comprehension: a visitor should understand what the
dashboard looks like, what Tally can answer from existing analytics, and how
missing tracking turns into an agent task.

## Problem

Prospective users currently have to understand Tally from marketing copy,
screenshots, docs, or by starting the MCP setup flow. That creates friction
before they can see the core product value.

The demo solves this by giving visitors a safe, no-login way to click through a
realistic dashboard and try a mocked version of the Ask Tally workflow.

## Users

Primary users:

- Developers evaluating whether Tally is worth installing in an AI-built app.
- Prospective customers who clicked "See how it works" or equivalent marketing
  copy and want to inspect the product.

Secondary users:

- The Tally team, who can use the route during sales, product review, and UI
  iteration.
- Agents working in the repo, who can use the route as a stable visual target
  for public dashboard expectations.

## Goals

- Make the product tangible before signup.
- Show a dashboard that feels consistent with the authenticated dashboard.
- Demonstrate Overview, Live, Sessions, and Ask Tally concepts with fake data.
- Show that Ask Tally can answer from existing data and draft tasks when data is
  missing.
- Keep the experience account-free and safe for public traffic.
- Provide clear next steps to start with MCP setup.

## Non-Goals

- Anonymous real projects.
- Anonymous production database writes.
- Public MCP tokens or unauthenticated MCP access.
- GitHub App installation inside the demo.
- LLM-backed demo answers.
- Full fake implementation patches.
- Long-lived per-visitor state.
- Replacing the authenticated dashboard.

## User Experience

### Entry

1. Visitor lands on the marketing homepage.
2. Visitor clicks a CTA labeled "View demo dashboard".
3. Visitor lands on `/demo`.

The landing-page CTA should be placed near the current product proof / "See how
it works" path so it is available when a visitor wants proof rather than setup
instructions.

### Demo Frame

The route should use a light public frame with real dashboard presentation
components where practical.

The frame should include:

- Tally branding.
- A clear demo-data banner: "This is demo data. Connect your repo for real
  analytics."
- A "Start with MCP" CTA that links to `/docs/setup`.
- Demo navigation for Overview, Live, Sessions, and Ask Tally.

The demo should not show account controls, billing controls, user dropdowns, or
authenticated-only project management affordances.

### Fixture Identity

The demo project should represent a fictional SaaS app named "Acme Forms".

The fake data should be specific enough to feel real:

- Pages such as `/`, `/pricing`, `/templates`, `/signup`, and `/docs`.
- Referrers such as Google, GitHub, Product Hunt, Hacker News, and direct.
- Events such as page views, signups, template views, pricing CTA clicks, and
  form starts.
- A recent live feed with plausible timestamps and browser/referrer details.

### Dashboard Views

The demo should provide at least four click-through surfaces:

1. Overview
   - Page views.
   - Sessions.
   - Top page.
   - Top referrer.
   - Time-series chart.
   - Top pages and referrers lists.

2. Live
   - Recent event stream.
   - Event names, paths, referrers, environment, and relative time.

3. Sessions
   - Total sessions.
   - New visitors.
   - Returning visitors.
   - Time-series chart showing new vs returning sessions.

4. Ask Tally
   - Question input.
   - Suggested questions.
   - Deterministic mocked results.
   - Pending task preview for missing tracking.
   - Simulated MCP/agent result preview.

### Ask Tally Behavior

Ask Tally responses should be deterministic and scripted. The public demo should
not call an LLM.

Question matching should normalize case, trim whitespace, collapse repeated
spaces, and ignore terminal punctuation. The four suggested questions should map
to explicit scripted responses. Unrecognized questions should map to the generic
unrecognized-question response described in Edge Cases.

Required mocked response types:

- Answered: a question that can be answered from the fake data.
- Partial answer: a question where the fake data has some signal but lacks a
  required event or property.
- Cannot answer yet: a question that requires new tracking.

The response should stay product-level. It may describe what the agent task
would ask for, but it should not show full fake code patches.

Example questions:

- "Which pages are bringing users to signup?"
- "How many users visited pricing this month?"
- "What should we track next?"
- "Are people publishing forms after signup?"

When a question creates a missing-tracking scenario, the demo should show a
draft task such as:

- Title: "Track form publish completion"
- Event: `form_published`
- Why: "Tally can see signups and template views, but it cannot confirm whether
  users publish forms after signup."
- Agent preview: a simulated result showing that an MCP-capable coding agent
  would receive a task description and verification criteria.

The MCP/agent preview must be explicitly labeled as simulated.

## Integration With Existing Product

### Existing Surfaces

The feature should integrate with:

- `apps/web/app/(marketing)/page.tsx` for the homepage CTA.
- `apps/web/app/(marketing)/demo/page.tsx` for the public route.
- Pure presentational dashboard components where they can accept props and do
  not fetch data, read sessions, or mutate state outside the component.
- Chart/list/stat components only after they are extracted or wrapped so `/demo`
  passes fixture data directly.
- A demo fixture module such as `apps/web/lib/demo/*`.

The demo route must not import authenticated dashboard shells, data-fetching
hooks, session helpers, mutation hooks, server actions, or API clients.

### API Boundary

The demo must not call authenticated `/api/projects/...` endpoints.

Allowed data sources for `/demo` are:

- Static modules bundled with the app, such as `apps/web/lib/demo/*`.
- Local React state for tab selection, typed questions, and displayed mock
  results.
- Static public assets.

The route must not call Tally API routes, hosted MCP routes, Tinybird-backed
analytics endpoints, database-backed route handlers, session endpoints, or
third-party AI services. This keeps the route safe for public traffic and
prevents accidental auth bypasses.

### Backwards Compatibility

The feature should not change authenticated dashboard behavior except where a
component is extracted for reuse. Any extracted component must preserve the
current dashboard output and tests.

The marketing homepage should keep existing setup CTAs. The new demo CTA should
add a lower-friction inspection path, not replace the MCP setup path.

## Scope

### In Scope

- Public `/demo` route.
- Landing-page CTA copy: "View demo dashboard".
- Fictional demo project: "Acme Forms".
- Fake analytics fixtures.
- Light public dashboard frame.
- Overview, Live, Sessions, and Ask Tally demo views.
- Deterministic mocked Ask Tally responses.
- Simulated MCP/agent task preview.
- Setup CTA from the demo page.
- Route rendering tests and interaction tests for mocked Ask Tally behavior.
- Browser verification on desktop and mobile widths.

### Out of Scope

- Real user accounts for demo visitors.
- Persisting demo state outside the browser session.
- Public writes to Postgres or Tinybird.
- Public access to hosted MCP transport.
- Actual LLM calls.
- Full fake implementation patches.
- Billing, quota, settings, or account menus.
- GitHub App install from inside the demo experience.

## Decision Matrix

### Demo Implementation Approach

| Criterion | Static screenshot page | Native fixture-backed route | Public seeded account |
|-----------|------------------------|-----------------------------|-----------------------|
| User value delivered | Low | High | High |
| Integration complexity | Low | Medium | High |
| Risk to existing flows | Low | Low | Medium |
| Consistency with product UX | Low | High | High |
| Implementation effort | Small | Medium | Large |
| Public safety | High | High | Medium |

Recommendation: native fixture-backed route.

Confidence: high.

Rationale: This gives visitors a real click-through product feel without
creating anonymous accounts, auth exceptions, or public write paths. It also
keeps the demo aligned with the actual dashboard as the product evolves.

### Ask Tally Response Approach

| Criterion | Scripted responses | Local rule matching | LLM-backed answers |
|-----------|--------------------|---------------------|--------------------|
| Reliability | High | Medium | Medium |
| Testability | High | High | Low |
| User value delivered | Medium | Medium | High |
| Cost/latency | Low | Low | Medium |
| Risk of overpromising | Low | Medium | High |
| Implementation effort | Small | Medium | Large |

Recommendation: scripted deterministic responses.

Confidence: high.

Rationale: The demo's job is product comprehension, not free-form analytics.
Scripted responses make the experience fast, safe, and stable enough for tests
and public marketing traffic.

## Acceptance Criteria

- Visiting `/demo` without authentication renders the demo page successfully.
- The homepage includes a visible "View demo dashboard" CTA that links to
  `/demo`.
- The demo page clearly indicates that the data is fake.
- The demo page does not expose account controls, billing controls, or user
  dropdowns.
- The demo page provides Overview, Live, Sessions, and Ask Tally views.
- Switching demo views does not call authenticated project APIs.
- Overview shows page views, sessions, top pages, top referrers, and a
  time-series visualization using fixture data.
- Live shows a recent fake event stream using fixture data.
- Sessions shows total, new, and returning sessions using fixture data.
- Ask Tally accepts typed questions.
- Ask Tally returns deterministic mocked responses for answered, partial-answer,
  and cannot-answer-yet cases.
- Missing-tracking responses show a draft task and a simulated MCP/agent preview.
- Simulated MCP/agent output is labeled as simulated.
- The demo includes a setup CTA back to the MCP setup flow.
- The setup CTA links to `/docs/setup` and does not require authentication
  before showing setup instructions.
- The initial `/demo` viewport shows the demo-data banner, product value summary,
  Overview metrics, and Ask Tally entry point or suggested question without
  requiring a visitor to scroll on a common desktop viewport.
- The suggested question "What should we track next?" is visible from the Ask
  Tally view and demonstrates the missing-tracking-to-agent-task loop.
- Existing authenticated dashboard tests continue to pass after any component
  extraction.
- The route is browser-verified at desktop and mobile widths with no overlapping
  or clipped primary UI text.

## Edge Cases

- If a visitor submits an empty Ask Tally question, the demo should not show a
  result and should keep the submit action disabled or show a small validation
  message.
- If a visitor asks an unrecognized question, the demo should return a generic
  deterministic response explaining that the real product would answer from
  connected analytics and suggesting one of the sample questions.
- If JavaScript is slow to hydrate, the server-rendered page should still show
  the demo frame, fake-data banner, and primary CTA.
- The page should remain usable on mobile without hiding the demo navigation or
  primary CTA.
- Demo UI state should stay in React component state only. It should not be
  persisted to `localStorage`, `sessionStorage`, cookies, the database, or API
  routes. URL anchors or query params are out of scope for the MVP.

## Non-Functional Requirements

- **Security:** No unauthenticated production writes, no public MCP tokens, and
  no auth bypasses for existing dashboard APIs.
- **Performance:** `/demo` should render from local fixture data and avoid
  network calls for demo analytics.
- **Accessibility:** Demo navigation should be keyboard reachable, tabs should
  expose selected state, form validation should be available to screen readers,
  charts should have adjacent text summaries, and simulated MCP/agent output
  should be readable as normal text rather than image-only content.
- **Maintainability:** Demo fixtures and mocked responses should live in a
  dedicated module so product copy and fake data can be updated without touching
  authenticated data-fetching code.
- **Visual quality:** The demo should feel like the current product dashboard,
  not a marketing card layout.

## Future Enhancements

- Add a guided overlay or short "tour" mode if analytics show visitors do not
  interact with the demo.
- Add more demo datasets for different product types.
- Add a shareable deep link to specific demo questions.
- Add real hosted sandbox accounts only if there is a clear sales or onboarding
  need and isolation/reset requirements are defined.
