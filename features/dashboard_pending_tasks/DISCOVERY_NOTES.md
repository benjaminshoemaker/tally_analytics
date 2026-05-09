# Discovery Notes: Dashboard-Created Pending Analytics Tasks

Generated: 2026-05-09
Source: /discover conversation
Status: Research-only discovery. This does not supersede the primary active workstream in `features/mcp_onboarding/`.

## Idea Summary

Dashboard-created pending analytics tasks should not feel like a traditional event builder. The stronger product shape is an answer-first analytics assistant: a user asks Tally a question from the dashboard, Tally answers when current analytics are sufficient, and when they are not, Tally explains the gap and drafts the tracking work needed to answer the question fully in the future.

The task queue is therefore not a generic backlog of "track event X" requests. It is a bridge between an unanswered product analytics question and a local coding-agent implementation loop. The dashboard remains the control plane, Tally remains the analytics/task authority, and the user's coding agent remains the local repo-editing surface through MCP.

## Key Decisions

- **Problem:** Users can see analytics gaps in the dashboard, but there is no durable way to turn "I wish I could answer this question" into structured repo work that a coding agent can pull, implement, verify, and report back.
- **Audience:** Developers using Tally Analytics with MCP-capable coding agents, especially solo builders and small teams who expect the agent to handle code changes locally.
- **Platform:** Tally dashboard for asking questions, reviewing answers, confirming task drafts, and tracking status; Tally MCP for coding-agent task retrieval and status reporting.
- **Stack preferences:** Use the existing Tally stack: Next.js dashboard, hosted MCP server, Postgres project/task records, Tinybird or E2E fixtures for analytics reads, and `@tally-analytics/sdk` for app-side instrumentation.
- **MVP scope:** Prompt-first dashboard ask flow; answer/partial/cannot-answer classification; HITL confirmation before queueing; persistent task records; MCP task retrieval; agent status reporting; local implementation evidence; production-event verification.
- **Exciting part:** Tally can turn an unanswerable analytics question into the exact tracking task needed to make it answerable next time, without asking for GitHub write access or leaving the agent workflow.

## Core Product Shape

### Answer-First Flow

1. User views project analytics in the dashboard.
2. User asks a natural-language question, for example: "How many users finish onboarding after visiting pricing?"
3. Tally evaluates existing analytics.
4. Tally returns one of four response types:
   - `answered`: current data can answer the question.
   - `partial_answer`: current data gives a partial or directional answer, but a missing event or property prevents a full answer.
   - `cannot_answer_yet`: current data cannot answer the question usefully.
   - `unsupported`: the request is outside product analytics, too vague, or unsafe for v1.
5. For `partial_answer` or `cannot_answer_yet`, Tally drafts a structured tracking task.
6. User confirms before the task enters the queue. Always human-in-the-loop.
7. User later opens the local repo in a coding agent and asks it to pull pending Tally tasks.
8. Agent retrieves the task via MCP, edits code locally, verifies where possible, and reports status.
9. Dashboard reflects local implementation progress and later production verification.

### Prompt-First, Structured-Under-The-Hood

The dashboard UX should start with a prompt box, not a fixed menu. That matches the product thesis: users should ask what they want to know, not manually design tracking schemas first.

Under the hood, Tally should normalize every confirmed task into structured fields:

- original user question
- Tally answer summary, if any
- analytics gap explanation
- task type
- canonical event name
- trigger/action description
- suggested route, page, or UI surface
- expected properties and value types
- verification criteria
- implementation guidance
- duplicate fingerprint

This preserves the LLM-native UX while giving MCP clients a deterministic task contract.

## Recommended V1 Task Types

Start with task types that map cleanly to a single event or missing property:

- `track_completion`: signup completed, onboarding completed, checkout completed, import completed.
- `track_click`: pricing CTA clicked, upgrade button clicked, invite button clicked.
- `track_feature_usage`: user used a named product feature.
- `add_event_property`: existing event is useful but lacks a property needed to segment or join the answer.
- `track_funnel_step`: a named intermediate step is missing between two already-known steps.

Defer arbitrary "track everything about this workflow" requests. Tally can still respond with a task draft that says the request needs narrowing before it can be queued.

## Task Status Model

Suggested statuses:

- `draft`: Tally has interpreted the question and proposed a task, but the user has not confirmed it.
- `pending`: confirmed by the user and ready for a coding agent.
- `in_progress`: an agent has claimed or started the task.
- `implemented_locally`: the agent reports code changes and local verification evidence.
- `awaiting_deploy`: the local implementation exists, but Tally has not observed production evidence.
- `verified`: Tally has observed the expected production event or property after implementation.
- `failed`: the agent or verification process could not complete the task.
- `cancelled`: the user dismissed or no longer wants the task.
- `duplicate`: Tally matched the request to an existing queued, implemented, or verified task.

`draft` may not need to be persisted as a durable task until the user confirms. If it is persisted, it should not appear in MCP pending-task tools.

## Verification Model

Local/test events should prove only local progress. Production events should be required for the dashboard to claim the task is verified.

Recommended interpretation:

- Agent reports code edits and local checks: move to `implemented_locally`.
- Agent reports local/test event evidence: keep or move to `implemented_locally`; optionally store `local_verification` evidence.
- User deploys: Tally may show `awaiting_deploy` or `awaiting_production_event`.
- Tally observes matching production telemetry after the relevant implementation timestamp: move to `verified`.

