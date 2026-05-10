# Feature Brief: Analytics Coverage Map

## Status

Innovation note. Implement when the human explicitly requests it or `plans/PLAN_STATUS.md` marks this workstream active/approved.

## Product Intent

Build an Analytics Coverage Map: the coding agent sends Tally a safe route/action inventory from the local repo, and Tally cross-checks it against observed analytics to show exactly which pages, CTAs, forms, and funnels are invisible or under-instrumented.

This turns Tally's MCP-first position into a sharper wedge:

> Show me what my analytics cannot currently see.

## Why This

Tally already has the rare pieces most analytics products do not combine: MCP auth and install, repo-context exchange, SDK events, analytics query tools, and deterministic local fixtures.

Competitors are moving toward agent-accessible analytics, but mostly as "query my analytics" or "install with AI." The higher-leverage move is to combine local repo structure with real usage data so the agent can identify missing instrumentation instead of only summarizing existing telemetry.

## User Flow

1. User has an existing Tally project with events.
2. User is working in the local repo with the Tally MCP configured.
3. User asks the coding agent:

   ```text
   Use Tally to show me what analytics coverage is missing in this app.
   ```

4. Agent inspects the local app and sends Tally a bounded inventory of routes, page titles, forms, links, buttons, known event calls, and framework metadata.
5. Tally joins that inventory with existing analytics data.
6. Tally returns a coverage report with gaps, observed evidence, and implementation hints.
7. Later, the user can convert selected gaps into pending analytics tasks.

## What Exists Now

- MCP auth and install tooling exist.
- MCP analytics tools exist or are in active/planned workstream scope.
- Analytics service logic can summarize pageviews, sessions, top pages, referrers, live events, event schemas, paths to events, and next-event suggestions.
- The SDK already records page/session/CTA/engagement-style data.
- Local E2E fixtures can make analytics states deterministic and account-free.
- Dashboard pending analytics tasks are already a planned workstream.

## Net-New Scope

- Add a read-only MCP tool such as `analyze_tracking_coverage`.
- Define a safe `RepoAnalyticsInventory` input schema.
- Compare local route/action inventory against observed analytics and event schemas.
- Return a compact agent-readable coverage map.
- Add deterministic fixture scenarios for common gap states.

## Candidate Coverage Findings

- `covered`: Route or action has expected observed telemetry.
- `traffic_no_goal_event`: Route gets visits but has no meaningful goal/completion event.
- `cta_untracked`: CTA exists in code but no matching click or action event is observed.
- `form_untracked`: Form exists in code but no submit/success/failure event is observed.
- `dead_route`: Route exists in code but has no recent traffic.
- `event_exists_no_recent_hits`: Event exists in code or historical schema but has no recent observations.

## Initial MCP Tool Shape

`analyze_tracking_coverage`

Input:

```json
{
  "projectId": "proj_123",
  "period": "7d",
  "repo": {
    "name": "my-app",
    "workspaceRoot": ".",
    "appRoot": "apps/web",
    "packageManager": "pnpm",
    "framework": "nextjs-app-router"
  },
  "inventory": {
    "routes": [
      {
        "path": "/pricing",
        "sourceFile": "apps/web/app/pricing/page.tsx",
        "title": "Pricing",
        "actions": [
          {
            "kind": "link",
            "label": "Start trial",
            "href": "/signup"
          }
        ],
        "forms": []
      }
    ],
    "observedTrackingCalls": [
      {
        "eventName": "signup_completed",
        "sourceFile": "apps/web/app/signup/actions.ts"
      }
    ]
  }
}
```

Output:

```json
{
  "status": "ok",
  "summary": "3 likely tracking gaps found.",
  "coverage": [
    {
      "status": "cta_untracked",
      "route": "/pricing",
      "label": "Start trial",
      "evidence": [
        "Pricing received 412 pageviews in 7d.",
        "No matching CTA/action event was observed."
      ],
      "suggestedEvent": "pricing_start_trial_clicked",
      "priority": "high"
    }
  ],
  "createsPendingTasks": false
}
```

## Privacy And Safety Constraints

- Accept structured metadata only, not arbitrary source files.
- Reject `.env*`, secrets, lockfiles, private keys, credentials, binary files, and file bodies.
- Cap route/action/form label lengths and total payload size.
- Treat source paths as local context hints, not durable sensitive data.
- Do not persist the full inventory in v1.
- Keep the first version read-only; it may suggest pending tasks but must not create them unless a later approved workstream adds that behavior.

## Initial Acceptance Criteria

- Authenticated MCP user can run coverage analysis only for projects they own.
- Tool rejects invalid periods, oversized inventories, unsafe paths, and raw file-body shaped input.
- Coverage output identifies at least route-with-traffic/no-goal-event, CTA-untracked, and dead-route cases.
- Results include evidence and a suggested event name for each actionable gap.
- Results include dashboard URLs for follow-up inspection.
- Tool responses avoid leaking raw tokens, private source contents, or unrelated project metadata.
- Deterministic local fixture tests prove coverage findings without Tinybird or a human GitHub account.

## Dependencies

- MCP project ownership and OAuth.
- Existing analytics service/query logic.
- MCP analytics querying workstream.
- Existing local E2E fixture support.
- Dashboard pending tasks workstream if gaps should later become implementation tasks.

## Implementation Sketch

Effort: Medium

Likely files:

- `apps/web/lib/mcp/tools/analytics.ts`
- `apps/web/lib/mcp/tools/analytics-schemas.ts`
- `apps/web/lib/analytics/service.ts`
- `apps/web/lib/analytics/types.ts`
- `apps/web/tests/mcp-analytics-tools.test.ts`
- `apps/web/tests/e2e-analytics-fixtures.test.ts`

Steps:

1. Define `RepoAnalyticsInventory` and `TrackingCoverageResult` types with strict validation.
2. Add analytics service logic that compares inventory routes/actions/forms against pageview, event, path, and schema summaries.
3. Register `analyze_tracking_coverage` as a read-only MCP tool.
4. Add fixture-backed tests for covered routes, missing goal events, untracked CTAs, untracked forms, and dead routes.

## Open Questions

- Should v1 require the local agent to map source routes to deployed URL paths, or should Tally infer route paths from Next.js file conventions?
- Should `dead_route` be framed as an analytics gap, a product/navigation issue, or both?
- Should coverage findings be visible in the dashboard immediately, or only returned through MCP until the pending-tasks workstream is active?
