# Feature Technical Spec: MCP Analytics Querying

Status: Planned technical direction. This does not supersede the active workstream in `plans/PLAN_STATUS.md`.

## Existing Code Analysis

### Similar Functionality Audit

- `apps/web/app/api/mcp/route.ts`: Hosts the current MCP server with `mcp-handler`, Node runtime, OAuth bearer-token auth, and required `mcp:install` scope.
- `apps/web/lib/mcp/server.ts`: Registers the smoke tool and `prepare_nextjs_install_patch`; new analytics tools should be registered from here.
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts`: Establishes the local tool pattern: get `userId` from `extra.authInfo`, call a service function, return `structuredContent` plus compact `content` text.
- `apps/web/lib/mcp/tools/schemas.ts`: Existing Zod schema location for MCP tool inputs. Analytics should add separate schemas rather than overloading the install schema.
- `apps/web/lib/mcp/auth.ts`, `apps/web/lib/oauth/*`: Existing MCP OAuth model maps bearer tokens to `TallyMcpAuthInfo.extra.userId` and validates resource plus scope.
- `apps/web/lib/db/queries/projects.ts`: Owns MCP project fingerprinting and project dashboard URL generation. `resolve_project` should reuse `normalizeGitRemote`, `buildMcpProjectFingerprintInput`, and `mcpFingerprint`.
- `apps/web/app/api/projects/[id]/analytics/{overview,sessions,live}/route.ts`: Current dashboard analytics semantics. These routes duplicate period parsing, ownership checks, Tinybird SQL helpers, and E2E fixture branching.
- `apps/web/lib/analytics/e2e-fixtures.ts`: Deterministic local analytics source used when `E2E_TEST_MODE=1`. It currently accepts only `page_view` and `session_start`.
- `tinybird/datasources/events.datasource`: Event warehouse schema. `event_type` is `LowCardinality(String)`, but production ingestion currently validates only `page_view` and `session_start`.
- `apps/web/scripts/mcp-self-test.mjs`: Existing full MCP onboarding harness. Analytics flow verification should reuse its local DB, service startup, OAuth-token cleanup, and temporary fixture patterns.

Recommendation: use a hybrid approach. Extract shared dashboard analytics services first, then build MCP tools on top of those services. Do not create a separate MCP-only analytics query stack.

### Existing Patterns

- File organization: route handlers live under `apps/web/app/api`; reusable logic lives under `apps/web/lib`; MCP tools live under `apps/web/lib/mcp/tools`; local harnesses live under `apps/web/scripts`.
- Naming: tool names are snake_case MCP names, TypeScript functions are camelCase, and DB query helpers are grouped by domain.
- Validation: Zod schemas are used for MCP and request payloads. Invalid user input returns structured error states instead of throwing where recovery is possible.
- Auth: route-level MCP auth happens before tool execution; tool handlers still defensively check `extra.authInfo.extra.userId`.
- Analytics data source: dashboard routes use E2E fixtures first when `E2E_TEST_MODE=1`, otherwise Tinybird SQL.
- Testing: Vitest mocks DB/Tinybird modules for unit tests; Playwright scenario tests use seeded JSON fixtures and `/api/auth/e2e-login`.

### Integration Point Map

| File | Risk | Coverage | Notes |
|------|------|----------|-------|
| `apps/web/app/api/mcp/route.ts` | Low | `mcp-route.test.ts`, `mcp-auth.test.ts` | Keep required auth wrapper. No route contract change. |
| `apps/web/lib/mcp/server.ts` | Medium | `mcp-route.test.ts` | Register 11 new tools. Tests must assert schemas and read-only annotations. |
| `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` | Low | `mcp-route.test.ts` | Extract shared `userIdFromAuth` helper to avoid duplicating auth parsing. Preserve install behavior. |
| `apps/web/lib/oauth/validation.ts` | Low | OAuth tests | Do not add a new scope in v1. Treat `mcp:install` as the v1 install/read authority. |
| `apps/web/lib/db/queries/projects.ts` | Medium | `mcp-project-queries.test.ts` | Add read-only project listing, owned project lookup, and MCP fingerprint resolution. No writes from analytics tools. |
| `apps/web/app/api/projects/[id]/analytics/overview/route.ts` | Medium | `analytics-overview-api.test.ts` | Refactor to shared service while preserving HTTP response shape. |
| `apps/web/app/api/projects/[id]/analytics/sessions/route.ts` | Medium | `analytics-sessions-api.test.ts` | Preserve current Tinybird behavior where returning sessions are `0`. |
| `apps/web/app/api/projects/[id]/analytics/live/route.ts` | Medium | `analytics-live-feed-api.test.ts` | Preserve live ordering, `since`, and `limit` behavior. |
| `apps/web/lib/analytics/e2e-fixtures.ts` | Medium | `e2e-analytics-fixtures.test.ts` | Broaden fixture parser to generic `event_type: string` for local custom-event scenarios. |
| `apps/web/e2e/scenarios/*.json` | Medium | `e2e-scenarios.test.ts`, Playwright scenario tests | Add signup and partial-answer fixtures. Loosen scenario contract to permit custom event names. |
| `apps/events/app/v1/track/route.ts` | High | Events tests | Do not modify in this feature. Production ingestion remains limited to existing SDK events. |
| `packages/sdk/*` | High | SDK tests and bundle-size rule | Do not modify in this feature. Custom tracking instrumentation belongs to a later feature. |

## Codebase Maturity Assessment

This is a brownfield feature on a young codebase with useful tests but duplicated analytics logic.

Technical debt to account for:

- Dashboard analytics logic is embedded directly in route handlers and repeats period parsing, SQL escaping, ownership checks, and Tinybird invocation.
- E2E fixture parsing is narrower than the Tinybird schema because it rejects event types other than `page_view` and `session_start`.
- Tinybird sessions currently report all sessions as new visitors, while E2E fixtures can distinguish returning visitors through `is_returning`. The MCP service must match the existing dashboard semantics rather than silently redefining sessions.
- `dashboardUrlForProject` is private to `projects.ts`; analytics tools need a shared URL helper for dashboard, overview, live, and sessions URLs.

No legacy migration is required. The main risk is semantic drift between dashboard routes and MCP responses if the analytics queries are duplicated.

## Technical Decisions

### Decision 1: Reuse Existing MCP OAuth Scope

Use the existing `mcp:install` OAuth scope as the v1 MCP install/read authority. Do not introduce `mcp:analytics:read` in this feature.

Rationale: existing OAuth client registration accepts exactly one scope, existing Codex MCP install tokens use `mcp:install`, and the product requirement says the same Tally MCP connection should authorize read tools without a second account login. A dedicated read scope can be added later as an auth migration.

Implementation notes:

- Keep `apps/web/app/api/mcp/route.ts` `requiredScopes: [MCP_INSTALL_SCOPE]`.
- Keep `verifyMcpBearerToken` resource validation unchanged.
- In copy and comments, describe `mcp:install` as the v1 install/read authority.
- Return `unauthorized` only for missing/invalid tokens, wrong resource, expired tokens, or insufficient authority.

### Decision 2: No SDK Or Ingestion Expansion

Do not add custom tracking APIs, SDK exports, or ingestion validation changes in this feature.

Rationale: the feature is read-only analytics querying. `suggest_next_events` can recommend `signup_completed` or similar events, but creating and ingesting those events is a later pending-task or instrumentation feature.

Implication: production data will usually contain `page_view` and `session_start` only until a future feature adds custom events. `get_paths_to_event` must still work for any observed `event_type` in Tinybird or fixtures, but it will commonly return `insufficient_data` for signup questions today.

### Decision 3: Shared Analytics Service Layer

Create shared analytics services under `apps/web/lib/analytics/` and make both dashboard routes and MCP tools call them.

Recommended modules:

- `apps/web/lib/analytics/periods.ts`: `Period`, `parsePeriod`, `resolveDataWindow`, and date formatting helpers.
- `apps/web/lib/analytics/urls.ts`: dashboard URL builders and safe URL/path stripping.
- `apps/web/lib/analytics/project-access.ts`: owned project lookup and project-not-found behavior.
- `apps/web/lib/analytics/tinybird.ts`: safe Tinybird SQL helpers, string escaping, query wrapper, and safe error mapping.
- `apps/web/lib/analytics/service.ts`: overview, sessions, live events, top pages, top referrers, event discovery, event schema, paths-to-event, and recommendations.
- `apps/web/lib/analytics/types.ts`: shared response unions, provenance types, metric types, and recommendation types.

The HTTP API routes should adapt service results back to their existing dashboard JSON shapes. MCP tools should return the richer service response with provenance.

### Decision 4: Typed Tools, No Free-Form Query Endpoint

Expose typed MCP tools only. Do not expose arbitrary SQL, Tinybird query access, or a natural-language endpoint.

External MCP pattern check:

- PostHog exposes schema discovery and typed query wrappers such as funnel, paths, retention, stickiness, and trends tools. Tally v1 should mirror discovery plus typed query wrappers, not the broad escape hatches.
- Datadog exposes a broad MCP tool catalog and documents governance concerns such as context efficiency and audit tracking. Tally should keep the v1 surface compact.
- Amplitude's MCP docs and marketplace describe chart/dashboard and instrumentation-oriented skills. Tally should defer chart/dashboard creation and event instrumentation to later workstreams.

Sources: [PostHog MCP docs](https://posthog.com/docs/model-context-protocol), [Datadog MCP docs](https://docs.datadoghq.com/bits_ai/mcp_server/), [Amplitude MCP docs](https://amplitude.com/docs/amplitude-ai/amplitude-mcp).

## Data Model

No database migrations are required.

Existing reads:

- `users`, through OAuth token records.
- `oauth_access_tokens`, through existing MCP auth.
- `projects`, filtered by `userId`.
- Tinybird `events`.
- Local `.e2e-fixtures/*/events.json` and `.jsonl` files when `E2E_TEST_MODE=1`.

New durable tables: none.

New writes: none from MCP analytics tools.

Rollback: remove analytics tool registration and shared service calls. No schema rollback needed.

## Project Access And Resolution

Add read-only query helpers in `apps/web/lib/db/queries/projects.ts` or a sibling `project-access.ts`:

```ts
export type OwnedAnalyticsProject = {
  id: string;
  userId: string;
  displayName: string;
  source: "github_app" | "mcp_codex";
  status: string;
  lastEventAt: Date | null;
  mcpFingerprint: string | null;
  mcpNormalizedGitRemote: string | null;
  mcpRepoName: string | null;
  mcpAppRoot: string | null;
  mcpPackageManager: string | null;
};
```

Required helpers:

- `listOwnedAnalyticsProjects({ userId, limit })`
- `getOwnedAnalyticsProject({ userId, projectId })`
- `resolveOwnedMcpProjectForRepoContext({ userId, repo })`
- `dashboardUrlsForProject(projectId)`

`resolve_project` input should include repo/app identity only, never source files:

```ts
type ResolveProjectRepoInput = {
  name?: string;
  packageName?: string;
  gitRemote?: string | null;
  workspaceRoot?: string;
  appRoot?: string;
  packageManager?: "pnpm" | "npm" | "yarn" | "bun";
};
```

`packageName` is optional because some agents may not have parsed the target `package.json`. When `gitRemote` is absent, the agent should send `packageName` if available. If it is absent, resolution falls back to `repo.name`; this has reduced match fidelity and should be reflected in `match.confidence`.

`resolve_project` behavior:

1. Validate that at least one of `repo.gitRemote` or `repo.name` is present.
2. Validate `workspaceRoot` and `appRoot` as relative paths that do not contain `..`.
3. Match only projects owned by `userId`.
4. Match only MCP-created projects for automatic repo resolution.
5. Prefer exact fingerprint lookup using `buildMcpProjectFingerprintInput` and `mcpFingerprint`.
6. If exact fingerprint lookup has no result, run a legacy/broad candidate lookup:
   - with `gitRemote`: owned MCP projects with the same normalized remote and `appRoot`
   - without `gitRemote`: owned MCP projects with the same `appRoot` and matching `mcpRepoName`, `displayName`, `repo.name`, or `packageName`
7. Return `ok` only when the best lookup produces exactly one owned match.
8. Return `no_match` when no lookup produces a match.
9. Return `multiple_matches` with at most 10 owned candidates when a broad lookup produces more than one plausible owned project.
10. Never create or update a project.

Exact fingerprint matches should normally be unique because of the existing partial unique index. `multiple_matches` exists for no-remote ambiguity, legacy rows without fingerprints, and corrupted or manually repaired data, not as the expected result of the unique fingerprint query.

For a supplied project id, every analytics service must call `getOwnedAnalyticsProject` before querying Tinybird or fixtures. Return `project_not_found` for both nonexistent projects and projects owned by another user.

## Analytics Service Contracts

### Shared Types

Every project-specific MCP response includes:

```ts
type AnalyticsProvenance = {
  projectName: string;
  generatedAt: string;
  dataWindow?: {
    period: "24h" | "7d" | "30d";
    start: string;
    end: string;
    timezone: "UTC";
    dataThrough: string;
  };
  queryBasis: {
    tool: string;
    semantics:
      | "dashboard_overview"
      | "dashboard_sessions"
      | "dashboard_live"
      | "event_discovery"
      | "event_schema"
      | "paths_to_event"
      | "next_event_recommendations";
  };
};
```

For v1, use rolling UTC windows. `dataThrough` should be the resolved window end because the app does not currently maintain a Tinybird ingestion watermark. Include `lastEventAt` separately when useful.

### Status Mapping

Domain success statuses that must not set `isError`:

- `ok`
- `no_projects`
- `no_events`
- `partial_data`
- `insufficient_data`
- `no_match`
- `multiple_matches`

Tool execution error statuses that should set `isError: true`:

- `invalid_period`
- `invalid_limit`
- `invalid_since`
- `invalid_goal`
- `invalid_event_name`
- `invalid_steps`
- `invalid_repo_context`
- `project_not_found`
- `unauthorized`
- `service_error`

`service_error` must not include Tinybird credentials, raw SQL, bearer tokens, stack traces, or request headers.

### Sanitization

All analytics strings are untrusted because they can originate from user apps.

Required sanitizers:

- Strip query strings and fragments from paths and URLs before summaries.
- Convert referrers to hostnames where possible.
- Bound returned strings to 256 characters unless the tool field limit is smaller.
- Do not include raw `user_id`, `visitor_id`, OAuth tokens, Tinybird tokens, GitHub tokens, billing fields, or private source content.
- Escape or avoid interpolating event names, paths, referrers, and `goal` text in a way that could become agent instructions.

### Dashboard Semantics

The service must preserve current dashboard behavior:

- Overview page views, sessions, top pages, top referrers, percent changes, and time series match the existing overview API.
- Sessions match the existing sessions API. In Tinybird mode, returning visitors remain `0` until the dashboard route changes.
- Live events match existing ordering, `limit`, `since`, timestamp normalization, and `hasMore`.
- Top pages and top referrers should be thin wrappers around overview semantics.

The dashboard HTTP route response shapes do not gain MCP provenance fields in this feature.

## MCP Tool Implementation

Create:

- `apps/web/lib/mcp/tools/auth.ts`: shared `userIdFromAuth(extra.authInfo)` helper.
- `apps/web/lib/mcp/tools/analytics-schemas.ts`: Zod input/output schemas and reusable status enums.
- `apps/web/lib/mcp/tools/analytics.ts`: tool registration and `toAnalyticsToolResult`.

Register analytics tools from `registerTallyMcpTools(server)` after the smoke tool and install tool.

Every analytics tool registration must include:

```ts
annotations: {
  readOnlyHint: true,
  openWorldHint: false
}
```

Use `outputSchema` because the installed MCP SDK supports it.

### Validation Matrix

Use these exact bounds in handler/service validation. For fields that have documented `invalid_*` statuses, do not enforce these bounds as strict Zod input-schema constraints that would prevent the handler from running.

| Tool | Required inputs | Defaults | Bounds and invalid status |
|------|-----------------|----------|---------------------------|
| `list_projects` | none | `limit: 20` | `limit` integer 1-100, else `invalid_limit` |
| `resolve_project` | `repo.gitRemote` or `repo.name` | `workspaceRoot: "."`, `appRoot: "."` | `packageName` optional; relative paths only, no `..`, no file contents, else `invalid_repo_context` |
| `list_events` | `projectId`, `period` | `limit: 50` | `period` in `24h`/`7d`/`30d`; `limit` integer 1-100 |
| `get_event_schema` | `projectId`, `eventName`, `period` | `limit: 50` | `eventName` string 1-128 chars; `limit` integer 1-100 |
| `get_paths_to_event` | `projectId`, `targetEvent`, `period` | `maxSteps: 5`, `limit: 10` | `targetEvent` string 1-128 chars; `maxSteps` integer 1-10; `limit` integer 1-50 |
| `get_project_overview` | `projectId`, `period` | none | `period` in `24h`/`7d`/`30d`, else `invalid_period` |
| `get_live_events` | `projectId` | `limit: 20` | `limit` integer 1-100; `since` must parse as a valid date when present |
| `get_sessions_summary` | `projectId`, `period` | none | `period` in `24h`/`7d`/`30d`, else `invalid_period` |
| `get_top_pages` | `projectId`, `period` | `limit: 10` | `limit` integer 1-50 |
| `get_top_referrers` | `projectId`, `period` | `limit: 10` | `limit` integer 1-50 |
| `suggest_next_events` | `projectId`, `period` | none | `goal` optional string 1-200 chars, else `invalid_goal` |

Every output schema must include `status` as a bounded enum plus the fields required for that status in `FEATURE_SPEC.md`. Prefer Zod discriminated unions when practical. If the MCP SDK rejects a complex discriminated union as an output schema, use a root Zod object with required common fields and narrow status-specific fields in service tests.

For recoverable user input errors, input schemas must be permissive enough for the handler to run and return the structured `invalid_*` statuses required by the feature spec. Do not use strict Zod enums or numeric bounds for fields whose invalid value has a documented MCP status. Instead:

- Accept raw values for `period`, `limit`, `since`, `goal`, `eventName`, `targetEvent`, `maxSteps`, and repo path fields.
- Parse and validate those values inside the handler or analytics service.
- Return structured `invalid_period`, `invalid_limit`, `invalid_since`, `invalid_goal`, `invalid_event_name`, `invalid_steps`, or `invalid_repo_context` results with `isError: true`.
- Allow SDK-level validation errors only for malformed non-object payloads or missing tool argument containers that cannot be recovered into a documented domain status.

### Event Matching Contract

MCP tools do exact event-name reads. They do not accept a fuzzy term such as `signup` and silently select one event. The agent may use `list_events` to discover plausible names, but Tally returns only observed names and recommendations.

Implementation requirements:

- `list_events` returns exact observed event names.
- `get_event_schema` and `get_paths_to_event` require exact `eventName` or `targetEvent`.
- If multiple signup-like events exist, Tally exposes the candidates through `list_events`; the agent asks the user which event represents the goal.
- Recommendation code can suggest canonical event names, but it must not rewrite a tool input to a different observed event.

### Tool List

Implement the tools from `FEATURE_SPEC.md` exactly:

- `list_projects`
- `resolve_project`
- `list_events`
- `get_event_schema`
- `get_paths_to_event`
- `get_project_overview`
- `get_live_events`
- `get_sessions_summary`
- `get_top_pages`
- `get_top_referrers`
- `suggest_next_events`

`toAnalyticsToolResult(result)` should:

1. Put the full result in `structuredContent`.
2. Put `result.summary` or a generated compact fallback in `content[0].text`.
3. Set `isError` only for the error statuses listed above.

If `extra.authInfo.extra.userId` is missing despite route auth, return:

```json
{
  "status": "unauthorized",
  "summary": "Authentication is required before querying Tally analytics."
}
```

## Tool-Specific Query Design

### `list_projects`

Read `projects` for the authenticated `userId`, ordered by `createdAt desc`, then `id asc`, limited to 1 through 100.

Return only:

- id
- name
- status
- source
- dashboard URLs
- lastEventAt

Do not return GitHub installation ids, repo ids, OAuth data, billing fields, or fingerprints.

### `resolve_project`

Use the MCP fingerprint helper and owned-project filtering described above. Return no source file content, no environment data, and no raw fingerprint in the result.

### `get_project_overview`

Use `getProjectOverview({ userId, projectId, period })`.

In MCP response:

- `status: "no_events"` when current-window page views and sessions are both zero.
- `metrics` mirrors dashboard overview values.
- Include `dashboardUrl` and `overviewUrl`.
- Include provenance with `queryBasis.semantics: "dashboard_overview"`.

### `get_sessions_summary`

Use `getSessionsSummary({ userId, projectId, period })`.

In MCP response:

- `status: "no_events"` when total sessions is zero.
- Include `dashboardUrl` and `sessionsUrl`.
- Include provenance with `queryBasis.semantics: "dashboard_sessions"`.

### `get_live_events`

Use `getLiveEvents({ userId, projectId, limit, since })`.

In MCP response:

- Validate `since` before querying.
- Return `status: "no_events"` when the result has no events.
- Include `relativeTime` if available, but do not require the agent to use it.
- Include `dashboardUrl` and `liveUrl`.

### `get_top_pages` And `get_top_referrers`

Use overview service results and slice to the requested limit. Do not issue separate Tinybird queries unless the shared overview service exposes a cheaper dedicated path later.

### `list_events`

For Tinybird:

- Query by owned `project_id` and data window.
- Group by `event_type`.
- Return count, first seen, last seen, and safe common property names.
- Limit event types to the requested limit.

Safe common property names:

- `sessionId`
- `path`
- `url`
- `referrer`
- `screenWidth`
- `country`
- `city`
- `engagementTimeMs`
- `scrollDepth`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmTerm`
- `utmContent`
- `ctaClicks`

