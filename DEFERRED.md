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
