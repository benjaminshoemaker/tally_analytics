# Feature Spec: Dashboard-Created Pending Analytics Tasks

## Overview

Dashboard-created pending analytics tasks let a user ask Tally a product analytics question from a project dashboard, get an answer when existing data is sufficient, and confirm a queued implementation task when the answer requires new instrumentation.

This feature extends Tally's MCP-first product direction. The dashboard remains the account, analytics, and control-plane surface. The coding agent remains the repo-editing surface. Tally stores the pending task, exposes it through MCP, accepts implementation status from the local agent, and marks the task verified only when the expected production event or property appears after deployment.

This feature is planned work. It does not replace the primary active `features/mcp_onboarding/` workstream unless `plans/PLAN_STATUS.md` is later updated to promote it.

## Problem

Users can notice analytics gaps while reviewing a dashboard, but today there is no durable product loop that turns "I wish I could answer this question" into a structured implementation task for their coding agent.

The desired user experience is not a traditional manual event builder. The user should ask Tally what they want to know. Tally should either answer from existing analytics or explain the missing signal and draft the exact tracking change needed to answer the question in the future.

## Users

Primary users:

- Developers and solo builders using Tally Analytics with an MCP-capable coding agent.
- Users reviewing a specific Tally project dashboard who want to improve future analytics coverage.
- Users who are willing to let a coding agent edit code locally, but do not want Tally to directly mutate their repository from the website.

Secondary users:

- Teams that want a lightweight analytics task queue without installing the GitHub App.
- Existing Tally users who have already installed the SDK and now want to add custom tracking incrementally.

## Goals

- Let a user ask a project-scoped analytics question from the dashboard.
- Answer directly when existing data can answer the question.
- Return a partial answer when existing data is useful but incomplete.
- Draft a structured tracking task when new instrumentation is needed.
- Require explicit human confirmation before a task enters the queue.
- Persist confirmed tasks against a project and authenticated user.
- Expose confirmed tasks through Tally MCP to authenticated coding agents.
- Let the agent report implementation status and local verification evidence.
- Show task status in the dashboard without requiring GitHub App access.
- Mark tasks verified only from observed production telemetry, not only from an agent status report.
- Avoid duplicate tasks and duplicate instrumentation across repeated prompts or repeated agent runs.

## Non-Goals

- No website-side code editing.
- No automatic task queueing without user confirmation.
- No hosted GitHub PR creation.
- No GitHub App requirement.
- No arbitrary natural-language dashboard/report builder.
- No local runner or watch mode.
- No fully autonomous production deployment.
- No support for broad "instrument everything" requests in v1.
- No production verification based solely on local/test events.
- No hard deletion of in-progress, implemented, or verified task history.

## Core User Experience

### Dashboard Ask Flow

The v1 ask box should live on the project dashboard/detail page. It should be scoped to the project the user is viewing, not a global app-wide assistant.

Low-fidelity layout:

```text
Project: Acme App                                      [Settings]

Status: Live   14,230 events   612 sessions   Last event 2m ago

+--------------------------------------------------------------------+
| Ask Tally                                                          |
| +----------------------------------------------------------------+ |
| | What do you want to know about this project?                   | |
| | e.g. "How many users finish onboarding after visiting pricing?"| |
| +----------------------------------------------------------------+ |
|                                                        [Ask Tally] |
+--------------------------------------------------------------------+

+-------------------------------+  +-------------------------------+
| Traffic                       |  | Pending Tracking Tasks        |
| Pages, sessions, referrers... |  | 2 pending                     |
|                               |  |                               |
| Existing dashboard widgets    |  | - Track pricing CTA clicks    |
| stay here.                    |  |   Ready for coding agent      |
|                               |  | - Add plan property to signup |
|                               |  |   Awaiting deploy             |
+-------------------------------+  +-------------------------------+
```

When the user submits a question, Tally evaluates existing analytics and returns one of four answer types:

- `answered`: current analytics can answer the question.
- `partial_answer`: current analytics give a directional answer, but a missing event or property prevents a complete answer.
- `cannot_answer_yet`: current analytics cannot answer the question usefully.
- `unsupported`: the request is outside v1 product analytics scope, too vague, or unsafe to turn into an implementation task.

V1 must include a fixture-backed scenario matrix so answer classification is deterministic in tests:

| Example question | Existing signal | Expected result |
|------------------|-----------------|-----------------|
| "How many users visited pricing this week?" | Pageview/path data exists for `/pricing` | `answered` with count and date window |
| "How many users finished onboarding after visiting pricing?" | Pricing pageviews exist, onboarding completion does not | `partial_answer` plus a `track_completion` task draft |
| "How many people clicked the upgrade CTA?" | No click/CTA event or property exists | `cannot_answer_yet` plus a `track_click` task draft |
| "Which plan converts best after signup?" | Signup event exists, plan property does not | `partial_answer` plus an `add_event_property` task draft |
| "Track everything users do in the app" | Request is too broad for v1 | `unsupported` with narrowing guidance |

Answer copy does not need to be identical for every run, but the response kind, proposed task type, event name, and verification requirement must be stable for seeded scenarios.

For `partial_answer` and `cannot_answer_yet`, Tally should show the answer first, then an inline task confirmation panel. The task is not queued until the user confirms.

Low-fidelity answered-plus-task draft layout:

```text
+--------------------------------------------------------------------+
| Ask Tally                                                          |
| Question: How many users finish onboarding after visiting pricing? |
|                                                                    |
| Partial answer                                                     |
| Tally can see pricing pageviews, but cannot identify onboarding    |
| completion yet.                                                    |
|                                                                    |
| To answer this fully, add this tracking task:                      |
| +----------------------------------------------------------------+ |
| | Track onboarding completion                                    | |
| | Event: onboarding_completed                                    | |
| | Trigger: when a user reaches the completed onboarding state     | |
| | Properties: source_page, plan                                  | |
| | Verification: production event observed after deploy           | |
| |                                                                | |
| | [Edit title/event] [Add task to queue] [Dismiss] [Delete draft]| |
| +----------------------------------------------------------------+ |
+--------------------------------------------------------------------+
```

### Task Queue Flow

1. User asks a question from the project dashboard.
2. Tally answers, partially answers, cannot answer yet, or rejects the request as unsupported.
3. If tracking is needed, Tally drafts a structured task.
4. User reviews the draft.
5. User may edit the title, event name, or short notes before confirmation.
6. User confirms the task.
7. Dashboard shows the task as ready for the coding agent.
8. User opens the local repo in a coding agent and asks:

   ```text
   Pull down any pending tasks from the Tally Analytics MCP and implement them.
   ```

9. Agent calls Tally MCP, retrieves confirmed pending tasks, inspects the local codebase, edits code, and runs local verification.
10. Agent reports task status back to Tally.
11. Dashboard shows the task as implemented locally or failed.
12. After the user deploys, Tally watches production analytics.
13. Tally marks the task verified when the expected production event or property appears.

## Supported V1 Task Types

V1 should support three task types:

- `track_completion`: track a meaningful completed action or outcome, such as signup completed, onboarding completed, checkout completed, import completed, invite sent, export completed, or generation completed.
- `track_click`: track a button or link click that signals intent, such as pricing CTA clicked, upgrade clicked, invite clicked, or connect integration clicked.
- `add_event_property`: add a missing property to an existing event so a question can be segmented or joined.

This supports the canonical "track usage of a specific feature" flow when the requested usage can be represented as a completion, outcome, or click. For example, "track exports" can become `track_completion` with an `export_completed` event, and "track AI generation usage" can become `track_completion` with a `generation_completed` event.

Requests for passive feature usage, duration-based usage, or multi-step funnels should be mapped to the three v1 types only when the request cleanly fits. Otherwise Tally should ask the user to narrow the request or treat it as unsupported for v1.

## Task Draft Editing And Deletion

Before confirmation, the user may:

- edit the task title
- edit the proposed event name
- edit short implementation notes
- confirm the task
- dismiss the draft
- delete the draft

V1 should not include full schema editing. The expected properties can be shown in expandable details, but editing arbitrary property schemas should be deferred to a later event-builder-style workflow.

Lifecycle deletion behavior:

- `Dismiss` closes the current draft panel without confirming the task. If drafts are not persisted, this is equivalent to discarding the generated draft for the current page session.
- `Delete draft` removes a persisted draft record when drafts are persisted. If drafts are not persisted in v1, the UI should expose only the dismiss/discard behavior or map delete to the same non-persistent discard operation.
- Draft tasks can be deleted or discarded immediately.
- Pending tasks can be deleted before an agent starts.
- In-progress, implemented, or failed tasks should use `cancelled` or `archived` behavior instead of hard delete.
- Verified tasks should be hidden or archived from the active queue, not destructively deleted.

