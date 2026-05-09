# Feature Spec: MCP Analytics Querying

## Status

Planned feature work.

This spec does not supersede other active work in `plans/PLAN_STATUS.md`. The manifest is an orientation aid, not a single-plan execution lock; implement this feature when the human explicitly requests it or marks the workstream active/approved.

## Overview

MCP analytics querying lets a developer ask Tally usage questions conversationally from inside the coding agent that installed Tally.

The MCP server is the agent's trusted data-retrieval layer. The user should be able to ask natural-language questions, while the coding agent selects the right Tally read tools, retrieves scoped analytics data, and synthesizes an answer. Tally should return compact, grounded, agent-readable summaries and structured facts. It should not try to become a prompt-generated dashboard builder in this feature.

The first version should expose authenticated, read-only MCP tools that return compact analytics summaries for projects owned by the authenticated Tally user. Each response should include enough structured data for the agent to answer the user's question, plus dashboard URLs for follow-up inspection in Tally.

The primary user flow this feature must support is:

1. A user discusses an analytics need with their coding agent.
2. Using Tally MCP tools, the agent retrieves scoped data that answers the question or partially answers it.
3. Tally can suggest new events that would make the answer more accurate, complete, or actionable in the future.

In the broader MCP-first product loop:

1. User installs Tally through MCP.
2. User deploys the app and events arrive.
3. User asks the coding agent what users are doing or what they need to understand next.
4. The agent calls Tally MCP read tools.
5. Tally returns scoped analytics summaries, limitations, recommendations, and dashboard links.
6. The agent answers with the retrieved data, states any gaps, and may suggest tracking ideas without writing code or creating pending tasks.

## Problem

After Tally is installed, the user has two separate work surfaces:

- the Tally dashboard for viewing analytics
- the coding agent for deciding what to build or track next

The dashboard already answers usage questions, but developers working in Codex, Claude Code, Cursor, or another MCP-capable coding agent should not need to leave their development loop for every analytics check. They should be able to ask questions such as:

```text
Use Tally Analytics to summarize usage from the last 7 days.
```

```text
Which pages are users visiting before signup?
```

```text
Look at usage and suggest events we should add next.
```

The feature should make Tally useful inside that agent loop without turning the MCP server into a custom dashboard generator or a code-writing automation.

## Users

Primary users:

- Developers who installed Tally through MCP and now want usage answers in their coding agent.
- Solo founders and builders using agent-driven development workflows.
- Developers deciding what event instrumentation to add next.

Secondary users:

- Existing Tally dashboard users who later connect MCP for agent-native querying.
- Agents verifying local scenarios or product states with deterministic analytics fixtures.

## Goals

- Let an authenticated MCP user list only their own Tally projects.
- Let an authenticated MCP user query analytics only for projects they own.
- Support the consultation loop where a user discusses an analytics need with their coding agent and the agent retrieves the best available Tally data.
- Support natural-language analytics questions by exposing composable, typed read tools that agents can choose from.
- Prefer the Tally project that corresponds to the coding agent's current repo and app directory when that match is unambiguous.
- Let agents discover the available event taxonomy before answering event-specific questions.
- Reuse dashboard analytics semantics for overview, live events, sessions, top pages, and top referrers.
- Add a typed path-to-event summary so agents can answer common "what happened before X?" questions when the target event exists.
- Support partial answers by returning available evidence, explicit limitations, and suggested events that would improve future answers.
- Return compact structured summaries with stable JSON fields and one short text summary for agent use.
- Include relevant dashboard URLs in every project-specific response.
- Support empty/no-events states with explicit copy and zero-value metrics.
- Validate periods, limits, and project identifiers before running analytics queries.
- Keep v1 read-only, including recommendation-style tools.
- Provide enough local fixture coverage for agents to verify behavior without a human GitHub account.

## Non-Goals

- No prompt-generated dashboards.
- No custom report builder.
- No cross-project account-wide analytics in v1.
- No free-form natural-language query endpoint in Tally. The agent interprets the prompt and calls typed tools.
- No arbitrary SQL or raw warehouse query tool in v1.
- No raw source-code inspection.
- No repo writes, SDK patch generation, or code edits from analytics querying tools.
- No pending analytics task creation.
- No automatic instrumentation changes from `suggest_next_events`.
- No claim that Tally can answer event-specific questions when the required lifecycle events have not been tracked.
- No GitHub App requirement.
- No exposure of raw OAuth tokens, Tinybird tokens, private source files, or unrelated project metadata.

## Core User Experience

### Conversational Agent Model

The user asks the coding agent natural-language analytics questions. The MCP server should not accept an unbounded prompt and decide what to query. Instead:

1. The user describes what they want to understand, such as signup behavior, traffic quality, launch performance, or missing instrumentation.
2. The agent resolves the current Tally project from the current repo/app context when possible, or discovers the user's projects when needed.
3. The agent discovers event names and available properties when the question depends on a tracked lifecycle event.
4. The agent chooses one or more typed read tools.
5. Tally returns bounded structured data, compact summaries, explicit limitations, recommendations, and dashboard URLs.
6. The agent synthesizes the final answer in the conversation.

If the available Tally data fully answers the question, the relevant tool should return `ok`. If the data gives useful evidence but cannot fully answer the question, the tool should return `partial_data` with available evidence, limitations, and suggested events. If the available Tally data cannot answer the user's question at all, the tools should return `insufficient_data` and, where useful, suggested events that would make the question answerable later. The agent must not invent an answer from top pages or referrers when the required target event is absent.