Do not include `user_id` or `visitor_id` in common properties.

Normalize source column names to these MCP output names:

| Source field | MCP property name | Example values allowed |
|--------------|-------------------|------------------------|
| `session_id` | `sessionId` | No |
| `path` | `path` | Yes, stripped and bounded |
| `url` | `url` | Yes, stripped and bounded |
| `referrer` | `referrer` | Yes, hostname or stripped URL |
| `screen_width` | `screenWidth` | Yes |
| `country` | `country` | Yes |
| `city` | `city` | Yes |
| `engagement_time_ms` | `engagementTimeMs` | Yes |
| `scroll_depth` | `scrollDepth` | Yes |
| `utm_source` | `utmSource` | Yes |
| `utm_medium` | `utmMedium` | Yes |
| `utm_campaign` | `utmCampaign` | Yes |
| `utm_term` | `utmTerm` | Yes |
| `utm_content` | `utmContent` | Yes |
| `cta_clicks` | `ctaClicks` | Yes, parsed or bounded string |

For E2E fixtures:

- Broaden `ParsedFixtureEvent.event_type` to `string`.
- Keep page/session aggregations behavior for dashboard-compatible tools.
- Event discovery should consider every parsed event type.

### `get_event_schema`

For one exact `eventName`:

- Return `insufficient_data` when no matching events exist in the selected period.
- Return observed counts per safe property.
- Return bounded example values only for non-identifier fields.
- Use empty `exampleValues` for `sessionId`.
- Never return `user_id` or `visitor_id` values.

