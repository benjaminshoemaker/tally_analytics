# Feature Brief: MCP Analytics Querying

## Status

Initial workstream brief. Implement when the human explicitly requests it or `plans/PLAN_STATUS.md` marks this workstream active/approved.

## Product Intent

Let users analyze Tally data from inside their coding agent, using the same Tally MCP connection they used for installation.

This turns Tally into both a dashboard product and a development-loop product:

> Ask your coding agent what users are doing, then decide what to build or track next.

## User Flow

1. User has an existing Tally project with events.
2. User is working in a local repo with the Tally MCP configured.
3. User asks the coding agent questions such as:

   ```text
   Use Tally Analytics to summarize usage from the last 7 days.
   ```

   ```text
   Which pages are users visiting before signup?
   ```

   ```text
   Look at usage and suggest events we should add next.
   ```

4. Agent calls Tally MCP read tools.
5. Tally returns scoped analytics summaries and links back to the dashboard.
6. Agent uses the data to answer the user or, later, create pending analytics tasks.

## What Exists Now

- Project analytics APIs exist for dashboard usage.
- E2E fixtures support deterministic overview, live-feed, and session analytics.
- MCP route and auth exist.
- MCP install tool exists.
- No analytics read tools are exposed through MCP yet.

## Net-New Scope

- Add authenticated MCP read tools for analytics data.
- Reuse existing analytics query services where possible instead of duplicating dashboard logic.
- Return compact, agent-readable summaries rather than dashboard-shaped payloads only.
- Include dashboard URLs in responses for follow-up inspection.
- Add tests that prove project ownership and period/limit validation.

## Candidate MCP Tools

- `list_projects`
- `get_project_overview`
- `get_live_events`
- `get_sessions_summary`
- `get_top_pages`
- `get_top_referrers`
- `suggest_next_events`

## Out Of Scope

- Prompt-built custom dashboard UI.
- Cross-project account-wide analysis.
- Writing code changes directly from analysis results.
- Creating pending implementation tasks, except as a later integration with the dashboard pending tasks workstream.

## Initial Acceptance Criteria

- Authenticated MCP user can list only their own projects.
- Authenticated MCP user can query analytics for a project they own.
- MCP returns clear empty/no-events responses for installed projects with no data.
- MCP rejects requests for projects owned by another user.
- Responses are bounded by period/limit validation.
- Tool responses avoid leaking raw tokens, private source files, or unrelated project metadata.
- Analytics results match existing dashboard API semantics for the same project and period.

## Dependencies

- Existing analytics API/query logic.
- Existing MCP OAuth and project ownership.
- Existing local E2E fixture support for deterministic analytics data.

## Open Questions

- Should the MCP expose raw event rows, summarized answers, or both?
- Should the first version be read-only, or should `suggest_next_events` create pending tasks when the user approves?
- Which analytics questions should be first-class tools versus left to the agent to compose from lower-level data?
