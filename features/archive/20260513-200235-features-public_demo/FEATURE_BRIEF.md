# Public Demo

## Status

Planned. This is a scoped feature brief for a public, usable demo experience. It
does not supersede any active workstream until explicitly selected.

## Goal

Add a public demo link on the landing page that lets a visitor experience the
Tally dashboard with believable fake data before signing up or configuring MCP.

The demo should answer the question: "What would this look and feel like once
Tally is installed in my app?"

## Entry Points

- Add a public `/demo` route.
- Add a landing-page CTA near the existing "See how it works" / product proof
  path.
- Keep setup CTAs available from the demo so interested users can continue to
  MCP setup.

## Product Shape

Recommended scope is the reusable-dashboard version:

- Public, no login required.
- Fixture-backed fake analytics data.
- Dashboard-like navigation for Overview, Live, Sessions, and Ask Tally.
- Read-only demo state, except local UI interactions such as typing questions
  or toggling tabs.
- Clear banner: "This is demo data. Connect your repo for real analytics."
- No real database writes, OAuth, GitHub App install, or MCP auth.

## Demo Interactions

The demo should let visitors:

- Click through the dashboard surfaces.
- See page views, sessions, top pages, referrers, and live events.
- Type natural-language analytics questions into Ask Tally.
- Receive mocked answers for common questions.
- See a mocked "missing tracking" response that drafts an agent task.
- See a small "what your agent would receive" preview for the MCP/task side.

The MCP behavior should be simulated in the page. Do not expose anonymous MCP
tokens or attempt to make the hosted MCP transport work without auth.

## Implementation Notes

Prefer extracting reusable presentational dashboard components where practical,
then wiring `/demo` to static data. Avoid making authenticated dashboard routes
public or special-casing auth in production endpoints.

Likely implementation surfaces:

- `apps/web/app/(marketing)/demo/page.tsx`
- `apps/web/app/(marketing)/page.tsx`
- `apps/web/components/dashboard/*`
- `apps/web/components/marketing/*`
- `apps/web/lib/demo/*` or similar for fake data and mock responses

Useful existing references:

- Existing dashboard route: `apps/web/app/(dashboard)/projects/[id]/page.tsx`
- Overview route: `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx`
- Live route: `apps/web/app/(dashboard)/projects/[id]/live/page.tsx`
- Sessions route: `apps/web/app/(dashboard)/projects/[id]/sessions/page.tsx`
- Ask Tally panel: `apps/web/components/dashboard/analytics-tasks/ask-tally-panel.tsx`
- Scenario fixtures: `apps/web/e2e/scenarios/`

## Suggested Phases

1. Public demo shell
   - Create `/demo`.
   - Add demo banner and marketing CTA.
   - Link it from the landing page.

2. Reusable demo dashboard
   - Add fixture data.
   - Reuse or extract dashboard presentation components.
   - Add Overview, Live, and Sessions demo tabs.

3. Mocked Ask Tally flow
   - Add local question handling.
   - Return canned answered, partial, and cannot-answer-yet states.
   - Show mocked pending task and MCP tool-result preview.

4. Verification
   - Add focused tests for route rendering and mocked interactions.
   - Run app tests/typecheck/build.
   - Browser-check `/demo` on desktop and mobile widths.

## Acceptance Criteria

- `/demo` is publicly accessible without auth.
- Landing page exposes a clear demo CTA.
- Demo data is obviously fake and cannot be confused with a real account.
- The dashboard preview looks consistent with the real dashboard surface.
- Visitors can click through multiple views without hitting authenticated APIs.
- Ask Tally accepts typed questions and returns deterministic mock responses.
- The mocked MCP/task preview is explicitly presented as simulated behavior.
- Setup/Start with MCP CTA remains available from the demo.

## Non-Goals

- Anonymous real projects.
- Public MCP access.
- Public writes to production database tables.
- GitHub App install inside the demo.
- Long-lived per-visitor demo state.
- Full seeded-account infrastructure for public traffic.

## Open Questions

- Should the demo route use `/demo` or `/dashboard-demo` in public copy?
- Should the landing CTA say "Try demo" or "View demo dashboard"?
- Should fake data use a Tally-owned fictional app name or a generic SaaS app?
- Should Ask Tally mock responses include code snippets, or stay product-level?