Caps:

- At most 50 properties per event schema response.
- At most 3 example values per property.
- At most 128 characters per example value after sanitization.
- At most 256 characters per property name after normalization, though the known property map should keep names much shorter.

### `get_paths_to_event`

Algorithm:

1. Validate target event and period.
2. Query target events for the owned project and data window.
3. If no target events exist, return `insufficient_data` and suggested events.
4. Query page views in the same sessions before each target event.
5. For each target event, take up to `maxSteps` preceding page-view paths, ordered oldest to newest.
6. Group identical sequences and count target events per sequence.
7. Sort by count desc, then sequence string asc, and return up to `limit`.
8. Compute coverage:
   - `targetEventTotal`
   - `targetEventsWithPriorPath`

Status rules:

- `ok` when target events exist, target-event count is at least 5, and coverage is at least 50%.
- `partial_data` when target events exist but count is below 5 or coverage is below 50%.
- `insufficient_data` when the target event is absent.
- `no_events` when the project has no events in the period.

Query caps:

- Cap target events considered at 1,000 per call.
- Cap raw page-view rows used for path reconstruction at 10,000 per call.
- If a cap is hit, return `partial_data` with a limitation explaining that the result is capped.

### `suggest_next_events`

Use deterministic heuristics only. Do not add an LLM dependency.