This preserves duplicate-prevention and status history while still letting users remove unwanted draft or pending work.

## Task Status Model

Required statuses:

- `pending`: confirmed by the user and ready for a coding agent.
- `in_progress`: an agent has started or claimed the task.
- `implemented_locally`: the agent reports code changes and local verification evidence.
- `awaiting_deploy`: implementation exists locally, but Tally has not observed matching production telemetry.
- `verified`: Tally observed the expected production event or property after implementation.
- `failed`: the agent or verification flow could not complete the task.
- `cancelled`: the user stopped the task after it had entered the durable task lifecycle.
- `archived`: the task is hidden from the active queue but preserved for history.
- `duplicate`: Tally matched the request to an existing pending, active, or verified task.

Drafts may be represented separately from confirmed tasks. If drafts are persisted, they must not be returned by MCP pending-task tools until confirmed.

Required status transition rules:

| From | To | Actor | Trigger |
|------|----|-------|---------|
| draft or generated draft | pending | User | User confirms the task |
| pending | in_progress | Agent | Agent reports that it started the task |
| pending | cancelled | User | User deletes or cancels before agent work starts |
| in_progress | implemented_locally | Agent | Agent reports code changes and local checks |
| in_progress | failed | Agent | Agent reports it cannot implement or verify locally |
| implemented_locally | awaiting_deploy | Tally | No matching production event has appeared after the implementation report |
| awaiting_deploy | verified | Tally | Matching production event or property appears |
| implemented_locally | verified | Tally | Matching production event already appeared after implementation report |
| failed | pending | User | User reopens the task |
| pending, in_progress, implemented_locally, awaiting_deploy, failed, verified | archived | User | User hides task from active queue |
| in_progress, implemented_locally, awaiting_deploy, failed | cancelled | User | User intentionally stops the task |

`awaiting_deploy` is a Tally-derived dashboard status. MCP status reporting should not require agents to assert deployment. The agent can report local implementation evidence; Tally determines whether production telemetry has arrived.

## Verification Model

Local/test events can prove implementation progress, but they must not mark a task verified.

Verification rules:

- Agent code changes plus local checks can move a task to `implemented_locally`.
- Local/test event evidence can be stored as local verification evidence, but the task remains unverified.
- A task becomes `awaiting_deploy` when local implementation exists but production telemetry has not appeared.
- Tally marks the task `verified` only after observing the expected production event or property after the implementation report timestamp.
- If production telemetry appears with the right event name but missing required properties, the task should remain unverified and show the missing property reason.

The dashboard copy should distinguish local implementation from production verification. It should not imply that the original analytics question is fully answerable until production evidence exists.

For this product spec, production telemetry means an event read from the canonical analytics store for the project after the implementation report timestamp, not an event payload supplied inside the agent's status report. In production, that source is Tinybird-backed analytics for the project. In `E2E_TEST_MODE=1`, tests may model production telemetry with deterministic fixtures, but those fixtures must be explicitly used as production-verification evidence rather than local agent evidence.

The technical spec must define the exact event-source marker or query boundary used to distinguish production evidence from local/test evidence. If the existing event schema cannot express the required custom event/property or environment boundary, this feature must include the additive analytics schema change needed to make verification deterministic.

## Idempotency And Duplicate Prevention

Tally should prevent duplicate tasks before confirmation and during MCP implementation.

Suggested duplicate fingerprint inputs:

- project ID
- normalized question intent
- task type
- canonical event name
- normalized trigger description
- target route or surface hint
- normalized property schema

Expected behavior:

- If a user asks a question that maps to an existing pending, active, or verified task, Tally shows the existing task instead of creating a duplicate.
- If the same agent reports the same status multiple times, Tally accepts the update idempotently.
- Re-running the agent should not create duplicate task records.
- Re-running the agent should not require duplicate instrumentation if the app already contains the requested event.
- Status transitions should be monotonic except for explicit failure, cancel, archive, or reopen flows.

## MCP Behavior

This feature adds task-oriented MCP tools for confirmed tasks only.

Candidate tools:

- `list_pending_analytics_tasks`: returns confirmed tasks available to the authenticated user and scoped project.
- `get_analytics_task_context`: returns full task context, original question, analytics gap, event contract, and implementation guidance.
- `report_analytics_task_status`: lets the agent report `in_progress`, `implemented_locally`, or `failed`, with evidence.

V1 should not require the agent to submit arbitrary source trees to Tally for these tools. The local agent owns repo inspection and code placement.

Project resolution rules:

1. If the MCP request includes an explicit `projectId`, return tasks only for that authenticated user's project.
2. If the MCP request includes repo identity context, Tally should use the existing MCP project fingerprint inputs where possible: normalized git remote plus `appRoot`, or repo/package name plus `appRoot` when no remote is available.
3. If exactly one project matches the authenticated user and repo context, return tasks for that project.
4. If multiple projects match, return `needs_project_selection` with project IDs, display names, and dashboard URLs.
5. If no project matches, return `no_matching_project` with guidance to open the project dashboard or rerun MCP install first.
6. Do not return pending tasks across all user projects by default when repo context is missing or ambiguous.

Task context returned to the agent should be structured:

```json
{
  "taskId": "task_123",
  "projectId": "proj_123",
  "status": "pending",
  "taskType": "track_completion",
  "originalQuestion": "How many users finish onboarding after visiting pricing?",
  "currentAnswer": {
    "kind": "partial_answer",
    "summary": "Tally can see pricing pageviews but cannot identify onboarding completion."
  },
  "analyticsGap": "Missing onboarding completion event.",
  "eventContract": {
    "eventName": "onboarding_completed",
    "trigger": "When a user reaches the completed onboarding state.",
    "properties": {
      "source_page": "string",
      "plan": "string"
    }
  },
  "verification": {
    "local": "Trigger the onboarding completion path locally and confirm the SDK call fires.",
    "production": "Observe onboarding_completed in production after implementation."
  },
  "guidance": "Find the onboarding completion success path and add a Tally track call there. Preserve existing app behavior."
}
```

Tally should return enough guidance to preserve analytics intent and event quality. It should not over-prescribe exact local code unless the request maps to a known SDK pattern. The coding agent decides where and how to edit the app after inspecting the local repository.

## Data Persistence

The feature needs durable records for confirmed tasks and enough answer/draft context to explain why a task exists.

Candidate persisted fields:

- `id`
- `project_id`
- `user_id`
- `status`
- `task_type`
- `title`
- `original_question`
- `answer_kind`
- `answer_summary`
- `analytics_gap`
- `event_name`
- `trigger_description`
- `properties_schema`
- `target_surface`
- `implementation_guidance`
- `verification_criteria`
- `verification_source`
- `duplicate_fingerprint`
- `duplicate_of_task_id`
- `local_verification`
- `implementation_fingerprint`
- `last_error`
- `confirmed_at`
- `implemented_at`
- `verified_at`
- `cancelled_at`
- `archived_at`
- `created_at`
- `updated_at`

If unconfirmed drafts are persisted, they should be separable from confirmed tasks through either a draft state or a separate draft record. Draft records should be deleteable.

## Integration With Existing Product

This feature extends:

- Existing dashboard project detail views.
- Existing analytics APIs and Tinybird-backed reads.
- Existing local E2E fixture behavior when `E2E_TEST_MODE=1`.
- Existing project ownership and authenticated user model.
- Existing hosted MCP route in `apps/web`.
- Existing SDK-based instrumentation model.

This feature depends on:

- MCP OAuth and project ownership from `features/mcp_onboarding/`.
- Stable dashboard project pages and analytics summaries.
- Event ingestion that can distinguish production events from local/test fixture evidence.

This feature should not require:

