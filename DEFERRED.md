# Deferred Requirements

> Captured during specification Q&A. Review when planning future versions.

## From FEATURE_SPEC.md: mcp_onboarding (2026-05-06)

| Requirement | Reason | Notes |
|-------------|--------|-------|
| Prompt-configured analytics dashboards and reports | Separate feature | Tracked as P0 in `NEXT_FEATURES.md`; likely use a component catalog/report-spec renderer rather than arbitrary generated UI |
| Custom event instrumentation such as "track signups" | V2 | Wait until the basic MCP install-to-dashboard loop works with real data |
| Agent-configured analytics alerts | Future enhancement | Tracked in `NEXT_FEATURES.md` |
| Cross-project analytics comparison | Future enhancement | Tracked in `NEXT_FEATURES.md` as low priority |
| GitHub App upgrade path for hosted PR creation and webhook lifecycle tracking | Separate feature | Useful after the local MCP patch flow is proven |
| API key fallback for MCP clients without OAuth | Out of scope for this feature | V1 intentionally supports only MCP OAuth-capable clients |
| Non-Next.js framework support | V2 | Start with Next.js App Router and Pages Router |

## From FEATURE_SPEC.md: dashboard_pending_tasks (2026-05-09)

| Requirement | Reason | Notes |
|-------------|--------|-------|
| Dedicated passive `track_feature_usage` task type for richer non-completion feature usage | V2 | V1 can represent many feature-usage cases through `track_completion` or `track_click`; add a separate type for passive, duration-based, or repeated usage after seeing awkward cases |
| Dedicated `track_funnel_step` task type for multi-step funnel instrumentation | V2 | V1 should avoid broad funnel instrumentation until single-event task creation and verification are proven |
| Full event schema editor for advanced users | Future enhancement | V1 allows editing title, event name, and notes only; full schema editing risks turning this into a manual event builder |
