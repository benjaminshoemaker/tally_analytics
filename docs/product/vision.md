# Product Vision

## Summary

Tally Analytics is MCP-first analytics for apps built with AI coding agents.

The product promise is:

> Add analytics from your coding agent. Understand usage in the Tally dashboard. Ask your agent what to track next.

Tally should reduce the work required to get useful analytics into a new app. The user should not need to pick an analytics architecture, wire SDKs by hand, manage project IDs manually, or install a GitHub App before seeing first value.

## Core Thesis

AI coding agents are becoming the place where developers make code changes. Analytics setup should meet developers there.

The website should be the account, dashboard, and control plane. The coding agent should be the integration surface. MCP is the protocol that connects those two surfaces without giving Tally direct repo write access.

## Product Shape

- The user starts in a coding agent such as Codex, Claude Code, Cursor, or another MCP-capable environment.
- The user authenticates to Tally through MCP OAuth.
- The agent asks Tally for a safe, structured analytics installation.
- Tally creates or reuses a project, returns a patch or implementation task, and gives the dashboard URL.
- The user deploys normally.
- The Tally dashboard shows analytics and can later create pending tasks for the coding agent to implement.

## Role Boundaries

Tally owns:

- account identity and billing
- project records
- analytics ingestion and storage
- dashboard views
- MCP tools
- generated analytics integration guidance
- pending implementation tasks

The coding agent owns:

- local repo inspection
- code edits
- patch application
- local verification
- reporting implementation status back to Tally

The user owns:

- approving code changes
- deployment
- deciding whether to connect optional hosted repo automation later

## GitHub App Positioning

GitHub App installation should not be required for first value.

GitHub App support can become an optional upgrade path for users who want Tally to inspect repos remotely, open PRs, respond to webhooks, or make dashboard-triggered changes without returning to their coding agent.

The default product should not ask for repo write access before the user has seen value.

## Near-Term Focus

The near-term product should focus on:

1. MCP-first onboarding and site positioning.
2. Reliable first-event verification after deployment.
3. MCP analytics querying from coding agents.
4. Dashboard-created pending analytics tasks that agents can pull and implement.
5. Repeatable billing and product-flow verification for agents working in this repo.

## Non-Goals For The Current Direction

- Tally should not silently edit a user's repo from the website without explicit repo permissions.
- Tally should not make GitHub App installation the primary onboarding requirement.
- Tally should not build arbitrary generated UI for every custom metric before the install-to-dashboard loop is proven.
- Tally should not support anonymous projects or placeholder project IDs for the MCP install flow.
- Tally should not support MCP clients that cannot complete OAuth in the first version.

## Canonical References

- Current execution pointer: `plans/PLAN_STATUS.md`
- Current MCP onboarding spec: `features/mcp_onboarding/FEATURE_SPEC.md`
- Canonical user flows: `docs/product/user-flows.md`
- High-level technical overview: `docs/architecture.md`