- GitHub App installation.
- Tally repository write access.
- Remote repo inspection from Tally.
- A deployed worker controlled by Tally inside the user's app.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User asks a question current analytics can answer | Tally answers and does not draft a task by default |
| User asks a question current analytics can partially answer | Tally shows the partial answer and drafts a confirmable task for the missing signal |
| User asks a question current analytics cannot answer | Tally explains the missing signal and drafts a confirmable task when the request maps to v1 task types |
| User asks a vague or unsupported question | Tally returns `unsupported` or asks for narrowing; no task is queued |
| User closes the task draft | No confirmed task is created |
| User deletes a draft | Draft disappears and is not returned through MCP |
| User deletes a pending task before agent start | Pending task is removed or marked cancelled, and it is not returned through MCP |
| User tries to delete an implemented or verified task | Task is cancelled or archived, not hard deleted |
| Similar task already exists | Tally shows the existing task and does not create a duplicate |
| Agent calls MCP without OAuth | Task tools require authentication and do not return project tasks |
| Agent is authenticated as a different user | Task tools return only tasks owned by that authenticated user |
| Agent reports implementation twice | Tally accepts the repeated update idempotently |
| Agent reports success but no production event arrives | Dashboard stays `awaiting_deploy` or equivalent waiting state |
| Production event arrives with missing required property | Dashboard explains the missing property and does not mark verified |
| Production event appears after implementation | Task moves to `verified` |

## Acceptance Criteria

- Project dashboard/detail pages expose a project-scoped Ask Tally input.
- Submitting a question returns one of `answered`, `partial_answer`, `cannot_answer_yet`, or `unsupported`.
- If the answer is `answered`, the UI shows the answer and does not create a task by default.
- If the answer is `partial_answer` or `cannot_answer_yet`, the UI shows the answer or gap explanation first, then a task confirmation panel.
- No task enters the pending queue until the user confirms it.
- The confirmation panel shows task title, event name, trigger, expected properties, and production verification requirement.
- Before confirmation, the user can edit title, event name, and short notes.
- Before confirmation, the user can dismiss or delete the draft.
- Confirmed tasks are persisted against the authenticated user and project.
- Confirmed pending tasks appear in a project task queue on the dashboard.
- Confirmed pending tasks are available through MCP only to the authenticated owner.
- MCP returns structured task context including original question, analytics gap, event contract, verification criteria, and implementation guidance.
- MCP project resolution uses explicit `projectId` or MCP project fingerprint context and returns `needs_project_selection` instead of cross-project tasks when ambiguous.
- MCP status reporting supports at least `in_progress`, `implemented_locally`, and `failed`.
- Dashboard reflects agent-reported status transitions.
- Dashboard derives `awaiting_deploy` from local implementation evidence plus absence of matching production telemetry.
- Local/test verification evidence can mark a task implemented locally but cannot mark it verified.
- A task becomes verified only after Tally observes the expected production event or property after the implementation report timestamp.
- If a matching production event arrives without a required property, the task remains unverified and shows the missing property reason.
- Seeded E2E scenarios cover at least one `answered`, one `partial_answer`, one `cannot_answer_yet`, and one `unsupported` dashboard question with stable response kind and task draft output.
- E2E verification fixtures distinguish local agent evidence from production-verification evidence.
- Similar questions that map to the same event/task do not create duplicate confirmed tasks.
- Re-running an agent against the same task does not create duplicate task records.
- Pending tasks can be deleted before agent start.
- In-progress, implemented, failed, and verified tasks can be cancelled or archived but are not hard deleted from history.
- The feature works without GitHub App access.
- The feature can be exercised by local E2E scenarios without a human GitHub account.

## Non-Functional Requirements

- **Security:** MCP task tools must enforce authenticated project ownership. They must not expose tasks across users or projects.
- **Privacy:** Task context should not require Tally to ingest arbitrary source code. The local agent performs repo inspection.
- **Reliability:** Status updates must be idempotent so agent retries do not corrupt task state.
- **Auditability:** Confirmed task records should preserve original question, generated answer/gap, and implementation status history.
- **Accessibility:** Ask, confirm, edit, dismiss, delete, cancel, and archive actions must be keyboard accessible and have clear labels.
- **Performance:** The project dashboard should remain usable while a question is being evaluated; task queue loading should not block existing analytics widgets.
- **Account-free local testing:** E2E coverage should use seeded users, projects, task records, and local analytics fixtures when `E2E_TEST_MODE=1`.

## Future Enhancements

- Dedicated `track_feature_usage` task type for richer non-completion feature usage.
- Dedicated `track_funnel_step` task type for multi-step funnel instrumentation.
- Full event schema editor for advanced users.
- MCP-side task creation from agent analytics queries.
- Hosted GitHub App implementation path that opens PRs from confirmed dashboard tasks.
- Notifications when a task becomes production verified.
- Automated deploy detection or deployment provider integration.