Inputs:

- project id
- period
- optional `goal` string

Service steps:

1. Query overview and event discovery for the same data window.
2. If no events exist, return `no_events`, empty recommendations, and `createsPendingTasks: false`.
3. Build evidence from top pages, referrers, session/page-view counts, and observed event names.
4. Match common goal terms to canonical event recommendations:
   - signup/account: `signup_started`, `signup_completed`
   - onboarding: `onboarding_started`, `onboarding_completed`
   - pricing/CTA: `pricing_cta_clicked`
   - checkout/payment: `checkout_started`, `checkout_completed`
   - activation/feature usage: `feature_used`
5. Suppress recommendations for event names already observed.
6. Return `partial_data` when current page/session data provides evidence but missing lifecycle events prevent a complete answer.
7. Return `insufficient_data` when the goal cannot be connected to observed pages/events.
8. Always return `createsPendingTasks: false`.

## API And Endpoint Changes

No new public HTTP endpoints.

Modified internal behavior:

- Dashboard analytics API routes call shared services.
- MCP tool registration exposes analytics read tools.
- E2E scenario fixtures can include custom event names for local analytics querying tests.

Public dashboard API response shapes remain unchanged.

## Tests

### Unit And Integration Tests

Add or update:

- `apps/web/tests/mcp-analytics-tools.test.ts`
  - all tools registered
  - schemas present
  - `readOnlyHint: true`
  - missing auth returns `unauthorized`
  - domain statuses map to `isError` correctly