### Project Selection From Current Repo

In the common case, a Tally project corresponds to the app/repository directory the user and coding agent are currently working in. The agent should use that local context as the default project-selection signal before asking the user to choose a project.

The MCP server cannot inspect the local filesystem directly. To resolve the project, the agent should send a minimal repo/app fingerprint to Tally:

- normalized git remote URL when available
- repo or package name
- workspace root
- app root
- package manager when known

Tally should match only projects owned by the authenticated MCP user and should use the same durable fingerprint concepts as MCP install project reuse:

1. Prefer exact normalized git remote URL plus app root.
2. If no git remote is available, match only MCP-created projects for the same user, repo/package name, and app root.
3. Select the project only when exactly one owned project matches.
4. Return no match when nothing matches.
5. Return multiple matches when more than one project matches, so the agent can ask the user to choose.
6. Never create a new project from analytics querying tools.

If project resolution is unambiguous, the agent should use that project id for follow-up analytics tools. If resolution is ambiguous or unavailable, the agent should call `list_projects` and ask the user which project to analyze.

### Agent Decision Guide

| User prompt shape | Recommended tool sequence | Expected answer behavior |
|-------------------|---------------------------|--------------------------|
| "Summarize usage from the last 7 days" | `resolve_project` when repo context is available, then `get_project_overview` | Answer with traffic/session summary, top pages/referrers, exact time window, and dashboard URL |
| "Is data coming in?" | `resolve_project`, then `get_live_events` | Answer with recent event status or waiting-for-first-event state |
| "What pages are people visiting?" | `resolve_project`, then `get_top_pages` | Answer with ranked pages and period |
| "Where is traffic coming from?" | `resolve_project`, then `get_top_referrers` | Answer with ranked referrers and period |
| "Which pages are users visiting before signup?" | `resolve_project`, `list_events`, optionally `get_event_schema`, then `get_paths_to_event` | Answer with observed pre-signup paths when a target event exists; otherwise state the gap and suggest events |
| "Look at usage and suggest events we should add next" | `resolve_project`, `get_project_overview`, `list_events`, then `suggest_next_events` | Return evidence, limitations, and event recommendations without creating tasks |
| Multiple matching projects | `resolve_project`, then `list_projects` if needed | Ask the user to choose rather than guessing |

### Happy Path: Usage Summary

1. User has the Tally MCP server configured and authenticated.
2. User has at least one Tally project with analytics events.
3. User asks:

   ```text
   Use Tally Analytics to summarize usage from the last 7 days.
   ```

4. Agent calls `resolve_project` with current repo/app context when available, or `list_projects` if it needs the user to select a project.
5. Agent calls `get_project_overview` with the resolved project and `period: "7d"`.
6. Tally validates the bearer token, resolves the authenticated user, confirms project ownership, validates the period, and queries analytics using the same semantics as the dashboard overview route.
7. Tally returns page views, sessions, top pages, top referrers, the selected period, a short natural-language summary, and dashboard URLs.
8. Agent answers the user using the returned data and links back to Tally for deeper inspection.

### Happy Path: Page Behavior Before Signup

1. User asks:

   ```text
   Which pages are users visiting before signup?
   ```

2. Agent calls `list_events` to discover whether the project has a signup completion event or similarly named lifecycle event.
3. If a target event exists, the agent calls `get_paths_to_event` with that event name and the selected period.
4. Tally returns the most common page-path sequences observed before the target event, plus coverage counts and dashboard URLs.
5. Agent summarizes the observed paths and notes the exact target event used.
6. If no signup event is present in available analytics data, the agent must not claim to know which pages users visited before signup.
7. The agent may call `suggest_next_events` with `goal: "Understand signup funnel dropoff"` to ask Tally which tracking events would make the question answerable.
8. `suggest_next_events` returns `status: "partial_data"` when current data can partially support the goal, or `status: "insufficient_data"` when Tally cannot answer the goal at all. In both cases, it recommends events that would make the answer more accurate. It must not create pending tasks.

### Empty Project Path

1. User asks for analytics on an installed project with no events.
2. Tally returns a successful read response with `status: "no_events"`, zero-value metrics, and dashboard URLs.
3. The response uses the dashboard waiting-state meaning:

   ```text
   Waiting for first event. Tally is installed, but no production events have been received yet.
   ```

4. Agent explains that Tally is installed but has not received production events yet.

### Unauthorized Project Path

1. User or agent supplies a project ID owned by another Tally user.
2. Tally returns `project_not_found`, the same externally observable result used for a nonexistent project ID.
3. No analytics query runs.

## MCP Tool Set

V1 should expose the following read-only tools.

The tool set should follow the pattern used by mature analytics MCP servers:

- start with project and schema discovery
- prefer typed analytics queries over raw warehouse access
- return compact summaries and structured data
- keep custom dashboard creation and arbitrary query languages out of v1

Every tool must be registered with:

- a short title
- a description that states when the agent should call the tool
- an input schema
- an output schema for the tool's `structuredContent`
- read-only MCP annotations, such as `readOnlyHint: true`, when the MCP library supports them

Every successful tool handler should return an MCP tool result shaped as:

```json
{
  "structuredContent": {
    "status": "ok"
  },
  "content": [
    {
      "type": "text",
      "text": "Compact human-readable summary."
    }
  ]
}
```

