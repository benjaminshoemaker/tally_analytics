# Plan Status

Primary active workstream: `features/mcp_onboarding/`
Current type: `feature`
Current stage: `feature-plan`
Current status: `active`
Last updated: 2026-05-09
Updated by: Codex MCP primary onboarding surface update

Rule: This manifest orients agents to active and planned work; it is not a single-plan execution lock. Agents may implement any non-archived workstream that is explicitly requested by the human. Archived, rejected, abandoned, superseded, completed, and research-only plans remain context only unless the human explicitly revives them.

## Primary Active Scope

- What is being built: MCP-first analytics onboarding for Tally, starting with Codex, MCP OAuth, Next.js, and SDK-based patch bundles.
- Source docs: `features/mcp_onboarding/DISCOVERY_NOTES.md`, `features/mcp_onboarding/FEATURE_SPEC.md`, `features/mcp_onboarding/FEATURE_TECHNICAL_SPEC.md`, `features/mcp_onboarding/EXECUTION_PLAN.md`
- Next command: `cd features/mcp_onboarding && /fresh-start`

## History

| Path | Type | Status | Superseded By | Updated | Notes |
|------|------|--------|---------------|---------|-------|
| `plans/archive/greenfield/` | greenfield | superseded | `features/mcp_onboarding/` | 2026-05-06 | Original SaaS analytics platform plan, archived as historical context |
| `plans/archive/features/github_oauth/` | feature | completed |  | 2026-05-06 | Historical feature plan |
| `plans/archive/features/improved_metrics/` | feature | superseded | `features/mcp_onboarding/` | 2026-05-06 | V2 metrics plan, useful context only |
| `plans/archive/features/stripe_integration/` | feature | completed |  | 2026-05-06 | Historical billing plan |
| `features/mcp_onboarding/` | feature | active |  | 2026-05-06 | Current feature execution plan work |
| `features/mcp_analytics_querying/` | feature | planned |  | 2026-05-09 | Planned feature, technical spec, flow verification plan, and execution plan for MCP analytics read/query tools |
| `features/mcp_primary_onboarding/` | feature | implemented |  | 2026-05-09 | Public-surface rewrite implemented by explicit human request; primary active workstream remains `features/mcp_onboarding/` |
| `features/stripe_billing_verification/` | feature | planned |  | 2026-05-09 | Approved planned workstream for an agent-runnable Stripe billing verification harness |
| `features/dashboard_pending_tasks/` | feature | planned |  | 2026-05-09 | Feature, technical spec, flow verification plan, and execution plan for answer-first dashboard questions and HITL pending analytics task creation |
