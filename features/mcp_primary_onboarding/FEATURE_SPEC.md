# Feature Spec: MCP Primary Onboarding Site Rewrite

## Status

Implemented by explicit human request on 2026-05-09. `plans/PLAN_STATUS.md` remains the orientation manifest for the primary active workstream; this public-surface rewrite was implemented as approved non-current planned work without superseding `features/mcp_onboarding/`.

This feature formalizes the public-product rewrite for Tally's MCP-first direction. It depends on the existing MCP onboarding work in `features/mcp_onboarding/` and should not be used to implement new MCP backend behavior unless a later technical spec explicitly expands scope.

## Overview

Tally is MCP-first analytics for apps built with AI coding agents. The website is the account, dashboard, pricing, documentation, and control-plane surface. The coding agent is the integration surface.

This feature updates the public product surface so the first-run path is:

1. Add the Tally MCP server to Claude Code, Codex, Cursor, or another supported coding agent.
2. Authenticate through Tally MCP OAuth.
3. Ask the agent to add Tally Analytics to the local app.
4. Let the agent apply the Tally SDK patch and run local verification.
5. Deploy normally.
6. Confirm the first event and analytics in the Tally dashboard.

The GitHub App remains available as optional managed PR automation for users who want hosted repo inspection and PR creation. It must not be presented as the primary onboarding path or as required for first value.

## Problem

The current public surface still carries GitHub-first assumptions in the landing page, setup docs, pricing CTAs, and dashboard empty states. That creates a mismatch with the current product thesis:

- Developers using AI coding agents expect to make code changes inside their agent, not by installing a GitHub App first.
- Requiring repo write access before first value makes the product feel heavier than the MCP-first flow requires.
- Copy that says "connect GitHub and get a PR" makes GitHub App installation appear mandatory even though the MCP path can install Tally from the local coding environment.
- The dashboard should be understood as the control plane after installation, not the place where the first code integration begins.

This feature solves that mismatch by making MCP setup the primary story across the website and dashboard while preserving GitHub App language only where it is clearly optional.

## Users

Primary users:

- Developers building apps with Claude Code, Codex, Cursor, or another MCP-capable coding agent.
- Solo founders and early-stage builders who want useful analytics without choosing an analytics architecture or wiring SDKs by hand.
- Tally users who start from public docs or pricing and need to understand that setup begins in their coding agent.

Secondary users:

- Developers using other MCP-capable coding agents where public copy can stay generic or present the hosted MCP URL.
- Users already signed in to Tally who have no projects yet.
- Users who want hosted PR automation after seeing value from MCP-first setup.
- AI coding agents reading the repo and product docs to implement or verify the onboarding surface.

## Goals

- Make MCP setup the first-run product path on the landing page, setup docs, pricing CTAs, dashboard empty state, and product README copy where applicable.
- Explain the role split clearly: coding agent installs analytics; Tally dashboard shows usage, billing, project status, and future tasks.
- Keep the GitHub App available but frame it as optional managed PR automation.
- Keep setup instructions consistent with the current MCP onboarding implementation: hosted MCP URL, MCP OAuth, SDK patch bundle, local verification, deploy, first-event confirmation.
- Avoid implying that Tally needs direct repo write access before first value.
- Preserve existing dashboard and billing behavior while changing only copy, CTAs, and empty-state guidance.

## Non-Goals

- No removal of GitHub App code, routes, tests, database fields, webhooks, or hosted PR generation logic.
- No new MCP tools, OAuth behavior, project-reuse behavior, patch-generation behavior, or analytics-querying behavior.
- No dashboard-created pending analytics tasks.
- No hosted PR creation from the MCP-first path.
- No local runner, watch mode, or background automation.
- No custom-event instrumentation flow such as "track signups" or "track pricing CTA clicks."
- No support expansion beyond the MCP onboarding implementation's supported clients and app targets.
- No billing logic changes beyond CTA copy and destination clarity.

## Product Positioning

### Primary Promise

Use this as the durable public promise:

> Add analytics from your coding agent. Understand usage in the Tally dashboard.

Longer supporting copy may add:

> Ask Claude Code, Codex, Cursor, or another MCP-capable agent to install Tally. Tally creates the project, returns a safe SDK patch, and gives you a dashboard URL for first-event verification.

For this feature, the public surfaces use a tabbed setup widget with Claude Code, Codex, Cursor, and generic MCP-capable agent options. The tabbed widget is the canonical way to show client-specific commands/configuration.

