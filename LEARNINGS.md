# Session Learnings

> Persistent knowledge extracted from AI coding sessions.
> Captures decisions, context, action items, and insights that should survive between sessions.
> Add entries with `/capture-session` (full sweep) or `/capture-learning` (single item).

## Decisions

- **[2026-05-13]** Pages Router dogfood installs should use the published `@tally-analytics/sdk` path and remove older generated inline trackers from the test app before verification, so browser events can be attributed to the SDK rather than legacy code. *(source: conversation)*
- **[2026-05-10]** Root `.env.local` is the canonical local env file. App-local env files under `apps/web` and `apps/events` should be absent or symlinks to `../../.env.local`; this prevents silent drift in `DATABASE_URL`, `PORT`, and `NEXT_PUBLIC_APP_URL`. *(source: conversation)*
- **[2026-05-10]** `pnpm env:check` is the durable guard for local env correctness; future agents should verify setup without printing secrets or relying on shell-exported variables. *(source: conversation)*
- **[2026-05-10]** MCP analytics querying remains read-only: no pending tasks, raw SQL, generated dashboards, SDK changes, or event-ingestion changes. *(source: conversation)*
- **[2026-05-10]** `features/mcp_analytics_querying` is implemented and verified, while `plans/PLAN_STATUS.md` still preserves `features/mcp_onboarding` as the primary active workstream. Do not supersede that active plan automatically. *(source: conversation)*

## Action Items

- [ ] **[2026-05-13]** Investigate why `get_live_events` called through Claude with `limit: 10` returned `invalid_limit`, even though MCP overview and sessions worked after the Tinybird env repair. - Owner: Codex
- [ ] **[2026-05-13]** Consider documenting the safe Vercel deploy procedure for the separate `tally-analytics` and `tally-analytics-events` projects, including root-directory/project-link pitfalls. - Owner: Codex
- [ ] **[2026-05-10]** Decide whether to update `plans/PLAN_STATUS.md` to mark `features/mcp_analytics_querying` as implemented or completed. - Owner: human/Codex
- [ ] **[2026-05-10]** Consider adding `@LEARNINGS.md` to `CLAUDE.md` so future Claude sessions load project learnings. - Owner: Codex if approved

## Context

- **[2026-05-13]** End-to-end dogfood project `proj_dgoEuC3C0lo-3Nk` was created through the hosted Tally MCP install tool for `/Users/coding/Projects/tally-pages-router-test-project`; the tool returned `packageInstallCommand: "pnpm install"`, and the target commit is `d811d8e task(tally): install analytics sdk dogfood`. *(source: conversation)*
- **[2026-05-13]** Dogfood verification produced production Tinybird/dashboard rows for `proj_dgoEuC3C0lo-3Nk`: `/contact?dogfood=codex-success`, `/about`, the `codex_dogfood_success` landing URL, and `session_start`; MCP `get_project_overview` returned `13 page views and 3 sessions`, matching the same data path. *(source: verification)*
- **[2026-05-13]** The `tally-analytics-events` Vercel project is distinct from the `tally-analytics` web/MCP project. Deploying the events app safely required temporarily pointing the root `.vercel` link at `apps/events/.vercel` because the Vercel project itself has `apps/events` configured as its root directory. *(source: conversation)*
- **[2026-05-10]** Local env had drifted across root `.env.local`, `apps/web/.env.local`, and `apps/events/.env.local`; `apps/web/.env.local` held the working web values while root was stale for web. *(source: conversation)*
- **[2026-05-10]** The local env setup was normalized: root `.env.local` now carries the canonical local E2E DB URL, and app-local files are ignored symlinks to root. Local backups were created as `.env.local.backup-20260510T061342`. *(source: conversation)*
- **[2026-05-10]** MCP analytics querying passes the hosted MCP transport harness: `pnpm --filter web e2e:mcp-analytics-querying` returns `ok: true`. *(source: verification)*
- **[2026-05-10]** The MCP analytics tool surface includes 11 read-only tools: project listing/resolution, overview, live events, sessions, top pages, top referrers, event discovery/schema, paths to event, and next-event suggestions. *(source: conversation)*

## Bugs & Issues

- **[2026-05-13]** Production ingestion initially returned bare `500` responses from `https://events.usetally.xyz/v1/track`, which surfaced in browser as CORS failures with no `Access-Control-Allow-Origin` on POST. Root cause was a stale/invalid `TINYBIRD_EVENTS_TOKEN` in the `tally-analytics-events` Vercel project. Status: fixed by replacing the token from the active Tinybird `tally` workspace and redeploying the events project. *(source: verification)*
- **[2026-05-13]** Hosted MCP analytics initially returned `service_error` for the dogfood project while direct Tinybird queries worked. Root cause was a stale/invalid `TINYBIRD_ADMIN_TOKEN` in the `tally-analytics` Vercel project. Status: fixed by replacing the admin token from the active Tinybird `tally` workspace and redeploying the web/MCP project. *(source: verification)*
- **[2026-05-10]** Env drift caused local DB, port, and OAuth callback ambiguity. Status: fixed with canonical root env, symlinks, docs, and `pnpm env:check`. *(source: conversation)*
- **[2026-05-10]** The MCP analytics execution plan had a stale unchecked setup item requiring an exported `DATABASE_URL`. Status: fixed in commit `05fb25e` to use root `.env.local` plus `pnpm env:check`. *(source: conversation)*
- **[2026-05-10]** Web builds still emit existing Next `<img>` warnings. Status: open but unrelated to MCP analytics/env work. *(source: verification)*

## Deferred Investigations

- **[2026-05-13]** Consider adding a production smoke check that validates both Vercel Tinybird tokens (`TINYBIRD_EVENTS_TOKEN` and `TINYBIRD_ADMIN_TOKEN`) against the configured Tinybird API URL before dogfood or release verification. *(source: conversation)*
- **[2026-05-10]** Production MCP analytics smoke verification remains separate from the local fixture-backed harness. *(source: conversation)*
- **[2026-05-10]** Next workstream choice remains open: return to active `features/mcp_onboarding`, formally close/promote MCP analytics in `PLAN_STATUS`, or move to another planned feature. *(source: conversation)*