For validation and service failures, the tool result should include `isError: true` when the MCP library supports it. Domain states such as `no_projects`, `no_events`, `partial_data`, and `insufficient_data` are not tool execution errors and should not set `isError: true`.

### `list_projects`

Purpose: let the agent discover projects available to the authenticated MCP user.

Inputs:

```json
{
  "limit": 20
}
```

Validation:

- `limit` defaults to 20.
- `limit` must be an integer from 1 through 100.
- Results must be filtered to the authenticated user's projects.
- V1 does not expose pagination. Results are ordered by most recently created project first, then project id ascending for stable ties.

Result shape:

```json
{
  "status": "ok",
  "projects": [
    {
      "id": "proj_123",
      "name": "my-app",
      "status": "active",
      "source": "mcp_codex",
      "dashboardUrl": "https://usetally.xyz/projects/proj_123",
      "overviewUrl": "https://usetally.xyz/projects/proj_123/overview",
      "lastEventAt": "2026-05-09T12:00:00.000Z"
    }
  ]
}
```

Output schema:

- allowed statuses: `ok`, `no_projects`, `invalid_limit`, `unauthorized`, `service_error`
- required for `ok`: `projects`
- required for `no_projects`: `projects: []`

### `resolve_project`

Purpose: resolve the Tally project that corresponds to the coding agent's current repository and app directory.

Inputs:

```json
{
  "repo": {
    "name": "my-app",
    "gitRemote": "git@github.com:user/my-app.git",
    "workspaceRoot": ".",
    "appRoot": "apps/web",
    "packageManager": "pnpm"
  }
}
```

Validation:

- At least one of `gitRemote` or `name` must be present.
- `workspaceRoot` and `appRoot`, when provided, must be relative paths and must not contain `..`.
- The request must not include file contents, environment variables, lockfiles, or arbitrary source code.
- Matching must be filtered to the authenticated user's projects before returning any result.
- `multiple_matches` candidates must be bounded to at most 10 owned projects.
- This tool must not create a project.

Result shape:

```json
{
  "status": "ok",
  "project": {
    "id": "proj_123",
    "name": "my-app",
    "dashboardUrl": "https://usetally.xyz/projects/proj_123",
    "overviewUrl": "https://usetally.xyz/projects/proj_123/overview"
  },
  "match": {
    "basis": "git_remote_and_app_root",
    "confidence": "high"
  },
  "summary": "Matched current repo apps/web to Tally project my-app."
}
```

When no project matches:

```json
{
  "status": "no_match",
  "summary": "No Tally project matched the current repo/app context.",
  "projectsUrl": "https://usetally.xyz/projects"
}
```

When multiple projects match:

```json
{
  "status": "multiple_matches",
  "summary": "Multiple Tally projects matched the current repo/app context. Ask the user which one to analyze.",
  "candidates": [
    {
      "id": "proj_123",
      "name": "my-app",
      "dashboardUrl": "https://usetally.xyz/projects/proj_123"
    }
  ]
}
```

Output schema:

- allowed statuses: `ok`, `no_match`, `multiple_matches`, `invalid_repo_context`, `unauthorized`, `service_error`
- required for `ok`: `project`, `match`, `summary`
- required for `no_match`: `summary`, `projectsUrl`
- required for `multiple_matches`: `summary`, `candidates`

### `list_events`

Purpose: let the agent discover tracked event names before answering event-specific analytics questions.

Inputs:

```json
{
  "projectId": "proj_123",
  "period": "30d",
  "limit": 50
}
```

Validation:

- `period` must be one of `24h`, `7d`, or `30d`.
- `limit` defaults to 50 and must be an integer from 1 through 100.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "period": "30d",
  "summary": "Observed 4 event types in the last 30 days. Most common: page_view.",
  "events": [
    {
      "eventName": "page_view",
      "count": 120,
      "firstSeenAt": "2026-05-01T12:00:00.000Z",
      "lastSeenAt": "2026-05-09T12:00:00.000Z",
      "commonProperties": ["path", "referrer", "sessionId"]
    },
    {
      "eventName": "signup_completed",
      "count": 12,
      "firstSeenAt": "2026-05-02T12:00:00.000Z",
      "lastSeenAt": "2026-05-09T12:00:00.000Z",
      "commonProperties": ["path", "sessionId"]
    }
  ],
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "eventsUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

Output schema:

- allowed statuses: `ok`, `no_events`, `invalid_period`, `invalid_limit`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok` and `no_events`: `projectId`, `period`, `summary`, `events`, `dashboardUrl`, `eventsUrl`
- for `no_events`, `events` must be empty

### `get_event_schema`

Purpose: let the agent inspect available properties for one tracked event before choosing filters, breakdowns, or path-query assumptions.

Inputs:

```json
{
  "projectId": "proj_123",
  "eventName": "signup_completed",
  "period": "30d",
  "limit": 50
}
```

Validation:

- `eventName` must be a string from 1 through 128 characters.
- `period` must be one of `24h`, `7d`, or `30d`.
- `limit` defaults to 50 and must be an integer from 1 through 100.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "eventName": "signup_completed",
  "period": "30d",
  "summary": "signup_completed has 2 observed properties in the last 30 days.",
  "properties": [
    {
      "name": "path",
      "observedCount": 12,
      "exampleValues": ["/signup"]
    },
    {
      "name": "sessionId",
      "observedCount": 12,
      "exampleValues": []
    }
  ],
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "eventsUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

Output schema:

- allowed statuses: `ok`, `no_events`, `insufficient_data`, `invalid_period`, `invalid_limit`, `invalid_event_name`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok`: `projectId`, `eventName`, `period`, `summary`, `properties`, `dashboardUrl`, `eventsUrl`
- `insufficient_data` means the event name is valid but the project has no observed events by that name in the selected period

