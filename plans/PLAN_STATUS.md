# Plan Status

Primary active workstream: features/public_demo/
Current type: feature
Current stage: completed
Current status: completed
Last updated: 2026-05-14
Updated by: Codex public demo execution
Next command: /progress

Rule: This manifest orients agents to active and planned work; it is not a single-plan execution lock. Agents may implement any non-archived workstream that is explicitly requested by the human. Archived, rejected, abandoned, superseded, completed, and research-only plans remain context only unless the human explicitly revives them.

## Primary Active Scope

- `features/public_demo/`
- Public `/demo` route for prospective users to experience fake dashboard data,
  mocked Ask Tally responses, and simulated MCP/agent task output.
- Explicit human direction may still authorize any non-archived planned workstream.

## History

| Path | Type | Status | Superseded By | Updated | Notes |
|------|------|--------|---------------|---------|-------|
| `plans/archive/greenfield/` | greenfield | superseded | `features/mcp_onboarding/` | 2026-05-06 | Original SaaS analytics platform plan, archived as historical context |
| `plans/archive/features/github_oauth/` | feature | completed |  | 2026-05-06 | Historical feature plan |
| `plans/archive/features/improved_metrics/` | feature | superseded | `features/mcp_onboarding/` | 2026-05-06 | V2 metrics plan, useful context only |
| `plans/archive/features/stripe_integration/` | feature | completed |  | 2026-05-06 | Historical billing plan |
| `features/mcp_onboarding/` | feature | completed |  | 2026-05-11 | MCP-first analytics onboarding complete; phase-state complete and MCP self-test harness passed end to end |
| `features/mcp_analytics_querying/` | feature | completed |  | 2026-05-11 | MCP analytics read/query tools complete; phase-state complete and MCP analytics flow harness passed |
| `features/mcp_primary_onboarding/` | feature | implemented |  | 2026-05-09 | Public-surface rewrite implemented by explicit human request |
| `features/stripe_billing_verification/` | feature | implemented |  | 2026-05-11 | Agent-runnable Stripe billing harness implemented; deterministic local and real-provider smoke runs passed with retained summaries under `tmp/stripe-billing-verification/` |
| `features/dashboard_pending_tasks/` | feature | completed |  | 2026-05-12 | Dashboard pending-task flow completed with feature-local phase-state recovery, harness coverage, full web tests, SDK guard, and regression slice pass |
| `features/public_demo/` | feature | completed |  | 2026-05-14 | Public demo route, landing CTA, static fixture dashboard, deterministic Ask Tally mock, and browser flow verification completed; previous feature-local notes archived at `features/archive/20260513-200235-features-public_demo/` |