- `apps/web/tests/mcp-project-queries.test.ts`
  - exact MCP fingerprint match
  - no match
  - multiple matches
  - malformed repo context
  - another user's matching project is not returned
- `apps/web/tests/analytics-service-overview.test.ts`
  - overview output matches existing API semantics
  - no-events status with zero metrics
  - provenance fields
- `apps/web/tests/analytics-service-events.test.ts`
  - event discovery for custom event names
  - event schema excludes identifiers and bounds example values
  - ambiguous event candidates are returned as data for the agent, not silently chosen
- `apps/web/tests/analytics-service-paths.test.ts`
  - target event absent returns `insufficient_data`
  - fewer than 5 target events returns `partial_data`
  - coverage below 50% returns `partial_data`
  - common path sequences aggregate correctly
- `apps/web/tests/analytics-service-recommendations.test.ts`
  - signup goal recommends missing signup events
  - observed events are not recommended again
  - no-events returns empty recommendations
  - `createsPendingTasks` is always false
- Existing route tests for overview, sessions, and live remain passing after refactor.
- `apps/web/tests/e2e-analytics-fixtures.test.ts`
  - parser accepts custom event types
  - dashboard-compatible aggregations still only count page/session events where appropriate
- `apps/web/tests/e2e-scenarios.test.ts`
  - scenario contract permits custom analytics event types.

