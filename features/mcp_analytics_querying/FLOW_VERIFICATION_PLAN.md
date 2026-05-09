# Flow Verification Plan: mcp_analytics_querying

Status: Applicable

## Flow Claim

A developer can ask their coding agent an analytics question, the agent can retrieve project-scoped Tally data through authenticated MCP tools, and the returned data either answers the question or clearly states the limitation and suggested events.

First valuable slice:

```text
An authenticated MCP client can resolve the current repo's Tally project, query usage summaries, inspect events, answer a pages-before-signup question when signup events exist, and return recommendations when the data is incomplete.
```

## Channel Under Test

MCP over the hosted web app route:

```text
http://localhost:3000/api/mcp
```

The verification must call MCP tools through the MCP transport. It must not substitute direct service imports, dashboard HTTP APIs, or browser UI assertions for the MCP claim.

## Harness Shape

Add a local script:

```bash
pnpm --filter web e2e:mcp-analytics-querying
```

The script should follow the shape of `apps/web/scripts/mcp-self-test.mjs`:

- use a temporary fixture root under `tmp/`
- seed deterministic E2E users and projects
- start `apps/web` locally with `E2E_TEST_MODE=1`
- create a local OAuth access token for the seeded user and MCP resource
- connect an MCP SDK client to `/api/mcp`
- call real MCP tools and assert structured results
- clean up temp data and OAuth rows after the run

## Setup/State

Required scenarios:

- `mcp-active-with-events`: overview/session/live/top-pages/top-referrers happy path.
- `mcp-active-with-signup-events`: path-to-event happy path with at least 5 `signup_completed` target events and enough prior path coverage.
- `mcp-active-partial-signup-data`: path-to-event `partial_data` case.
- `mcp-active-no-events`: explicit no-events state.
- `mcp-multiple-projects`: project resolution ambiguity.

For every scenario used by `resolve_project`, the checked-in scenario or the harness-generated fixture must compute `mcpFingerprint` from the exact repo/app context passed to the MCP tool, using `buildMcpProjectFingerprintInput` and `mcpFingerprint`. Existing placeholder fingerprints are acceptable for dashboard-only scenarios, but not for this MCP-channel resolve test.

Exception: `mcp-multiple-projects` is a broad-match-only/legacy ambiguity fixture. It should not include an exact fingerprint match for the MCP call. Instead, seed two owned MCP projects with `mcpFingerprint: null` or deliberately non-matching legacy fingerprints, the same `mcpAppRoot`, and matching `mcpRepoName`, `displayName`, or `packageName` values. This forces the resolver past exact lookup into the broad owned-candidate query so `multiple_matches` is testable without violating the unique fingerprint index.

Required environment:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres
E2E_TEST_MODE=1
E2E_ANALYTICS_FIXTURE_DIR=<tmp fixture root>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The harness must not use a human GitHub account, personal OAuth token, production Tinybird data, or production Tally data.

## Driver

The script should:

1. Run `pnpm --filter web db:push` if needed.
2. Seed each required scenario or write equivalent temp fixtures through the existing scenario seeder.
3. Insert a local OAuth client/access-token pair for the scenario user, scoped to `mcp:install` and resource `http://localhost:3000/api/mcp`.
4. Start `pnpm --filter web dev:e2e`.
5. Connect an MCP SDK `Client` with `StreamableHTTPClientTransport` and `Authorization: Bearer <token>`.
6. Call `tools/list` and assert the analytics tools are present with read-only annotations.
7. Execute these tool sequences:
   - usage summary: `resolve_project` then `get_project_overview`
   - data arrival: `get_live_events`
   - event discovery: `list_events` then `get_event_schema`
   - signup path: `get_paths_to_event`
   - missing or incomplete signup insight: `suggest_next_events`
   - no-events project: overview, sessions, live, and events tools
   - ownership guard: another user's project id returns `project_not_found`
   - invalid input: invalid `period`, `limit`, `since`, `eventName`, `targetEvent`, and `maxSteps` return structured `invalid_*` MCP results

## Assertions

The harness passes only if:

- `resolve_project` returns `ok` for the exact repo/app fixture and does not create projects.
- `list_projects` returns only projects owned by the authenticated user.
- `get_project_overview` includes page views, sessions, exact data window, compact summary, and dashboard URLs.
- `get_sessions_summary`, `get_live_events`, `get_top_pages`, and `get_top_referrers` match fixture-backed dashboard semantics.
- `list_events` includes observed custom event names in the signup fixture.
- `get_event_schema` does not expose raw identifiers or unbounded example values.
- `get_paths_to_event` returns `ok` for the signup fixture and `partial_data` for the partial fixture.
- Missing signup data produces `insufficient_data` or `partial_data` with explicit limitations and recommended events.
- `suggest_next_events` always returns `createsPendingTasks: false`.
- No-events fixtures return explicit `no_events` statuses with zero or empty metrics.
- Invalid or foreign project ids do not run analytics queries and return `project_not_found`.
- Invalid recoverable inputs return structured MCP `structuredContent.status` values such as `invalid_period`, `invalid_limit`, `invalid_since`, `invalid_event_name`, and `invalid_steps`; they do not fail only as generic SDK validation errors.
- Tool results include `structuredContent` and compact `content` text.

Negative assertions:

- No pending tasks are created.
- No OAuth tokens, Tinybird tokens, GitHub installation ids, billing fields, or private source files appear in tool output.
- No production or remote database can be seeded unless the existing E2E remote-seed guard is explicitly overridden.

## Evidence

On success, print a compact JSON summary:

```json
{
  "ok": true,
  "stages": [
    { "name": "tools-list", "status": "passed" },
    { "name": "usage-summary", "status": "passed" },
    { "name": "signup-path", "status": "passed" }
  ]
}
```

On failure, include:

- failing stage name
- MCP tool name
- sanitized status/result summary
- temp fixture directory when `--keep` is passed

No screenshots are required for this MCP flow.

## Teardown/Rerun

Each run should:

- delete temporary fixture directories unless `--keep` is passed
- stop local web processes
- delete local OAuth access tokens, refresh tokens, authorization codes, and test OAuth clients created during the run
- delete seeded users/projects when using disposable temp seed data
- leave checked-in scenario files unchanged

Reruns should be idempotent. If port `3000` is in use, the script should fail fast with a clear message instead of attaching to an unknown server.

## Open Decisions

None blocking.

The harness may seed OAuth tokens directly because this flow verifies analytics querying through MCP. Browser OAuth is already covered by the existing MCP onboarding self-test.
