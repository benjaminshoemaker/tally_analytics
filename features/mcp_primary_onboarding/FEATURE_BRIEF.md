# Feature Brief: MCP-Only Primary Onboarding

## Status

Initial workstream brief. Implement when the human explicitly requests it or `plans/PLAN_STATUS.md` marks this workstream active/approved.

## Product Intent

Make the core Tally onboarding promise MCP-first:

> Add analytics from your coding agent. View results in the Tally dashboard.

The website should stop presenting GitHub App installation as the main path. GitHub App remains a possible later upgrade for hosted PR automation, not a requirement for first value.

## User Flow

1. Developer is working in a local app with Codex, Claude Code, Cursor, or another MCP-capable coding agent.
2. Developer adds the Tally Analytics MCP server.
3. First use triggers Tally OAuth.
4. Developer asks the coding agent to add Tally Analytics.
5. Agent detects the app, calls Tally MCP, receives a Tally-controlled SDK patch, applies it locally, and runs verification.
6. Developer deploys the app.
7. Tally dashboard shows a waiting state until the first event arrives, then shows analytics.

## What Exists Now

- `features/mcp_onboarding/` contains the current MCP onboarding feature plan and implementation details.
- Hosted MCP route, OAuth, project reuse, Next.js patch generation, and a local MCP self-test harness already exist.
- The dashboard has MCP-created project states and waiting-for-first-event copy.
- The public README, landing page, pricing page, and some dashboard copy still carry GitHub-first assumptions.

## Net-New Scope

- Reposition the public product surface around MCP-first onboarding.
- Rewrite landing page copy and CTAs around coding-agent installation.
- Update setup docs so MCP is the default path.
- Update dashboard empty states so the first recommendation is to use the MCP from a coding agent.
- Update README and developer-facing docs to match the new product shape.
- Reframe GitHub App as optional future/advanced automation.

## Out Of Scope

- Removing GitHub App code.
- Hosted PR creation through the website.
- Local runner/watch-mode automation.
- Custom event task creation from the dashboard.
- MCP analytics querying.

## Initial Acceptance Criteria

- Landing page headline and primary CTA describe the coding-agent/MCP install path.
- `/docs/setup` leads with MCP setup and explains OAuth, install, deploy, and first-event verification.
- Logged-out pricing CTAs do not imply GitHub App installation is required for first value.
- Projects empty state presents MCP setup as the primary action.
- GitHub App language is either removed from first-run copy or explicitly framed as optional managed PR automation.
- README no longer says "Connect GitHub, merge one PR, done" as the primary product description.

## Dependencies

- Existing MCP onboarding implementation in `features/mcp_onboarding/`.
- Current auth/session model.
- Existing Stripe/pricing pages, which need copy changes but not billing logic changes.

## Open Questions

- Should the primary public CTA deep-link to setup docs, a copied MCP command, or OAuth/login first?
- Should the site name the supported agents individually, or keep the language generic and put agent-specific commands in docs?
- Do we still mention GitHub App anywhere before the user has seen value?