### Role Boundaries

The public surface should consistently reinforce:

- The coding agent installs or changes code.
- Tally owns project creation, OAuth, dashboard, billing, analytics storage, and setup guidance.
- The user approves local code changes and deploys the app.
- GitHub App installation is optional for managed PR automation, not required setup.

### GitHub App Framing

Allowed framing:

- "Optional managed PR automation."
- "Connect GitHub later if you want Tally to inspect repos remotely or open PRs."
- "Prefer a hosted PR workflow? Install the GitHub App."

Avoid framing:

- "Connect GitHub" as the primary setup CTA.
- "Merge the PR" as the default path to first analytics.
- Any pricing or empty-state copy that implies GitHub App installation is required before tracking starts.

## Core User Experience

### Public Landing Page

The logged-out landing page should present MCP-first setup above the fold.

Expected flow:

1. User lands on `/`.
2. Hero headline or subhead identifies Tally as MCP-first analytics for apps built with AI coding agents.
3. Primary CTA sends the user to MCP setup documentation or a setup section that shows the MCP command.
4. Secondary CTA can point to pricing, docs, or login/dashboard depending on existing navigation conventions.
5. The hero and "How it works" sections describe coding-agent installation, Tally OAuth, SDK patch application, deployment, and first-event dashboard confirmation.
6. GitHub App is absent from the primary first-run flow or appears only as an optional advanced path below the MCP flow.

Implemented primary CTA:

> Start with MCP

Implemented secondary CTA:

> See how it works

The landing page may still provide login access through the navbar or a secondary account link, because Tally account access remains necessary for dashboard and billing.

### Setup Docs

`/docs/setup` should become the canonical first-run setup guide.

Expected flow:

1. User opens `/docs/setup`.
2. Page leads with the MCP setup path, not GitHub App installation.
3. The setup widget includes commands/configuration for Claude Code, Codex, Cursor, and a generic MCP server URL.
4. The Codex tab includes:

   ```bash
   codex mcp add tally --url https://usetally.xyz/api/mcp
   ```

5. Docs explain that first use triggers Tally OAuth.
6. Docs tell the user to ask the coding agent to add Tally Analytics to the app.
7. Docs explain that the agent receives a Tally SDK patch, applies it locally, and runs verification where possible.
8. Docs tell the user to deploy, visit one or two pages, and confirm events in the dashboard.
9. Docs include a clearly separated optional GitHub App section for managed PR automation.

Minimum setup-doc sections:

- "Add the MCP server"
- "Authenticate with Tally"
- "Ask your agent to install analytics"
- "Deploy and verify the first event"
- "Optional: managed PR automation with GitHub App"
- "Troubleshooting"

Troubleshooting should include:

- MCP OAuth did not complete.
- Agent cannot identify a supported app target.
- Patch was prepared but not applied.
- App deployed but dashboard is still waiting for the first event.
- User wants hosted PR automation instead of local agent edits.

### Pricing CTAs

Pricing should sell limits and retention without turning billing into the first setup step.

Expected flow:

1. Logged-out user opens `/pricing`.
2. Page explains that setup starts from the coding agent and the free tier can be used to verify first value.
3. Logged-out plan CTAs should not say or imply "Install GitHub App."
4. CTAs may point to setup docs, login, or checkout depending on existing auth and billing constraints, but the copy should make the next step clear.
5. Logged-in free users should retain upgrade checkout behavior.
6. Paid users should retain billing portal behavior.

Recommended logged-out CTA labels:

- Free: "Start with MCP"
- Pro: "Start with MCP"
- Team: "Start with MCP"

If all logged-out CTAs must route through login for implementation simplicity, the surrounding copy must still say that installation happens from the coding agent after authentication.

Recommended CTA route matrix:

| User state | Surface | Primary CTA label | Destination |
|------------|---------|-------------------|-------------|
| Logged out | Landing hero | Add Tally with MCP | `/docs/setup` |
| Logged out | Landing final CTA | Add Tally with MCP | `/docs/setup` |
| Logged out | Pricing plan cards | Start with MCP | `/docs/setup` |
| Logged in, no projects | Projects empty state | MCP command block | Copy/read command in place |
| Logged in, free plan | Pricing paid tiers | Upgrade to Pro/Team | Existing Stripe checkout |
| Logged in, paid plan | Pricing paid tiers | Manage billing | Existing Stripe billing portal |

Login remains available through the existing navbar/login surfaces. The first product CTA should point to setup unless implementation has a documented auth constraint in the technical spec.

