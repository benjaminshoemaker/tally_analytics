# Feature Brief: Dashboard-Created Pending Analytics Tasks

## Status

Initial workstream brief. Implement when the human explicitly requests it or `plans/PLAN_STATUS.md` marks this workstream active/approved.

## Product Intent

Let a user request additional analytics from the Tally dashboard, then have their coding agent pull and implement those requests through MCP.

The dashboard remains the control plane. The coding agent remains the repo-editing surface.

## User Flow

1. User is viewing a Tally project dashboard.
2. User decides they want to track something new, such as signup completion, pricing CTA clicks, onboarding completion, or feature usage.
3. User creates a pending analytics task in the dashboard.
4. Dashboard shows the task as ready for the coding agent.
5. User opens their repo in a coding agent and says:

   ```text
   Pull down any pending tasks from the Tally Analytics MCP and implement them.
   ```

6. Agent calls Tally MCP, retrieves pending tasks, inspects the local codebase, applies the requested instrumentation, and runs local verification.
7. Agent reports task status back to Tally.
8. Dashboard shows the task moving through implemented, awaiting deploy, and verified once the expected event appears.

## What Exists Now

- MCP authentication and project ownership exist.
- MCP-created projects can be represented without GitHub App fields.
- Dashboard project views and analytics APIs exist.
- No pending analytics task model exists yet.
- No MCP task-listing or task-status tools exist yet.

## Net-New Scope

- Add persistent pending task records tied to a project and user.
- Add dashboard UI for creating a small set of structured analytics task types.
- Add task status display on project detail pages.
- Add MCP tools for listing pending tasks, retrieving implementation context, and reporting status.
- Add event-verification logic that marks a task verified when the requested event appears after deploy.

## Out Of Scope

- Local runner/watch mode.
- Website directly editing code.
- Website-created GitHub PRs.
- Arbitrary natural-language dashboard builder.
- Fully automatic code changes without the user returning to their coding agent.

## Initial Data Model Shape

Candidate table: `analytics_tasks`

- `id`
- `project_id`
- `user_id`
- `status`
- `task_type`
- `event_name`
- `description`
- `properties_schema`
- `source`
- `created_at`
- `updated_at`
- `implemented_at`
- `verified_at`
- `last_error`

Candidate statuses:

- `pending`
- `in_progress`
- `implemented_locally`
- `awaiting_deploy`
- `verified`
- `failed`
- `cancelled`

## Initial MCP Tool Shape

- `list_pending_tasks`
- `get_task_context`
- `report_task_status`
- Later: `create_task` if analytics querying tools should be able to propose and create tasks.

## Initial Acceptance Criteria

- User can create a pending task from a project dashboard.
- Agent can retrieve pending tasks only for projects owned by the authenticated user.
- Agent can report status transitions through MCP.
- Dashboard reflects task status without GitHub App access.
- Verified status is based on observed analytics data, not only the agent saying it changed code.
- Rerunning the agent is idempotent and does not create duplicate tasks or duplicate instrumentation records.

## Dependencies

- MCP project ownership and OAuth.
- Existing analytics ingestion and dashboard APIs.
- MCP analytics querying workstream if task suggestions are generated from observed usage.

## Open Questions

- Should v1 task creation be structured form-first, prompt-first, or both?
- Which first task types are safe enough to support without arbitrary codegen?
- Should task verification require production events, local test events, or either?
