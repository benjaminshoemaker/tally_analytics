# Flow Verification Plan: dashboard_pending_tasks

Status: Applicable

## Flow Claim

A Tally user can ask a project-scoped analytics question in the dashboard, explicitly confirm a proposed tracking task when current data is insufficient, and then an authenticated MCP client can retrieve that task, report local implementation, and have Tally mark it verified only after matching production telemetry appears.

First valuable slice:

```text
A seeded dashboard user can create one pending analytics task from an Ask Tally answer, a seeded MCP client can pull and update it, and a seeded production event can move it from awaiting deploy to verified without using any human account or production data.
```

## Channel Under Test

This flow crosses three real product channels:

- Browser UI for Ask Tally, HITL confirmation, task queue status, delete/cancel/archive controls.
- MCP over `http://localhost:3000/api/mcp` for agent task retrieval and status reporting.
- Analytics event ingestion or fixture replay for production verification evidence.

The harness must drive these channels. Direct service imports can support unit tests, but they are not sufficient evidence for the end-to-end product claim.

## Harness Shape

Add a local script:

```bash
pnpm --filter web e2e:mcp-pending-tasks
```

The script should follow the shape of `apps/web/scripts/mcp-self-test.mjs` and the existing scenario seeder:

- use a temporary fixture root under `tmp/`
- seed deterministic users, projects, analytics events, and optional task rows
- start `apps/web` with `E2E_TEST_MODE=1`
- create local OAuth access tokens for the seeded MCP user, including one with `mcp:tasks` and one install-only token for the negative scope check
- use Playwright for the dashboard browser flow
- use the MCP SDK client for task tools
- replay or write fixture events with explicit `environment` markers
- print a compact machine-readable pass/fail summary
- clean up local rows and temp fixtures after the run

## Setup/State

Required checked-in or harness-generated scenarios:

- `dashboard-task-question-answered`: pricing pageviews exist; Ask Tally answers without a task draft.
- `dashboard-task-question-partial`: pricing pageviews exist but onboarding completion does not; Ask Tally returns a partial answer plus `track_completion` draft.
- `dashboard-task-question-cannot-answer`: no matching CTA/click signal exists; Ask Tally returns `cannot_answer_yet` plus `track_click` draft.
- `dashboard-task-question-unsupported`: broad request such as "track everything users do"; no draft is returned.
- `dashboard-task-production-verified`: task has local implementation evidence and later production fixture event.
- `dashboard-task-production-missing-property`: event exists but required property is missing.
- `mcp-pending-analytics-task`: owned MCP-created project with one pending task and exact fingerprint context.
- `mcp-pending-analytics-task-ambiguous-project`: two owned MCP projects match broad repo context and force `needs_project_selection`.

Required environment:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres
E2E_TEST_MODE=1
E2E_ANALYTICS_FIXTURE_DIR=<tmp fixture root>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The harness must not use a human GitHub account, personal OAuth token, production Tinybird data, production Tally data, or remote database unless the existing `E2E_ALLOW_REMOTE_SEED=1` guard is explicitly overridden for a staging-only run.

## Driver

The script should:

1. Apply local database migrations with `pnpm --filter web db:push` when needed.
2. Seed the question-answer scenarios and write event fixtures.
3. Start `pnpm --filter web dev:e2e` on port 3000.
4. Use `/api/auth/e2e-login` to log in as the seeded dashboard user.
5. Open `/projects/<projectId>`.
6. Submit the four fixture-backed questions through the Ask Tally UI.
7. Assert `answered` shows no task draft.
8. Assert `partial_answer` and `cannot_answer_yet` show the answer first and a confirmable task draft second.
9. Edit title/event/notes for one draft, confirm it, and assert it appears in the pending queue.
10. Dismiss/delete another draft and assert no task appears.
11. Delete a pending task before agent start and assert it disappears from the active queue.
12. Create an MCP OAuth access token with `mcp:tasks` for the seeded user and connect an MCP SDK client to `/api/mcp`.
13. Call `tools/list` and assert the three analytics task tools are registered.
14. Call `list_pending_analytics_tasks` with exact repo context and assert the confirmed task is returned.
15. Call `get_analytics_task_context` and assert original question, analytics gap, event contract, implementation guidance, and verification criteria.
16. Call `report_analytics_task_status` with `in_progress`, then repeat it to assert idempotency.
17. Call `report_analytics_task_status` with `implemented_locally` plus changed files, commands, local event evidence, and implementation fingerprint.
18. Reload the dashboard and assert the task is `awaiting_deploy` or `implemented_locally` copy that clearly says production verification is still pending.
19. Replay a local/test fixture event with matching event name and `environment = 'test'`; assert the task is not verified.
20. Replay a production fixture event with matching event name but missing required property; assert the task is not verified and shows the missing property.
21. Replay a production fixture event with required properties after `implemented_at`; assert the task becomes `verified`.
22. Call the ambiguous project MCP scenario and assert `needs_project_selection`.
23. Call a foreign project/task id and assert project/task not found without leaking existence.
24. Repeat a task-tool call with an install-only `mcp:install` token and assert a structured insufficient-scope result.

## Assertions

The harness passes only if:

- The dashboard ask flow is project-scoped.
- `answered` returns an answer and creates no task.
- `partial_answer` and `cannot_answer_yet` show answer/gap content before the draft.
- No task is persisted before confirmation.
- Confirming a draft creates exactly one pending task.
- Dismissing/deleting an unconfirmed draft creates no task.
- Deleting a pending task removes it from the default active queue.
- Duplicate confirmation returns the existing task, not a second row.
- MCP tools return only tasks owned by the authenticated user.
- MCP task tools require `mcp:tasks`; install-only tokens cannot list, read, or update tasks.
- MCP project resolution uses explicit project id or exact repo fingerprint and returns `needs_project_selection` on ambiguity.
- `get_analytics_task_context` returns the structured task contract needed by an agent.
- Agent status reports are idempotent.
- Local/test event evidence can move a task to implemented/awaiting-deploy state but cannot verify it.
- Only a matching production event after `implemented_at` can mark the task verified.
- A matching production event with missing required properties does not verify and reports the missing properties.
- The flow works with seeded users, local auth, local fixtures, and no human GitHub account.

Negative assertions:

- No task tools create tasks through MCP.
- No raw OAuth tokens, GitHub tokens, Tinybird tokens, source code, raw visitor IDs, or private user IDs appear in MCP or dashboard-visible task evidence.
- No remote database is seeded without the existing explicit override.
- No production Tinybird data is required for local verification.

## Evidence

On success, print compact JSON:

```json
{
  "ok": true,
  "flow": "dashboard_pending_tasks",
  "stages": [
    { "name": "dashboard-answered", "status": "passed" },
    { "name": "dashboard-confirm-task", "status": "passed" },
    { "name": "mcp-task-context", "status": "passed" },
    { "name": "agent-status-idempotency", "status": "passed" },
    { "name": "production-verification", "status": "passed" }
  ]
}
```

On failure, include:

- stage name
- scenario id
- dashboard URL or MCP tool name
- sanitized response/status summary
- temp fixture directory when `--keep` is passed
- Playwright trace path for browser failures

Screenshots are useful for dashboard regressions, but the pass/fail source of truth should be DOM/API/MCP assertions and task rows.

## Teardown/Rerun

Each run should:

- stop the local web server it started
- delete local OAuth access tokens, refresh tokens, authorization codes, and test OAuth clients created during the run
- clean seeded task, project, session, GitHub token, and user rows
- delete temporary fixture directories unless `--keep` is passed
- leave checked-in scenario files unchanged

Reruns must be idempotent. If port 3000 is occupied by an unknown server, fail fast with a clear message instead of attaching to it.

## Open Decisions

None blocking.

The only implementation-time choice is whether the question interpreter calls a live LLM in production immediately or uses the deterministic classifier first. The verification contract is the same either way: seeded scenarios must produce stable result kinds and draft contracts.