The core distinction matters: local evidence proves the code path likely works, but production evidence proves the original analytics question can actually be answered for real users.

Open product detail: if Tally already sees a matching production event before queueing, it should probably answer directly or mark the proposed task as duplicate/already satisfied rather than creating a new pending task.

## Idempotency And Duplicate Prevention

Duplicate prevention should happen before confirmation and during MCP implementation.

Suggested task fingerprint:

```text
project_id
+ normalized_question_intent
+ task_type
+ canonical_event_name
+ normalized_trigger_description
+ target_route_or_surface_hint
+ normalized_property_schema
```

If a new prompt maps to an existing pending/active/verified task, Tally should show the existing task instead of creating another one.

MCP status reporting should also be idempotent:

- `report_task_status` should accept repeated status/evidence updates for the same `task_id`.
- Status transitions should be monotonic except for explicit failure/cancel/reopen flows.
- Agent reports should include changed files, verification command summaries, event names/properties added, and an implementation fingerprint where possible.
- Re-running the agent should not create duplicate task records or require duplicate instrumentation.

## MCP Tool Shape

Candidate tools:

- `list_pending_analytics_tasks`: returns confirmed tasks available to the authenticated user/project.
- `get_analytics_task_context`: returns full task context, original question, analytics gap, event contract, and guidance.
- `report_analytics_task_status`: lets the agent report `in_progress`, `implemented_locally`, `failed`, and verification evidence.
- Later: `create_analytics_task_from_question`, if MCP analytics querying should draft tasks from agent-side questions too.

Returned task context should be structured, not just prose:

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

Tally should return enough implementation guidance to preserve intent and event quality, but it should not over-prescribe exact local code unless the request is a known SDK integration pattern. The local agent owns repo inspection and code placement.

## Data Model Notes

The existing brief's `analytics_tasks` table shape is directionally right. Discovery adds a few fields worth considering:

- `original_question`
- `answer_kind`
- `answer_summary`
- `analytics_gap`
- `confirmation_state`
- `confirmed_at`
- `duplicate_of_task_id`
- `target_surface`
- `verification_query`
- `local_verification`
- `implementation_fingerprint`
- `production_verified_event_id` or equivalent Tinybird event reference
- `verification_started_at`

Keep the durable task record structured enough that future dashboard views, MCP tools, and verification jobs do not need to reinterpret the original prompt every time.

## Existing Solutions And Tools

### Use Directly

None found that solve the full Tally loop: ask an analytics question in a dashboard, draft missing instrumentation work, require user confirmation, expose the task through MCP, let a local coding agent implement it, and verify through later production events.

### Leverage

- [Model Context Protocol tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools): MCP supports structured tool results and output schemas, which fits the need to return task contracts rather than vague prose.
- [Model Context Protocol authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization): reinforces the current OAuth-backed MCP boundary for user/project-scoped task access.
- [PostHog MCP documentation](https://posthog.com/docs/model-context-protocol): useful reference for analytics querying from AI agents, supported editor setup, OAuth/API-key fallback positioning, and prompt examples.
- [OpenTelemetry event semantic conventions](https://opentelemetry.io/docs/specs/semconv/general/events/): useful discipline for event contracts: an event should have a stable name and documented attributes.

### Take Inspiration From

- [Linear issue templates](https://linear.app/docs/issue-templates): good precedent for structured intake that can originate from different surfaces and still produce consistent records.
- [Linear issue statuses](https://linear.app/docs/configuring-workflows): useful workflow categories for pending/in-progress/completed/canceled states, while Tally should adapt them to analytics-specific deploy and verification stages.
- [PostHog's MCP server](https://github.com/PostHog/mcp): validates the category of analytics systems exposing AI-agent tools, but Tally's differentiator should be task generation and local implementation handoff, not only analytics read access.

## Open Questions

- What exact dashboard surface owns the ask box: project overview, analytics detail page, or a dedicated "Ask Tally" panel?
- Should Tally show the task draft inline with the answer, in a side panel, or in a queue preview modal?
- Which three task types are the first implementation targets?
- How much of the task draft can the user edit before confirming?
- Should confirmed tasks be tied to a specific dashboard question thread?
- Should MCP tasks be per-project only, or should the agent be able to list tasks across all user projects when repo matching is unclear?
- What is the production verification window: after task creation, after agent implementation report, or after the user explicitly marks deployed?
- How should Tally handle a task whose production event appears with the right name but missing expected properties?
- Does the dashboard need notifications when a task becomes verified, or is passive status enough for v1?
- Should task creation from MCP analytics querying be allowed in v1, or should only the dashboard create tasks?

## Raw Context

- User framing: "We want users to create desired tracking changes from the Tally dashboard, then have their coding agent pull those tasks through MCP and implement them locally."
- Product direction: "Tally either a) answers the question or b) says here's a partial answer and I'm going to add a task to the queue to answer it fully."
- HITL decision: "Confirm before adding. Always HITL."
- Verification decision: local/test events can prove local implementation progress, but production events should be required before Tally marks the analytics task verified.
- Active-plan boundary: this is non-current discovery work and should not supersede `features/mcp_onboarding/`.