### Scenario Fixtures

Add:

- `apps/web/e2e/scenarios/mcp-active-with-signup-events.json`
  - MCP project with `page_view`, `session_start`, and `signup_completed`.
  - At least 5 target events.
  - At least 50% target events with prior page paths.
- `apps/web/e2e/scenarios/mcp-active-partial-signup-data.json`
  - MCP project with target event count below 5 or low prior-path coverage.
- `apps/web/e2e/scenarios/mcp-multiple-projects.json`
  - One user with two MCP projects to verify resolve/list behavior.
  - This is a legacy/broad-match ambiguity fixture. It may use `mcpFingerprint: null` or deliberate non-matching fingerprints for the ambiguous projects so the resolver tests broad candidate matching rather than exact unique fingerprint lookup.
  - Update `apps/web/scripts/seed-e2e-scenario.mjs` and `apps/web/tests/e2e-scenarios.test.ts` to allow the null/non-matching fingerprint only for this explicit scenario.

Reuse existing:

- `mcp-active-with-events`
- `mcp-active-no-events`

### Flow Harness

Add package script:

```json
"e2e:mcp-analytics-querying": "node ./scripts/mcp-analytics-querying-self-test.mjs"
```

The script should:

1. Seed deterministic MCP scenarios.
2. Start `apps/web` with `E2E_TEST_MODE=1` and local fixture directory.
3. Create a local OAuth access token for the seeded user and `http://localhost:3000/api/mcp` resource.
4. Connect through the MCP SDK `Client` and `StreamableHTTPClientTransport` with the bearer token.
5. Call real MCP tools, not internal service functions.
6. Assert the conversational tool sequences:
   - usage summary: `resolve_project` then `get_project_overview`
   - signup path: `list_events` then `get_paths_to_event`
   - missing signup: `list_events` then `suggest_next_events`
   - no events: overview/live/session tools return explicit no-events statuses