### `get_paths_to_event`

Purpose: answer common conversational questions about the pages or events users visited before a target event, such as signup, checkout, or onboarding completion.

Inputs:

```json
{
  "projectId": "proj_123",
  "targetEvent": "signup_completed",
  "period": "7d",
  "maxSteps": 5,
  "limit": 10
}
```

Validation:

- `targetEvent` must be a string from 1 through 128 characters.
- `period` must be one of `24h`, `7d`, or `30d`.
- `maxSteps` defaults to 5 and must be an integer from 1 through 10.
- `limit` defaults to 10 and must be an integer from 1 through 50.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "targetEvent": "signup_completed",
  "period": "7d",
  "summary": "The most common observed path before signup_completed was /pricing -> /signup, with 8 matching conversions.",
  "paths": [
    {
      "sequence": ["/pricing", "/signup"],
      "targetEventCount": 8,
      "percentage": 66.67
    }
  ],
  "coverage": {
    "targetEventTotal": 12,
    "targetEventsWithPriorPath": 10
  },
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "overviewUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

If the target event has been observed but Tally can only partially answer the user's likely question, such as when only a small share of target events have a prior page path, the tool should return `partial_data` with the available paths, limitations, and suggested events when relevant.

If the target event has not been observed, the tool should return:

```json
{
  "status": "insufficient_data",
  "projectId": "proj_123",
  "targetEvent": "signup_completed",
  "period": "7d",
  "summary": "No signup_completed events were observed in the last 7 days, so Tally cannot summarize pages before signup.",
  "paths": [],
  "coverage": {
    "targetEventTotal": 0,
    "targetEventsWithPriorPath": 0
  },
  "limitations": [
    "The target signup event has not been observed in this period."
  ],
  "suggestedEvents": [
    {
      "eventName": "signup_completed",
      "reason": "Needed to answer which pages users visit before signup.",
      "priority": "high"
    }
  ],
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "overviewUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

Output schema:

- allowed statuses: `ok`, `partial_data`, `no_events`, `insufficient_data`, `invalid_period`, `invalid_limit`, `invalid_event_name`, `invalid_steps`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok`, `partial_data`, `no_events`, and `insufficient_data`: `projectId`, `targetEvent`, `period`, `summary`, `paths`, `coverage`, `dashboardUrl`, `overviewUrl`
- for `ok`, `paths` may still be empty if target events exist but no prior page path can be associated with them
- for `partial_data`, `limitations` must explain why the answer is incomplete
- for `insufficient_data`, `suggestedEvents` should be present when Tally can infer a missing lifecycle event from the target event name

### `get_project_overview`

Purpose: return the same high-level metrics used by the dashboard overview page.

Inputs:

```json
{
  "projectId": "proj_123",
  "period": "7d"
}
```

Validation:

- `period` must be one of `24h`, `7d`, or `30d`.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "period": "7d",
  "summary": "30 page views and 5 sessions in the last 7 days. Top page: /docs. Top referrer: Direct.",
  "metrics": {
    "pageViews": {
      "total": 30,
      "change": 100,
      "timeSeries": [
        { "date": "2026-05-08", "count": 10 }
      ]
    },
    "sessions": {
      "total": 5,
      "change": -50
    },
    "topPages": [
      { "path": "/docs", "views": 20, "percentage": 66.67 }
    ],
    "topReferrers": [
      { "referrer": "Direct", "count": 5, "percentage": 100 }
    ]
  },
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "overviewUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

Output schema:

- allowed statuses: `ok`, `no_events`, `invalid_period`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok` and `no_events`: `projectId`, `period`, `summary`, `metrics`, `dashboardUrl`, `overviewUrl`
- for `no_events`, metric totals must be `0`, change values must be `0`, and arrays must be empty

### `get_live_events`

Purpose: return a bounded recent event feed for quick debugging and "is anything coming in?" questions.

Inputs:

```json
{
  "projectId": "proj_123",
  "limit": 20,
  "since": "2026-05-09T12:00:00.000Z"
}
```

Validation:

- `limit` defaults to 20.
- `limit` must be an integer from 1 through 100.
- `since`, when provided, must parse as a valid date.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "events": [
    {
      "eventType": "page_view",
      "path": "/docs",
      "referrer": "https://example.com",
      "timestamp": "2026-05-09T12:00:00.000Z"
    }
  ],
  "hasMore": false,
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "liveUrl": "https://usetally.xyz/projects/proj_123"
}
```

The response should avoid returning internal row ids unless they are already safe, non-sensitive event identifiers.

Output schema:

- allowed statuses: `ok`, `no_events`, `invalid_limit`, `invalid_since`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok` and `no_events`: `projectId`, `events`, `hasMore`, `dashboardUrl`, `liveUrl`
- for `no_events`, `events` must be empty and `hasMore` must be `false`

### `get_sessions_summary`

Purpose: return session counts and time series for the selected period using dashboard sessions semantics.

Inputs:

```json
{
  "projectId": "proj_123",
  "period": "7d"
}
```

Validation:

- `period` must be one of `24h`, `7d`, or `30d`.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "period": "7d",
  "summary": "5 sessions in the last 7 days.",
  "sessions": {
    "totalSessions": 5,
    "newVisitors": 5,
    "returningVisitors": 0,
    "timeSeries": [
      { "date": "2026-05-08", "newSessions": 5, "returningSessions": 0 }
    ]
  },
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "sessionsUrl": "https://usetally.xyz/projects/proj_123/sessions"
}
```