### Dashboard Projects Empty State

The projects empty state should make MCP setup the primary action.

Expected flow:

1. Signed-in user opens `/projects` with no projects.
2. Empty-state headline and body explain that the user should add Tally from a coding agent.
3. Primary action or command block shows the MCP command.
4. Empty state uses the same tabbed setup widget so users can choose Claude Code, Codex, Cursor, or another MCP-capable coding agent.
5. GitHub App appears as a secondary optional action for managed PR automation.
6. Empty state does not describe the user as having no "connected repositories" as the primary empty state, because MCP-created projects may not have GitHub App installation data.

Recommended empty-state headline:

> Add your first project from your coding agent

Recommended body:

> Add the Tally MCP server, authenticate with Tally, then ask your agent to install analytics. Your dashboard will appear here when the project is created.

### README And Durable Product Copy

README and durable product docs should match the new surface where they are part of the product-facing story.

Required README posture:

- Tally is MCP-first analytics for apps built with AI coding agents.
- The core product flow starts with adding the MCP server to a coding agent.
- The GitHub App is optional advanced managed PR automation.
- README must not describe "connect GitHub, merge one PR, done" as the primary product promise.

### Metadata And SEO Copy

Page metadata should stop saying only "one click" or "analytics for Next.js" if that hides the MCP-first agent workflow.

Recommended root metadata description:

> Add analytics from your coding agent, then understand usage in the Tally dashboard.

Open Graph and Twitter descriptions should use the same MCP-first positioning.

## Integration With Existing Product

This feature modifies or extends:

- `apps/web/app/(marketing)/page.tsx`
- `apps/web/components/marketing/hero.tsx`
- `apps/web/components/marketing/features.tsx`
- `apps/web/components/marketing/how-it-works.tsx`
- `apps/web/components/marketing/set-and-forget.tsx`
- `apps/web/components/marketing/navbar.tsx` only if CTA labels need adjustment.
- `apps/web/app/(marketing)/docs/page.tsx`
- `apps/web/app/(marketing)/docs/setup/page.tsx`
- `apps/web/app/(marketing)/pricing/page.tsx`
- `apps/web/app/(dashboard)/projects/page.tsx`
- `apps/web/app/layout.tsx` metadata.
- `README.md` if current copy diverges from the MCP-first positioning.
- Existing marketing and dashboard tests that assert GitHub-first copy.

Some of these surfaces already overlap with acceptance criteria in `features/mcp_onboarding/`, especially `/docs/setup`, `/projects`, MCP command copy, and waiting-for-first-event copy. This feature should treat those as existing requirements to preserve or reposition, not as permission to rebuild MCP backend behavior or replace the active feature plan.

This feature relies on:

- Existing hosted MCP endpoint at `https://usetally.xyz/api/mcp`.
- Existing MCP OAuth behavior.
- Existing MCP-created project states.
- Existing waiting-for-first-event dashboard copy.
- Existing Stripe checkout and billing portal behavior.
- Existing GitHub App code remaining available as optional automation.

## Backwards Compatibility

Existing GitHub App users must continue to have access to:

- GitHub App install links where appropriate.
- Existing project list and detail behavior.
- Existing regenerate/reanalyze behavior for GitHub App projects.
- Existing webhook and PR automation behavior.

The rewrite must not remove or hide GitHub App functionality from users who intentionally choose managed PR automation. It only changes first-run prominence and product framing.

## Data Persistence

This feature should not add new persisted data.

No database migrations are expected. No Tinybird schema changes are expected. No SDK changes are expected.

If implementation discovers that a new tracking event or product analytics event would be useful for measuring activation, capture it as a follow-up instead of adding it to this feature.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Logged-out user starts on landing page | Primary path points to MCP setup, not GitHub App installation |
| Logged-out user needs account access | Login remains available, but is not described as "install GitHub App" |
| Logged-out user opens pricing | CTAs do not imply GitHub App is required for first value |
| Signed-in user has no projects | Empty state leads with MCP command and coding-agent setup |
| User prefers hosted PR automation | GitHub App option is visible as secondary optional managed PR automation |
| User has existing GitHub App projects | Existing project views and actions keep working |
| User has MCP-created projects | Project labels and empty states do not assume repository installation data |
| User deploys but no events arrive | Dashboard keeps the waiting-for-first-event guidance from MCP onboarding |
| Agent/client is not Codex | Public copy may name Codex first but should allow Claude Code, Cursor, or another MCP-capable coding agent where space allows |