7. Clean OAuth rows, projects, and temp fixtures after the run.

This harness does not need to retest browser OAuth because `apps/web/scripts/mcp-self-test.mjs` already covers MCP OAuth and install. It must prove analytics data retrieval works through the MCP transport and auth middleware.

## Regression Risks And Mitigations

| Risk | Mitigation |
|------|------------|
| Dashboard API semantics change during refactor | Keep existing route tests as golden tests; adapt service to routes, not routes to MCP. |
| Existing MCP install flow breaks | Do not modify `prepare_nextjs_install_patch`; keep `mcp-route.test.ts` install assertions. |
| OAuth clients lose access if scope changes | Do not add scope migration in v1; keep `mcp:install`. |
| Analytics tools leak another user's project | Every service starts with owned project lookup; test another-user project id. |
| Custom event fixtures break dashboard fixture tests | Broaden parser to strings but keep dashboard aggregations filtering on page/session event names. |
| Tinybird query failure leaks internals | Wrap Tinybird errors and return sanitized `service_error`. |
| Path reconstruction is too expensive | Add query caps and return `partial_data` when capped. |
| Agent receives prompt-injection-like event text | Sanitize and bound event names, paths, referrers, and goal-derived summaries. |

## Migration And Rollback Checklist

- [ ] Data migration required? No.
- [ ] Breaking public API change? No.
- [ ] Dependent services affected? No SDK or events-service change.
- [ ] Feature flag needed? No if tests pass, because tools are authenticated and read-only. A registration toggle can be added only if deployment risk requires it.
- [ ] Rollback plan? Remove analytics tool registration from `server.ts`; dashboard routes can keep shared services if stable.