Output schema:

- allowed statuses: `ok`, `no_events`, `invalid_period`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok` and `no_events`: `projectId`, `period`, `summary`, `sessions`, `dashboardUrl`, `sessionsUrl`
- for `no_events`, session totals must be `0` and `timeSeries` must be empty

### `get_top_pages`

Purpose: return top pages for a project and period without requiring the agent to parse the full overview response.

Inputs:

```json
{
  "projectId": "proj_123",
  "period": "7d",
  "limit": 10
}
```

Validation:

- `period` must be one of `24h`, `7d`, or `30d`.
- `limit` defaults to 10 and must be an integer from 1 through 50.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "period": "7d",
  "pages": [
    { "path": "/docs", "views": 20, "percentage": 66.67 }
  ],
  "summary": "/docs received 20 views, 66.67% of page views in the period.",
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "overviewUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

Output schema:

- allowed statuses: `ok`, `no_events`, `invalid_period`, `invalid_limit`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok` and `no_events`: `projectId`, `period`, `pages`, `summary`, `dashboardUrl`, `overviewUrl`
- for `no_events`, `pages` must be empty

### `get_top_referrers`

Purpose: return top referrers for a project and period without requiring the agent to parse the full overview response.

Inputs:

```json
{
  "projectId": "proj_123",
  "period": "7d",
  "limit": 10
}
```

Validation:

- `period` must be one of `24h`, `7d`, or `30d`.
- `limit` defaults to 10 and must be an integer from 1 through 50.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "ok",
  "projectId": "proj_123",
  "period": "7d",
  "referrers": [
    { "referrer": "Direct", "count": 5, "percentage": 100 }
  ],
  "summary": "Direct was the top referrer with 5 page views.",
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "overviewUrl": "https://usetally.xyz/projects/proj_123/overview"
}
```

Output schema:

- allowed statuses: `ok`, `no_events`, `invalid_period`, `invalid_limit`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok` and `no_events`: `projectId`, `period`, `referrers`, `summary`, `dashboardUrl`, `overviewUrl`
- for `no_events`, `referrers` must be empty

### `suggest_next_events`

Purpose: suggest useful analytics events to add next based on current observed usage and missing common lifecycle signals.

Inputs:

```json
{
  "projectId": "proj_123",
  "period": "7d",
  "goal": "Understand signup funnel dropoff"
}
```

Validation:

- `period` must be one of `24h`, `7d`, or `30d`.
- `goal` is optional and must be a string of 1 through 200 characters when provided.
- `projectId` must belong to the authenticated user.

Result shape:

```json
{
  "status": "partial_data",
  "projectId": "proj_123",
  "period": "7d",
  "summary": "Current data shows page views and sessions but no signup completion event.",
  "evidence": [
    "Pricing and signup pages are receiving traffic.",
    "No signup completion event has been observed."
  ],
  "limitations": [
    "Tally cannot determine which pages users visited before signup without a signup completion event."
  ],
  "recommendations": [
    {
      "eventName": "signup_completed",
      "reason": "Needed to answer which pages users visit before signup.",
      "priority": "high"
    },
    {
      "eventName": "pricing_cta_clicked",
      "reason": "Useful for connecting pricing-page visits to signup intent.",
      "priority": "medium"
    }
  ],
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "createsPendingTasks": false
}
```

This tool must not create, enqueue, or persist pending tasks in v1.

Output schema:

- allowed statuses: `ok`, `partial_data`, `no_events`, `insufficient_data`, `invalid_period`, `invalid_goal`, `project_not_found`, `unauthorized`, `service_error`
- required for `ok`, `partial_data`, `no_events`, and `insufficient_data`: `projectId`, `period`, `summary`, `recommendations`, `dashboardUrl`, `createsPendingTasks`
- `createsPendingTasks` must be `false` for every status
- for `partial_data`, `evidence` and `limitations` must be present
- for `no_events`, `recommendations` must be empty and the summary must say that Tally needs production events before usage-based recommendations are available

## Analytics Semantics

The MCP tools should reuse dashboard analytics semantics wherever possible:

- All period-based tools must resolve the requested period to explicit `start`, `end`, `timezone`, and `dataThrough` values in the response.
- Period calculations should match dashboard semantics. If the dashboard uses rolling windows, MCP should use the same rolling windows. If the dashboard uses calendar windows, MCP should use the same calendar windows. The response must expose the resolved timestamps so the agent does not have to infer them.
- `list_events` should use the same event source and period filtering as dashboard analytics rather than inventing a separate taxonomy store.
- `get_event_schema` should summarize observed properties for one event without returning unbounded raw event rows or raw user identifiers.
- `get_paths_to_event` should use event/session ordering from the analytics pipeline and should report coverage counts so the agent can tell whether the path summary is representative.
- `get_project_overview` should match the dashboard overview API for page views, session totals, top pages, top referrers, time windows, and percentage/change calculations.
- `get_sessions_summary` should match the dashboard sessions API for total sessions, new visitors, returning visitors, and time series.
- `get_live_events` should match the dashboard live feed API for recent event ordering and limit behavior.
- `get_top_pages` and `get_top_referrers` may be thin wrappers around overview query results in v1.