## Acceptance Criteria

### Landing Page

- The landing page hero headline or subhead communicates that Tally is analytics installed from a coding agent or through MCP.
- The primary landing-page CTA is not "Sign in with GitHub."
- The primary landing-page CTA points to MCP setup guidance or a setup section.
- The hero body does not say "Connect your GitHub repo. We send a PR. You get analytics." as the primary product explanation.
- "How it works" starts with adding Tally MCP to a coding agent, not connecting a GitHub repository.
- "How it works" includes deployment and first-event dashboard confirmation.
- Any GitHub App mention on the landing page is explicitly optional managed PR automation.

### Setup Docs

- `/docs` index presents MCP setup as the first documentation path.
- `/docs` index does not describe "Install the GitHub App and merge the PR" as the primary setup path.
- `/docs/setup` leads with MCP setup.
- `/docs/setup` includes a tabbed setup widget for Claude Code, Codex, Cursor, and generic MCP-capable agents.
- The Codex tab includes the command `codex mcp add tally --url https://usetally.xyz/api/mcp`.
- `/docs/setup` explains MCP OAuth, agent install, local patch application, deployment, and first-event dashboard verification.
- `/docs/setup` contains an optional GitHub App section framed as managed PR automation.
- Troubleshooting copy includes the waiting-for-first-event state and does not assume a pending GitHub PR is the normal first-run problem.

### Pricing

- Logged-out pricing CTAs do not imply GitHub App installation.
- Pricing copy explains that users can start by adding Tally from a coding agent.
- Existing logged-in checkout and billing portal behavior is preserved.
- Pricing tests cover logged-out CTA copy and logged-in billing behavior.

### Dashboard Empty State

- `/projects` with no projects presents MCP setup as the primary action.
- The empty state lets users choose Claude Code, Codex, Cursor, or another MCP-capable coding agent.
- The Codex tab includes the MCP command `codex mcp add tally --url https://usetally.xyz/api/mcp`.
- GitHub App installation is present only as a secondary optional managed PR automation action.
- The projects page header/body no longer frames all projects as "connected repositories."
- Project list, detail, and live views continue to render MCP-created projects without requiring GitHub repo or installation fields.
- GitHub-only regenerate/reanalyze actions remain hidden or disabled for MCP-created projects.
- MCP-created projects with no production events keep the waiting-for-first-event copy from `features/mcp_onboarding/`.

### README And Metadata

- README describes MCP-first setup as the core product flow.
- README frames GitHub App as optional advanced managed PR automation.
- Root metadata and social descriptions use MCP-first positioning.
- README and metadata do not use "connect GitHub, merge one PR, done" as the primary product description.

### Regression

- GitHub App routes, links, tests, and optional PR automation copy remain available.
- No database migration is added for this feature.
- No SDK code is changed for this feature unless a later technical spec explicitly expands scope.
- Existing MCP onboarding tests remain valid.

## Verification Plan

At implementation time, verify with targeted tests before broader app checks:

```bash
pnpm --filter web test -- marketing-landing-page.test.ts marketing-docs-pages.test.ts marketing-pricing-page.test.ts projects-list-page.test.ts root-layout-metadata.test.ts
pnpm --filter web typecheck
```

If implementation touches broader shared marketing/dashboard components, also run:

```bash
pnpm --filter web test
```

Browser verification should inspect at least:

- `/`
- `/docs`
- `/docs/setup`
- `/pricing`
- `/projects` with the local no-project scenario or mocked empty projects state

Implemented verification also removed the temporary `/mockups/mcp-primary-onboarding` review route once the accepted landing direction was applied to product pages.

## Future Enhancements

These are intentionally deferred from this feature:

- Dashboard-created pending analytics tasks that coding agents can pull and implement.
- MCP analytics querying from coding agents.
- Custom event instrumentation flows.
- Hosted GitHub App PR automation as the primary first-run flow for specific advanced users.
- Agent-specific setup pages for Claude Code, Cursor, and other MCP clients beyond the shared tabbed widget.
- Activation analytics for measuring which CTA or setup path produced first event.

## Open Questions For Technical Spec

- Resolved: primary CTAs point to `/docs/setup`; no dedicated setup route was added.
- Resolved: agent-specific command/config blocks appear through the shared tabbed setup widget.
- Resolved: optional GitHub App automation appears in docs and dashboard secondary actions, not as the landing-page first-run path.