## Implementation Sequence

1. Add shared analytics primitives: period resolution, URL sanitization, dashboard URL helpers, Tinybird wrapper, and response types.
2. Extract existing overview, sessions, and live dashboard logic into shared analytics services without changing HTTP response shapes.
3. Add read-only project access helpers and `resolveOwnedMcpProjectForRepoContext`.
4. Broaden E2E fixture parsing to accept generic event names and add signup/partial/multiple-project scenarios.
5. Add event discovery, event schema, paths-to-event, and recommendation services with Tinybird and fixture implementations.
6. Add MCP analytics schemas, result shaping, read-only annotations, and tool registration.
7. Add the MCP analytics self-test script and package script.
8. Update `docs/agent-testing.md` with the new harness command.
9. Run unit tests, scenario tests, and the MCP analytics self-test.

## Human Decision Points

No blocking human decision remains for this technical spec.

Recorded assumptions:

- Tally v1 uses the existing `mcp:install` scope for analytics reads.
- Custom event ingestion is out of scope for this feature.
- `resolve_project` only uses MCP-created project fingerprints in v1; agents can fall back to `list_projects` for GitHub-created projects.
- The dedicated flow harness can seed a local OAuth token rather than driving browser OAuth because the onboarding self-test already covers MCP OAuth.