For `get_paths_to_event`, response status should follow these v1 rules:

- Return `ok` when the target event exists and Tally has enough associated prior-path data to answer the question directly.
- Return `partial_data` when the target event exists but the answer is weak or incomplete, including fewer than 5 target-event occurrences in the period, or fewer than 50% of target-event occurrences having an associated prior path.
- Return `insufficient_data` when the target event has not been observed in the selected period.

If the implementation needs new shared query modules, those modules should become the common source for both dashboard routes and MCP tools. The spec does not require preserving the current HTTP API route internals.

## Event Matching

Agents should use exact observed event names whenever possible. Tally should not silently treat a generic term such as "signup" as a specific event when multiple plausible matches exist.

Recommended behavior:

- If `list_events` returns exactly one plausible event for a user term, the agent may use it and should name the exact event in the answer.
- If multiple plausible events exist, such as `signup_started`, `signup_completed`, and `account_created`, the agent should ask the user which event represents the goal or explain the ambiguity.
- If no plausible event exists, the agent should use `suggest_next_events` or the `suggestedEvents` field from a query response.
- Tally recommendations should prefer canonical event names such as `signup_completed`, `onboarding_completed`, `pricing_cta_clicked`, and `checkout_completed` unless the project already uses a different observed naming convention.

## Reference MCP Patterns

Similar analytics and observability MCP servers point to a consistent product shape:

- PostHog exposes schema discovery, typed query wrappers for trends/funnels/paths/retention/stickiness, and SQL as an advanced escape hatch.
- Amplitude emphasizes progressive discovery: get context, list categories, describe a tool, then call it.
- Datadog uses toolsets, permissions, audit logs, response truncation, and response-size controls to keep a broad MCP surface governable.

Tally v1 should adopt the discovery plus typed-query pattern, but not arbitrary SQL or write-capable analytics creation. Progressive discovery or toolset filtering can be a future optimization if the Tally MCP surface grows beyond the compact v1 tool set.

## Authorization And Privacy

Every tool must:

- Require a valid authenticated MCP bearer token.
- Resolve the authenticated Tally user from MCP auth.
- Filter project reads by owner before querying analytics.
- Return `project_not_found` for both nonexistent project IDs and project IDs owned by another user.
- Reserve `unauthorized` for missing or invalid bearer tokens, invalid token resource/audience, or insufficient OAuth authority.
- Avoid returning OAuth tokens, Tinybird credentials, billing data, GitHub installation tokens, private source files, or unrelated project records.
- Avoid logging full analytics payloads when not needed for debugging.
- Treat paths, referrers, event names, and user-supplied goals as untrusted strings.
- Strip query strings and fragments from paths and URLs before placing them in summaries.
- Bound returned path, referrer, event name, and goal-derived strings to 256 characters unless a narrower tool field limit applies.
- Bound property names and example property values before returning them from event schema tools.
- Escape or avoid interpolating untrusted analytics strings in text summaries so an event name, path, or referrer cannot become an instruction to the calling agent.

The product requirement is that analytics read tools are available through the same Tally MCP server connection users configure for install. A user who completed the v1 Tally MCP OAuth flow for install must be able to authorize analytics read tools for the same Tally account and MCP server registration without connecting a separate Tally account or installing the GitHub App. The technical design may add a dedicated analytics read scope to the OAuth grant or include read access in the existing MCP authorization model.

## Response Design

MCP responses should include both structured content and short text content:

- Each registered tool must define an `outputSchema` that validates the `structuredContent` fields documented for that tool.
- Structured content should contain bounded JSON fields with metrics, period, project id, status, summary, and dashboard URLs.
- Project-specific responses should include shared provenance fields: `projectName`, `generatedAt`, `dataWindow`, and `queryBasis`.
- Text content should be compact and suitable for direct agent display.
- `structuredContent` is the authoritative machine-readable result; Tally text content should be display-ready summary text rather than the only copy of the business data.
- Empty responses should be explicit rather than ambiguous.
- Partial responses should be explicit: return the evidence Tally can support, list the limitations, and include recommended events when additional instrumentation would improve the answer.
- Error responses should be structured enough for the agent to recover, for example by asking the user to choose a project or valid period.
- Dashboard URLs should be absolute URLs derived from the configured Tally app base URL. Local E2E mode may use the local app base URL, but the field names and path shapes must remain the same.

Shared provenance shape:

```json
{
  "projectName": "my-app",
  "generatedAt": "2026-05-09T12:00:00.000Z",
  "dataWindow": {
    "period": "7d",
    "start": "2026-05-02T12:00:00.000Z",
    "end": "2026-05-09T12:00:00.000Z",
    "timezone": "UTC",
    "dataThrough": "2026-05-09T11:59:30.000Z"
  },
  "queryBasis": {
    "tool": "get_project_overview",
    "semantics": "dashboard_overview"
  }
}
```

The examples above focus on tool-specific fields. The technical spec should factor these shared provenance fields into every project-specific response schema.

Allowed statuses:

- `ok`
- `no_projects`
- `no_events`
- `partial_data`
- `insufficient_data`
- `invalid_period`
- `invalid_limit`
- `invalid_since`
- `invalid_goal`
- `invalid_event_name`
- `invalid_steps`
- `invalid_repo_context`
- `no_match`
- `multiple_matches`
- `project_not_found`
- `unauthorized`
- `service_error`

Error mapping:

- `ok`, `no_projects`, `no_events`, `partial_data`, `insufficient_data`, `no_match`, and `multiple_matches` are successful domain responses.
- `invalid_period`, `invalid_limit`, `invalid_since`, `invalid_goal`, `invalid_event_name`, `invalid_steps`, `invalid_repo_context`, `project_not_found`, `unauthorized`, and `service_error` should set `isError: true` in the MCP tool result when the library supports it.
- `service_error` must not include Tinybird credentials, raw SQL, bearer tokens, or stack traces.

## Data Persistence

This feature should not require new product data persistence for v1.

The feature reads from:

- existing users and MCP OAuth token records
- existing projects
- existing Tinybird event data
- existing local E2E analytics fixtures when `E2E_TEST_MODE=1`

The feature may add implementation-only shared query modules or tests, but it should not add durable user-facing tables unless a later technical spec identifies a concrete need.

## Integration With Existing Product

This feature extends:

- hosted MCP route at `apps/web/app/api/mcp/route.ts`
- MCP server tool registration under `apps/web/lib/mcp/`
- project ownership queries under `apps/web/lib/db/queries/`
- dashboard analytics APIs under `apps/web/app/api/projects/[id]/analytics/`
- E2E analytics fixture helpers under `apps/web/lib/analytics/e2e-fixtures.ts`
- local scenario files under `apps/web/e2e/scenarios/`

This feature should not modify:

- SDK install patch behavior, except where shared MCP auth helpers must support read tools.
- event ingestion semantics.
- GitHub App onboarding.
- billing flows.
- active MCP onboarding plan files.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| MCP request is unauthenticated | Tool returns/auth layer triggers unauthorized result; no analytics query runs |
| Current repo/app context matches one owned project | `resolve_project` returns `ok` and the agent uses that project for follow-up tools |
| Current repo/app context matches no owned project | `resolve_project` returns `no_match`; agent calls `list_projects` or asks the user to select a project |
| Current repo/app context matches multiple owned projects | `resolve_project` returns `multiple_matches`; agent asks the user which project to analyze |
| Agent sends malformed repo context | `resolve_project` returns `invalid_repo_context` and no project data is returned |
| Token is valid but project belongs to another user | Tool returns `project_not_found`, matching the nonexistent-project response |
| User has no projects | `list_projects` returns `status: "no_projects"` and an empty project list |
| Project exists but has no events | Analytics tools return `status: "no_events"`, zero metrics, and dashboard URLs |
| Invalid period supplied | Tool returns `invalid_period`; no analytics query runs |
| Limit is missing | Tool uses the documented default for that tool |
| Limit is below or above the documented range | Tool returns `invalid_limit`; no analytics query runs |
| `goal` is malformed or too long | `suggest_next_events` returns `invalid_goal`; no analytics query runs |
| `eventName` or `targetEvent` is malformed or too long | Event-specific tool returns `invalid_event_name`; no analytics query runs |
| `maxSteps` is outside the documented range | `get_paths_to_event` returns `invalid_steps`; no analytics query runs |
| `since` is malformed for live events | `get_live_events` returns `invalid_since`; no analytics query runs |
| Tinybird query fails | Tool returns `service_error` without leaking Tinybird credentials or raw query internals |
| E2E fixture mode is enabled | Tool reads deterministic local fixture data using the same scenario semantics as dashboard APIs |
| User asks which pages occurred before signup and signup events exist | Agent can use `list_events` and `get_paths_to_event` to return observed pre-signup paths |
| User asks about signup and multiple plausible signup events exist | Agent identifies the candidate events and asks which one represents signup completion |
| User asks a question that Tally can partially answer with current data | Tool returns `partial_data` with evidence, limitations, and suggested events where applicable |
| User asks for a funnel requiring untracked events | `get_paths_to_event` or `suggest_next_events` returns `insufficient_data` and recommendations for events that would make the question answerable |
| Agent asks `suggest_next_events` to create tasks | Tool returns recommendations only and does not persist pending tasks |

## Acceptance Criteria

- `list_projects` is registered as an authenticated MCP tool.
- `resolve_project` is registered as an authenticated MCP tool.
- `list_events` is registered as an authenticated MCP tool.
- `get_event_schema` is registered as an authenticated MCP tool.
- `get_paths_to_event` is registered as an authenticated MCP tool.
- `get_project_overview` is registered as an authenticated MCP tool.
- `get_live_events` is registered as an authenticated MCP tool.
- `get_sessions_summary` is registered as an authenticated MCP tool.
- `get_top_pages` is registered as an authenticated MCP tool.
- `get_top_referrers` is registered as an authenticated MCP tool.
- `suggest_next_events` is registered as an authenticated MCP tool and is read-only.
- Unauthenticated MCP requests cannot invoke analytics tools.
- Authenticated users can list only projects they own.
- Authenticated users cannot query analytics for projects owned by another user.
- `resolve_project` matches only projects owned by the authenticated user.
- `resolve_project` returns `ok` only when the current repo/app fingerprint matches exactly one owned project.
- `resolve_project` returns `no_match` or `multiple_matches` without leaking another user's projects.
- Malformed repo context returns `invalid_repo_context`.
- `period` validation accepts exactly `24h`, `7d`, and `30d` for period-based tools.
- `limit` validation enforces documented bounds for project listing, event discovery, event schema, path summaries, live events, top pages, and top referrers.
- `eventName` and `targetEvent` validation enforce documented length bounds and reject malformed values.
- `maxSteps` validation enforces documented bounds for path summaries.
- Event discovery returns observed event names, counts, common properties, and dashboard URLs for the selected project and period.
- Event schema returns observed properties and bounded example values for one event without exposing raw event rows.
- Path-to-event summaries return observed path sequences, target-event coverage counts, and dashboard URLs when the target event exists.
- Path-to-event summaries return `partial_data` with supported evidence and limitations when current data partially answers the user's likely question.
- Path-to-event summaries return `partial_data` when fewer than 5 target-event occurrences exist or fewer than 50% of target-event occurrences have associated prior paths.
- Path-to-event summaries return `insufficient_data` with suggested events when the target event has not been observed.
- Event-specific answers name the exact event used.
- Ambiguous event matching is surfaced to the agent instead of silently choosing between multiple plausible lifecycle events.
- Project overview MCP results match dashboard overview semantics for the same project and period.
- Sessions summary MCP results match dashboard sessions semantics for the same project and period.
- Live events MCP results match dashboard live feed semantics for project ownership, ordering, limit, and since filtering.
- Top pages and top referrers results match the corresponding dashboard overview values for the same project and period.
- Tool responses include compact `summary` text plus structured metrics.
- Project-specific responses include `projectName`, `generatedAt`, `dataWindow`, and `queryBasis`.
- Period-based responses expose exact resolved start/end timestamps, timezone, and `dataThrough`.
- Partial-answer responses include available evidence, explicit limitations, and recommended events when additional instrumentation would make the answer more accurate.
- Tool handlers return MCP results with `structuredContent` and `content[{ type: "text" }]`.
- Tool registrations define output schemas for their documented `structuredContent`.
- Tool registrations include read-only annotations when the MCP library supports them.
- Project-specific success responses include dashboard URLs.
- Empty project responses include zero-value metrics and the waiting-for-first-event meaning.
- No-events responses are shaped for event discovery, event schema, path-to-event summaries, overview, sessions summary, live events, top pages, top referrers, and next-event suggestions without requiring tests to infer missing fields.
- Malformed `since` values return `invalid_since`.
- Malformed or over-length `goal` values return `invalid_goal`.
- Malformed or over-length event names return `invalid_event_name`.
- Out-of-range `maxSteps` values return `invalid_steps`.
- Service failures return `service_error` without credentials, raw SQL, bearer tokens, or stack traces.
- The same Tally MCP server connection used for install can authorize analytics read tools for the same Tally account without requiring a separate Tally account login or GitHub App installation.
- MCP auth validates token resource/audience and the required v1 install/read authority before analytics tools run; insufficient authority returns `unauthorized`.
- Returned paths, referrers, event names, and goal-derived text are bounded and sanitized before being included in summaries.
- Tool responses do not expose OAuth tokens, Tinybird credentials, GitHub installation tokens, private source files, billing details, or unrelated project metadata.
- Local tests cover `resolve_project` for exact match, no match, multiple matches, malformed repo context, and another user's project.
- Local tests cover `mcp-active-with-events` fixture data for overview, sessions, live events, top pages, top referrers, event discovery, event schema, path-to-event summaries, and next-event suggestions.
- Local tests cover `mcp-active-no-events` fixture data for explicit no-events responses.
- Local tests cover a fixture with a signup completion event so the "pages before signup" prompt can be verified end to end through MCP tools.
- Local tests cover a partial-answer fixture where Tally can return some evidence plus suggested events for a more accurate answer.
- Tests prove another user's project ID cannot be read through MCP analytics tools.
- Tests prove `suggest_next_events` returns recommendations without creating pending tasks.
- Prompt-level tests cover natural user questions and verify the agent-facing result includes data, limitations, suggested events when needed, exact time window, and dashboard URL.

## Verification Guidance

Use the agent testing harness in `docs/agent-testing.md`.

Expected local verification shape:

```bash
pnpm --filter web e2e:scenarios
pnpm --filter web e2e:seed mcp-active-with-events
pnpm --filter web e2e:seed mcp-active-with-signup-events
pnpm --filter web e2e:seed mcp-active-no-events
pnpm --filter web test -- --run
pnpm --filter web e2e --grep @scenario
```

The exact technical spec may narrow the command set, but verification should include:

- unit tests for MCP tool registration and response shaping
- unit tests for ownership enforcement and validation errors
- fixture-backed tests proving MCP results match dashboard analytics semantics
- fixture-backed tests proving the conversational "pages before signup" path uses event discovery and `get_paths_to_event`
- at least one no-events fixture test

Prompt-level scenario tests should cover:

- "Use Tally Analytics to summarize usage from the last 7 days."
- "Which pages are users visiting before signup?" when a signup completion event exists.
- "Which pages are users visiting before signup?" when no signup completion event exists.
- "Look at usage and suggest events we should add next."
- Multiple projects in the account where the current repo/app context resolves to one project.
- Multiple plausible signup events where the agent must ask for clarification rather than choosing silently.

## Future Enhancements

- Pending task creation from approved recommendations.
- Dashboard-created pending tasks that agents pull and implement.
- Cross-project analytics summaries.
- Arbitrary multi-step funnel builders and custom query tools once event taxonomy is richer.
- Progressive tool discovery or toolset filtering if the Tally MCP surface grows.
- Prompt-generated dashboard views.
- Alerts or scheduled analytics summaries.
- Optional GitHub App automation that opens tracking PRs from approved recommendations.
