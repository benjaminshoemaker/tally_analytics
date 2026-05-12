# Execution Plan: Dashboard-Created Pending Analytics Tasks

Commands in `Verify:` lines are run from this feature directory unless they explicitly `cd ../..` to the project root.

This is a planned feature workstream. It does not supersede the primary active workstream in `../../plans/PLAN_STATUS.md`; execute it only when the human explicitly requests this feature or marks it active.

## Overview

| Metric | Value |
|--------|-------|
| Feature | Dashboard-created pending analytics tasks |
| Target Project | fast_pr_analytics |
| Total Phases | 5 |
| Total Steps | 11 |
| Total Tasks | 18 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/web/lib/db/schema.ts` | modifies | Add durable analytics task and status-history tables with additive Drizzle migration. |
| `apps/web/drizzle/migrations/*` | creates | Generate and review additive PostgreSQL migration SQL. |
| `packages/sdk/src/**` | modifies | Add public custom `track(eventName, properties?)` API while staying under 3KB gzipped. |
| `apps/events/app/v1/track/route.ts` | modifies | Accept custom event names, environment, and serialized event properties. |
| `tinybird/datasources/events.datasource` | modifies | Add non-reversible Tinybird columns for environment and event properties. |
| `apps/web/lib/analytics/e2e-fixtures.ts` | modifies | Parse generic event types, event properties, and environment markers. |
| `apps/web/lib/oauth/**` | modifies | Add `mcp:tasks` alongside `mcp:install` without breaking install-only tokens. |
| `apps/web/app/api/mcp/route.ts` | modifies | Allow supported MCP scopes at the route boundary while enforcing per-tool scopes. |
| `apps/web/lib/mcp/server.ts` | modifies | Register pending task MCP tools. |
| `apps/web/lib/mcp/tools/**` | creates/modifies | Add task tool schemas, scope checks, result shaping, and handlers. |
| `apps/web/lib/db/queries/projects.ts` | modifies | Reuse MCP project fingerprint resolution for task tools. |
| `apps/web/lib/analytics/tasks/**` | creates | Own task IDs, types, fingerprints, queries, transitions, question results, verification, and MCP adapters. |
| `apps/web/app/api/projects/[id]/analytics/questions/route.ts` | creates | Dashboard Ask Tally answer endpoint with no task persistence. |
| `apps/web/app/api/projects/[id]/analytics/tasks/**/route.ts` | creates | Confirm/list/edit/cancel/archive/delete task APIs. |
| `apps/web/components/dashboard/analytics-tasks/**` | creates | Ask panel, answer result, draft card, queue, and status badge. |
| `apps/web/app/(dashboard)/projects/[id]/page.tsx` | modifies | Mount project-scoped Ask Tally and pending task queue. |
| `apps/web/e2e/scenarios/*.json` | creates/modifies | Add deterministic dashboard, task, production-verification, and MCP ambiguity scenarios. |
| `apps/web/scripts/seed-e2e-scenario.mjs` | modifies | Seed analytics tasks and replay custom production/test fixture evidence. |
| `apps/web/scripts/mcp-pending-tasks-self-test.mjs` | creates | Agent-runnable browser plus MCP plus fixture verification harness. |
| `docs/agent-testing.md` | modifies | Document the new dashboard pending task harness. |

## Phase Dependency Graph

```text
Phase 1: Data, Event, And Auth Foundation
  -> Phase 2: Task Services And Dashboard APIs
      -> Phase 3: Dashboard Experience
          -> Phase 4: MCP Task Tools
              -> Phase 5: Agent-Runnable Flow Harness And Hardening
```

---

## Phase 1: Data, Event, And Auth Foundation

**Goal:** Add the durable task data model, first-class custom event tracking path, fixture parsing, and MCP task authorization boundary required before task lifecycle behavior can be built.
**Depends On:** None

### Pre-Phase Setup

- [ ] (CODE) This workstream is recorded as planned without changing the primary active workstream.
  - Verify: `cd ../.. && rg -q 'Primary active workstream: \`features/mcp_onboarding/\`' plans/PLAN_STATUS.md && rg -q '\`features/dashboard_pending_tasks/\` \| feature \| planned' plans/PLAN_STATUS.md`
- [ ] (CODE) Feature planning inputs exist.
  - Verify: `test -f FEATURE_SPEC.md && test -f FEATURE_TECHNICAL_SPEC.md && test -f FLOW_VERIFICATION_PLAN.md`
- [ ] (CODE) SDK bundle-size guard is available before SDK work starts.
  - Verify: `cd ../.. && test -f packages/sdk/package.json && rg -q 'tsup' packages/sdk/package.json`
- [ ] (CODE) Tinybird migration instructions are available in the root project guidance.
  - Verify: `cd ../.. && rg -q 'Tinybird column additions are non-reversible' AGENTS.md`

### Step 1.1: Task Persistence

**Depends On:** None

---

#### Task 1.1.A: Add Analytics Task Tables And Additive Migration

**Description:**
Add durable task and status-event tables with UUID user ownership, project ownership, lifecycle timestamps, duplicate metadata, local evidence, and production verification fields. Generate and review an additive Drizzle migration so existing users and projects remain valid.

**Requirement:** FEATURE_SPEC.md "Data Persistence"; FEATURE_TECHNICAL_SPEC.md "`analytics_tasks`" and "`analytics_task_status_events`"

**Acceptance Criteria:**
- [x] (CODE) `analyticsTasks` and `analyticsTaskStatusEvents` tables are defined in `apps/web/lib/db/schema.ts` with `user_id` as `uuid`.
  - Verify: `cd ../.. && rg -q 'analyticsTasks|analyticsTaskStatusEvents|uuid\\(\"user_id\"\\)' apps/web/lib/db/schema.ts`
- [x] (CODE) Task table includes all required lifecycle and duplicate fields from the technical spec.
  - Verify: `cd ../.. && rg -q 'duplicateFingerprint|localVerification|implementationFingerprint|confirmedAt|implementedAt|verifiedAt|cancelledAt|archivedAt' apps/web/lib/db/schema.ts`
- [x] (CODE) Status, task type, answer kind, and active duplicate-fingerprint constraints are represented in schema or generated SQL.
  - Verify: `cd ../.. && rg -q 'analytics.*status.*check|analytics.*task.*type|duplicate.*fingerprint' apps/web/lib/db/schema.ts apps/web/drizzle/migrations`
- [x] (CODE) A new Drizzle migration file exists and contains only additive `CREATE TABLE`, `CREATE INDEX`, or `ALTER TABLE ADD` statements for this feature.
  - Verify: `cd ../.. && rg -l 'analytics_tasks|analytics_task_status_events' apps/web/drizzle/migrations | xargs rg -q 'CREATE TABLE|CREATE INDEX|ALTER TABLE.*ADD'`
- [x] (TEST) Schema tests cover task table creation and migration journal integrity.
  - Verify: `cd ../.. && pnpm --filter web test -- schema`

**Files to Create:**
- `apps/web/drizzle/migrations/*_analytics_tasks.sql` - Additive task tables and indexes.

**Files to Modify:**
- `apps/web/lib/db/schema.ts` - Add task tables, indexes, and checks.
- `apps/web/tests/schema.test.ts` - Cover new tables and constraints.

**Existing Code to Reference:**
- `apps/web/lib/db/schema.ts` - Existing `users`, `projects`, and `regenerateRequests` table style.
- `apps/web/drizzle/migrations/` - Current migration naming and journal pattern.

**Dependencies:**
- None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Data Model"

**Browser Verification:**
- Criteria IDs: None
- Notes: Database schema task.

---

#### Task 1.1.B: Create Task Domain Types, IDs, Fingerprints, And Query Helpers

**Description:**
Create the core analytics task domain modules for typed task contracts, ID generation, duplicate fingerprinting, ownership-guarded queries, and status-event inserts. This isolates task persistence from dashboard routes and MCP handlers.

**Requirement:** FEATURE_SPEC.md "Idempotency And Duplicate Prevention"; FEATURE_TECHNICAL_SPEC.md "Task Domain Services"

**Acceptance Criteria:**
- [x] (CODE) Task domain files exist for `types`, `ids`, `fingerprint`, and `queries`.
  - Verify: `cd ../.. && test -f apps/web/lib/analytics/tasks/types.ts && test -f apps/web/lib/analytics/tasks/ids.ts && test -f apps/web/lib/analytics/tasks/fingerprint.ts && test -f apps/web/lib/analytics/tasks/queries.ts`
- [x] (TEST) Query tests cover creating a pending task, writing a status event, selecting tasks by authenticated owner/project, and hiding foreign-user rows.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-queries`
- [x] (TEST) Duplicate fingerprint tests normalize question intent, task type, event name, trigger, target surface, and property schema.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-queries`
- [x] (TEST) Duplicate confirmation conflict handling returns the existing task instead of creating a second active task.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-queries`
- [x] (CODE) Query helpers never select raw OAuth tokens, GitHub installation tokens, Tinybird tokens, billing fields, raw visitor IDs, or source code.
  - Verify: `cd ../.. && ! rg -n 'accessToken|refreshToken|installationAccessToken|TINYBIRD|stripe|visitor_id|sourceCode' apps/web/lib/analytics/tasks/queries.ts`

**Files to Create:**
- `apps/web/lib/analytics/tasks/types.ts` - Task, draft, event contract, verification, and result types.
- `apps/web/lib/analytics/tasks/ids.ts` - Task and status-event ID generation.
- `apps/web/lib/analytics/tasks/fingerprint.ts` - Duplicate fingerprint normalization and hashing.
- `apps/web/lib/analytics/tasks/queries.ts` - Drizzle task reads/writes with ownership guards.
- `apps/web/tests/analytics-task-queries.test.ts` - Query, ownership, duplicate, and audit-event tests.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/db/queries/projects.ts` - Existing ID generation and ownership query style.
- `apps/web/tests/regenerate-requests-queries.test.ts` - Query-test structure for durable records.

**Dependencies:**
- Task 1.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Task Domain Services"

**Browser Verification:**
- Criteria IDs: None
- Notes: Data/domain task.

### Step 1.2: Custom Event Tracking And Verification Source Boundary

**Depends On:** Step 1.1

---

#### Task 1.2.A: Add Public SDK `track` API With Bundle Guard

**Description:**
Add a minimal custom event tracking API so coding agents have a first-class Tally SDK call for `track_completion`, `track_click`, and `add_event_property` tasks. The implementation should reuse the current SDK configuration, session, visitor, UTM, URL, referrer, and DNT behavior.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "SDK API"; AGENTS.md "SDK Constraints"

**Acceptance Criteria:**
- [x] (CODE) `track`, `EventProperties`, and custom event types are exported from `packages/sdk/src/index.ts`.
  - Verify: `cd ../.. && rg -q 'track|EventProperties' packages/sdk/src/index.ts packages/sdk/src/types.ts`
- [x] (TEST) SDK tests cover custom event success, invalid event names, no-init no-op, DNT behavior, and property serialization.
  - Verify: `cd ../.. && pnpm --filter sdk test -- tracker`
- [x] (TEST) Public API tests cover the new `track` export.
  - Verify: `cd ../.. && pnpm --filter sdk test -- public-api`
- [x] (BUILD) SDK builds successfully after adding custom tracking.
  - Verify: `cd ../.. && pnpm --filter sdk build`
- [x] (CODE) Built SDK remains under 3072 bytes gzipped.
  - Verify: `cd ../.. && test "$(gzip -c packages/sdk/dist/index.js | wc -c | tr -d ' ')" -lt 3072`

**Files to Create:**
- None

**Files to Modify:**
- `packages/sdk/src/core.ts` - Implement `track`.
- `packages/sdk/src/tracker.ts` - Add custom event builder and event-name validation helpers.
- `packages/sdk/src/types.ts` - Add event property and custom event types.
- `packages/sdk/src/index.ts` - Export public API.
- `packages/sdk/test/tracker-custom-events.test.ts` - Add custom event coverage.
- `packages/sdk/test/public-api.test.ts` - Add public export coverage.
- `packages/sdk/test/types.test.ts` - Add type coverage if needed.

**Existing Code to Reference:**
- `packages/sdk/src/core.ts` - Current config/session/DNT behavior.
- `packages/sdk/src/tracker.ts` - Current event builder and post behavior.
- `packages/sdk/test/tracker-v2-integration.test.ts` - Existing V2 event shape tests.

**Dependencies:**
- None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Event Schema And SDK Changes"

**Browser Verification:**
- Criteria IDs: None
- Notes: SDK package task.

---

#### Task 1.2.B: Expand Event Ingestion, Tinybird Schema, And E2E Fixture Parsing

**Description:**
Expand the event ingestion path and local analytics fixture parser to support custom event names, serialized event properties, and explicit `environment` markers. This establishes the boundary between local/test evidence and production verification evidence.

**Requirement:** FEATURE_SPEC.md "Verification Model"; FEATURE_TECHNICAL_SPEC.md "Ingestion Route", "Tinybird Datasource", and "E2E Fixture Parser"

**Acceptance Criteria:**
- [x] (CODE) Events route validation accepts lower-snake-case custom event names, `event_properties`, and `environment`.
  - Verify: `cd ../.. && rg -q 'event_properties|environment|production|development|test' apps/events/app/v1/track/route.ts`
- [x] (TEST) Events route tests cover custom events, invalid event names, environment defaults, oversized properties, and fixture sink preservation.
  - Verify: `cd ../.. && pnpm --filter web test -- events`
- [x] (CODE) Tinybird datasource includes `environment` and `event_properties` columns, and migration commands are documented in a script or note.
  - Verify: `cd ../.. && rg -q 'environment|event_properties' tinybird/datasources/events.datasource && rg -q 'tb datasource alter.*events.*environment|tb datasource alter.*events.*event_properties' scripts apps/web/scripts docs`
- [x] (CODE) Tinybird migration documentation includes a staging-first verification gate with `tb datasource alter`, `tb sql`, expected output, and production application blocked until staging verification is recorded.
  - Verify: `cd ../.. && for term in 'staging' 'tb datasource alter' 'tb sql' 'production.*blocked' 'verification result'; do rg -q "$term" scripts apps/web/scripts docs || exit 1; done`
- [x] (TEST) E2E fixture parser tests cover generic events, environment defaults, production/test distinction, and event property parsing.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-analytics-fixtures`
- [x] (TEST) Existing overview, sessions, and live fixture semantics still treat only `page_view` and `session_start` as dashboard traffic metrics.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-analytics-fixtures analytics-overview-api analytics-sessions-api analytics-live-feed-api`

**Files to Create:**
- `scripts/tinybird-dashboard-pending-tasks.sql` or `scripts/tinybird-dashboard-pending-tasks.md` - Reproducible Tinybird alter commands and verification query.

**Files to Modify:**
- `apps/events/app/v1/track/route.ts` - Expand event schema and validation.
- `tinybird/datasources/events.datasource` - Add additive columns.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Parse custom events and environment.
- `apps/web/tests/e2e-analytics-fixtures.test.ts` - Cover new fixture semantics.
- Relevant events route tests - Cover ingest behavior.

**Existing Code to Reference:**
- `apps/events/lib/e2e-fixture-sink.ts` - Local fixture sink behavior.
- `apps/events/lib/tinybird.ts` - Tinybird append behavior.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Current fixture parser and dashboard metrics semantics.

**Dependencies:**
- Task 1.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Event Schema And SDK Changes"

**Browser Verification:**
- Criteria IDs: None
- Notes: Event pipeline task.

### Step 1.3: MCP Authorization Boundary

**Depends On:** None

---

#### Task 1.3.A: Add Dedicated `mcp:tasks` OAuth Scope

**Description:**
Add a separate MCP task scope while preserving existing install behavior. The shared MCP route should authenticate tokens with supported MCP scopes, and individual tool handlers or shared middleware should enforce `mcp:install` or `mcp:tasks` per tool.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Decision 7: Add A Dedicated MCP Task Scope"; FEATURE_SPEC.md "Security"

**Acceptance Criteria:**
- [x] (CODE) OAuth validation and metadata expose both `mcp:install` and `mcp:tasks` and support space-delimited scope sets.
  - Verify: `cd ../.. && rg -q 'MCP_TASKS_SCOPE|mcp:tasks|scopes_supported' apps/web/lib/oauth/validation.ts apps/web/lib/oauth/metadata.ts`
- [x] (TEST) OAuth validation tests cover install-only, tasks-only, combined install plus tasks, unsupported scope, and missing scope defaults.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth`
- [x] (CODE) MCP route auth no longer globally requires only `mcp:install`; per-tool scope checks are represented in tool code or shared helper code.
  - Verify: `cd ../.. && rg -q 'requiredScopes|MCP_TASKS_SCOPE|requireMcpScope|hasMcpScope' apps/web/app/api/mcp/route.ts apps/web/lib/mcp`
- [x] (TEST) Existing install tool tests prove `prepare_nextjs_install_patch` still works with install authority.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route mcp-next-install mcp-auth`
- [x] (TEST) Scope tests prove install-only tokens cannot list, read, or update analytics tasks.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks mcp-auth`

**Files to Create:**
- Optional `apps/web/lib/mcp/tools/auth.ts` - Shared per-tool auth/scope helper if not folded into an existing module.

**Files to Modify:**
- `apps/web/lib/oauth/validation.ts` - Add task scope and scope-set validation.
- `apps/web/lib/oauth/metadata.ts` - Advertise supported scopes.
- `apps/web/lib/oauth/tokens.ts` - Preserve multi-scope token records if needed.
- `apps/web/app/api/oauth/authorize/route.ts` - Accept requested scope sets if needed.
- `apps/web/app/api/oauth/token/route.ts` - Preserve scope sets in token responses if needed.
- `apps/web/app/api/mcp/route.ts` - Adjust route-level accepted scope behavior.
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Enforce install scope explicitly if route-level enforcement changes.
- `apps/web/tests/mcp-auth.test.ts` and OAuth tests - Add scope coverage.

**Existing Code to Reference:**
- `apps/web/lib/oauth/validation.ts` - Current single-scope validation.
- `apps/web/app/api/mcp/route.ts` - Current route-level auth wrapper.
- `apps/web/lib/mcp/auth.ts` - Token-to-auth-info mapping.

**Dependencies:**
- None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "MCP Tools" and "Security And Privacy"

**Browser Verification:**
- Criteria IDs: None
- Notes: OAuth/MCP auth task.

### Phase 1 Checkpoint

**Automated Checks:**
- [x] (TEST) Task schema/query, SDK, event ingest, fixture, OAuth, and MCP auth tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- schema analytics-task-queries e2e-analytics-fixtures mcp-auth mcp-oauth mcp-route && pnpm --filter sdk test`
- [x] (BUILD) SDK builds and remains under the bundle limit.
  - Verify: `cd ../.. && pnpm --filter sdk build && test "$(gzip -c packages/sdk/dist/index.js | wc -c | tr -d ' ')" -lt 3072`
- [x] (TYPE) Web type checking passes after schema, auth, and fixture changes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [x] (TEST) Existing MCP install and dashboard analytics route tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route mcp-next-install analytics-overview-api analytics-sessions-api analytics-live-feed-api`
- [x] (TEST) Existing SDK router and tracker tests still pass.
  - Verify: `cd ../.. && pnpm --filter sdk test -- app-router pages-router tracker`

---

## Phase 2: Task Services And Dashboard APIs

**Goal:** Build the server-side task lifecycle, answer generation contract, dashboard APIs, and verification service behind authenticated project ownership.
**Depends On:** Phase 1

### Pre-Phase Setup

- [x] (CODE) Phase 1 task tables, task domain modules, custom event fixture parsing, and `mcp:tasks` scope exist.
  - Verify: `cd ../.. && test -f apps/web/lib/analytics/tasks/queries.ts && rg -q 'analyticsTasks|MCP_TASKS_SCOPE|event_properties|environment' apps/web/lib/db/schema.ts apps/web/lib/oauth/validation.ts apps/web/lib/analytics/e2e-fixtures.ts`
- [x] (CODE) Dashboard project ownership route pattern is available for reuse.
  - Verify: `cd ../.. && rg -q 'getUserFromRequest|projects.userId' 'apps/web/app/api/projects/[id]/route.ts'`

### Step 2.1: Lifecycle And Verification Services

**Depends On:** Phase 1

---

#### Task 2.1.A: Implement Status Transitions And Idempotent Agent Evidence

**Description:**
Implement the task transition service that enforces allowed state changes, stores audit events, accepts idempotent retries, and treats agent evidence as untrusted local verification data.

**Requirement:** FEATURE_SPEC.md "Task Status Model" and "Idempotency And Duplicate Prevention"; FEATURE_TECHNICAL_SPEC.md "Status Transition Rules"

**Acceptance Criteria:**
- [ ] (CODE) `transitions.ts` exports one transition service used by API and MCP layers.
  - Verify: `cd ../.. && test -f apps/web/lib/analytics/tasks/transitions.ts && rg -q 'transitionAnalyticsTask' apps/web/lib/analytics/tasks/transitions.ts`
- [ ] (TEST) Transition tests cover all allowed transitions from the feature spec and reject unsupported backward transitions.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-transitions`
- [ ] (TEST) Repeated `in_progress`, repeated `implemented_locally` with the same fingerprint, and repeated `failed` with the same error are idempotent.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-transitions`
- [ ] (TEST) Local verification evidence is stored on the task but never sets `verified_at` or `status = 'verified'`.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-transitions`
- [ ] (CODE) File paths, command summaries, local event evidence, and error summaries are bounded and sanitized before persistence.
  - Verify: `cd ../.. && rg -q 'sanitize|changedFiles|verificationCommands|localEventEvidence|errorSummary' apps/web/lib/analytics/tasks/transitions.ts`

**Files to Create:**
- `apps/web/lib/analytics/tasks/transitions.ts` - Transition service and evidence sanitization.
- `apps/web/tests/analytics-task-transitions.test.ts` - Transition and idempotency tests.

**Files to Modify:**
- `apps/web/lib/analytics/tasks/types.ts` - Add transition/evidence result types if needed.
- `apps/web/lib/analytics/tasks/queries.ts` - Add update helpers if needed.

**Existing Code to Reference:**
- `features/dashboard_pending_tasks/FEATURE_SPEC.md` - Required transition table.
- `apps/web/lib/db/queries/projects.ts` - Existing query helper style.

**Dependencies:**
- Tasks 1.1.A and 1.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Status Transition Rules"

**Browser Verification:**
- Criteria IDs: None
- Notes: Server domain task.

---

#### Task 2.1.B: Implement Production Verification Service

**Description:**
Implement verification refresh logic that derives `awaiting_deploy` and `verified` from canonical production evidence. Local/test fixture events and agent-submitted evidence must never mark a task verified.

**Requirement:** FEATURE_SPEC.md "Verification Model"; FEATURE_TECHNICAL_SPEC.md "Verification Query"

**Acceptance Criteria:**
- [ ] (CODE) `verification.ts` exports `refreshAnalyticsTaskVerification` and production event/property matching helpers.
  - Verify: `cd ../.. && test -f apps/web/lib/analytics/tasks/verification.ts && rg -q 'refreshAnalyticsTaskVerification|implemented_at|environment|event_properties' apps/web/lib/analytics/tasks/verification.ts`
- [ ] (TEST) Verification tests mark matching production events after `implemented_at` as verified.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-verification`
- [ ] (TEST) Verification tests keep tasks unverified for matching local/test evidence and pre-implementation events.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-verification`
- [ ] (TEST) `add_event_property` tests keep tasks awaiting deploy when required properties are missing and include a sanitized missing-property reason.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-verification`
- [ ] (TEST) Task list refresh tests prove `implemented_locally` becomes `awaiting_deploy` when no matching production evidence exists.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-verification`

**Files to Create:**
- `apps/web/lib/analytics/tasks/verification.ts` - Production verification service.
- `apps/web/tests/analytics-task-verification.test.ts` - Production/test evidence coverage.

**Files to Modify:**
- `apps/web/lib/analytics/tasks/queries.ts` - Add verification read/update helpers.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Add helper exports if needed for verification queries.

**Existing Code to Reference:**
- `apps/web/lib/analytics/e2e-fixtures.ts` - Fixture loader and timestamp handling.
- `apps/web/lib/tinybird/client.ts` - Existing Tinybird query helper pattern.
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` - Current Tinybird read style.

**Dependencies:**
- Tasks 1.1.B and 1.2.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Verification Query"

**Browser Verification:**
- Criteria IDs: None
- Notes: Verification service task.

### Step 2.2: Question Interpretation And Dashboard APIs

**Depends On:** Step 2.1

---

#### Task 2.2.A: Implement Prompt-First Question Result Service

**Description:**
Implement the model-ready question interpretation service that returns one of `answered`, `partial_answer`, `cannot_answer_yet`, or `unsupported`, with deterministic fixture-backed mappings for seeded scenarios. The service must return optional non-persisted drafts and existing duplicate task summaries, not write task rows.

**Requirement:** FEATURE_SPEC.md "Dashboard Ask Flow"; FEATURE_TECHNICAL_SPEC.md "Decision 3"

**Acceptance Criteria:**
- [ ] (CODE) `question.ts` exports `interpretAnalyticsQuestion` with typed answer and draft result unions.
  - Verify: `cd ../.. && test -f apps/web/lib/analytics/tasks/question.ts && rg -q 'interpretAnalyticsQuestion|answered|partial_answer|cannot_answer_yet|unsupported' apps/web/lib/analytics/tasks/question.ts`
- [ ] (TEST) Question tests cover the seeded matrix for pricing visits, onboarding completion after pricing, upgrade CTA click, plan conversion after signup, and broad unsupported requests.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-question-api`
- [ ] (TEST) Draft results preserve stable task type, event name, trigger, required properties, and production verification requirement for seeded questions.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-question-api`
- [ ] (TEST) Existing duplicate tasks are returned as `existingTask` instead of a new draft.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-question-api`
- [ ] (CODE) The question service does not insert or update `analytics_tasks`.
  - Verify: `cd ../.. && ! rg -n 'insert\\(|update\\(|analyticsTasks' apps/web/lib/analytics/tasks/question.ts`

**Files to Create:**
- `apps/web/lib/analytics/tasks/question.ts` - Answer and draft interpretation service.
- `apps/web/tests/analytics-question-api.test.ts` - Question classification and no-persistence coverage.

**Files to Modify:**
- `apps/web/lib/analytics/tasks/types.ts` - Add answer/draft types if needed.
- `apps/web/lib/analytics/tasks/fingerprint.ts` - Add draft fingerprint input support if needed.

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` - Existing pageview/path data semantics.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Deterministic fixture source.

**Dependencies:**
- Tasks 1.1.B, 1.2.B, and 2.1.B

**Spec Reference:** FEATURE_SPEC.md "Dashboard Ask Flow"

**Browser Verification:**
- Criteria IDs: None
- Notes: Server/domain task.

---

#### Task 2.2.B: Add Dashboard Question And Task API Routes

**Description:**
Add authenticated dashboard API routes for asking questions, confirming pending tasks, listing task queue state, editing pending task fields, cancelling/archiving/reopening tasks, and deleting pending tasks by hiding them from the active queue.

**Requirement:** FEATURE_SPEC.md "Task Queue Flow"; FEATURE_TECHNICAL_SPEC.md "Dashboard APIs"

**Acceptance Criteria:**
- [ ] (CODE) Question and task API route files exist under `apps/web/app/api/projects/[id]/analytics/`.
  - Verify: `cd ../.. && test -f 'apps/web/app/api/projects/[id]/analytics/questions/route.ts' && test -f 'apps/web/app/api/projects/[id]/analytics/tasks/route.ts' && test -f 'apps/web/app/api/projects/[id]/analytics/tasks/[taskId]/route.ts'`
- [ ] (TEST) Question API tests prove `POST /questions` never persists a task and enforces authenticated project ownership.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-question-api`
- [ ] (TEST) Task API tests cover confirm, list with verification refresh, pending edit, pending delete to cancelled, archive, failed reopen, non-pending delete conflict, and duplicate confirmation.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-tasks-api`
- [ ] (TEST) Foreign user tests prove task IDs and project IDs are not exposed across accounts.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-tasks-api analytics-question-api`
- [ ] (CODE) API routes use `getUserFromRequest` and `projects.userId` ownership checks before task access.
  - Verify: `cd ../.. && rg -q 'getUserFromRequest|projects.userId' 'apps/web/app/api/projects/[id]/analytics/questions/route.ts' 'apps/web/app/api/projects/[id]/analytics/tasks/route.ts' 'apps/web/app/api/projects/[id]/analytics/tasks/[taskId]/route.ts'`

**Files to Create:**
- `apps/web/app/api/projects/[id]/analytics/questions/route.ts` - Ask endpoint.
- `apps/web/app/api/projects/[id]/analytics/tasks/route.ts` - List and confirm endpoint.
- `apps/web/app/api/projects/[id]/analytics/tasks/[taskId]/route.ts` - Edit, delete, cancel, archive, reopen endpoint.
- `apps/web/tests/analytics-tasks-api.test.ts` - Task API coverage.

**Files to Modify:**
- `apps/web/tests/analytics-question-api.test.ts` - Add route-level tests if split from service tests.

**Existing Code to Reference:**
- `apps/web/app/api/projects/[id]/route.ts` - Authenticated project ownership route pattern.
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts` - Existing analytics route response style.

**Dependencies:**
- Tasks 2.1.A, 2.1.B, and 2.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Dashboard APIs"

**Browser Verification:**
- Criteria IDs: None
- Notes: HTTP API task.

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] (TEST) Task domain, question, verification, and dashboard API tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-task-queries analytics-task-transitions analytics-task-verification analytics-question-api analytics-tasks-api`
- [ ] (TYPE) Web type checking passes after new API routes and task services.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [ ] (TEST) Existing project detail and analytics API route tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- project-detail-api project-detail-page analytics-overview-api analytics-live-feed-api analytics-sessions-api`
- [ ] (CODE) `POST /api/projects/[id]/analytics/questions` has no persistence call.
  - Verify: `cd ../.. && ! rg -n 'insert\\(|update\\(|analyticsTasks' 'apps/web/app/api/projects/[id]/analytics/questions/route.ts'`

---

## Phase 3: Dashboard Experience

**Goal:** Add the project-scoped Ask Tally UI, editable non-persisted draft confirmation, pending task queue, and status actions to the existing project dashboard.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] (CODE) Dashboard question and task APIs exist before UI wiring starts.
  - Verify: `cd ../.. && test -f 'apps/web/app/api/projects/[id]/analytics/questions/route.ts' && test -f 'apps/web/app/api/projects/[id]/analytics/tasks/route.ts'`
- [ ] (CODE) Existing project detail page and React Query hook patterns are available.
  - Verify: `cd ../.. && test -f 'apps/web/app/(dashboard)/projects/[id]/page.tsx' && test -f apps/web/lib/hooks/use-project.ts`

### Step 3.1: Hooks And Components

**Depends On:** Phase 2

---

#### Task 3.1.A: Add Dashboard Task Hooks And Reusable Components

**Description:**
Create React Query hooks and dashboard components for asking Tally, rendering answer results, editing non-persisted drafts, listing tasks, and showing task statuses. The UI should keep answer content before task confirmation and avoid creating tasks until confirmation.

**Requirement:** FEATURE_SPEC.md "Dashboard Ask Flow" and "Task Draft Editing And Deletion"; FEATURE_TECHNICAL_SPEC.md "Dashboard UI"

**Acceptance Criteria:**
- [ ] (CODE) Dashboard hooks exist for question submission and task list/mutation behavior.
  - Verify: `cd ../.. && test -f apps/web/lib/hooks/use-analytics-question.ts && test -f apps/web/lib/hooks/use-analytics-tasks.ts`
- [ ] (CODE) Ask panel, question result, task draft card, pending task list, and task status badge components exist.
  - Verify: `cd ../.. && test -f apps/web/components/dashboard/analytics-tasks/ask-tally-panel.tsx && test -f apps/web/components/dashboard/analytics-tasks/task-draft-card.tsx && test -f apps/web/components/dashboard/analytics-tasks/pending-task-list.tsx && test -f apps/web/components/dashboard/analytics-tasks/task-status-badge.tsx`
- [ ] (TEST) Component tests prove answered results show no Add task button, while partial and cannot-answer results show answer/gap content before the draft card.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components`
- [ ] (TEST) Component tests prove edit title/event/notes, dismiss/delete draft, confirm task, pending delete, cancel, and archive controls render with accessible labels.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components`
- [ ] (CODE) Async result regions include `aria-live="polite"` and status badges include text labels.
  - Verify: `cd ../.. && rg -q 'aria-live=\"polite\"|aria-live=\\{\"polite\"\\}' apps/web/components/dashboard/analytics-tasks && rg -q 'pending|implemented locally|awaiting deploy|verified|failed' apps/web/components/dashboard/analytics-tasks/task-status-badge.tsx`

**Files to Create:**
- `apps/web/lib/hooks/use-analytics-question.ts` - Ask Tally mutation hook.
- `apps/web/lib/hooks/use-analytics-tasks.ts` - Task query and mutation hooks.
- `apps/web/components/dashboard/analytics-tasks/ask-tally-panel.tsx` - Project-scoped question input.
- `apps/web/components/dashboard/analytics-tasks/analytics-question-result.tsx` - Answer/gap renderer.
- `apps/web/components/dashboard/analytics-tasks/task-draft-card.tsx` - Editable non-persisted draft card.
- `apps/web/components/dashboard/analytics-tasks/pending-task-list.tsx` - Task queue.
- `apps/web/components/dashboard/analytics-tasks/task-status-badge.tsx` - Text status badge.
- `apps/web/tests/dashboard-pending-tasks-components.test.tsx` - Component and accessibility rendering tests.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/hooks/use-project.ts` - React Query hook pattern and error handling.
- `apps/web/components/dashboard/status-badge.tsx` - Existing badge styling.
- `apps/web/components/dashboard/stat-card.tsx` - Dashboard component style.

**Dependencies:**
- Task 2.2.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Dashboard UI"

**Browser Verification:**
- Criteria IDs: BROWSER-DOM-3.1.A
- Notes: Components are verified more fully after page integration.

---

#### Task 3.1.B: Integrate Ask Tally And Task Queue Into Project Detail Page

**Description:**
Mount the Ask Tally panel and pending task list on the project detail page without disrupting existing project status, quota, onboarding, and GitHub/MCP project behavior. The queue should refresh after task confirmation and status mutations.

**Requirement:** FEATURE_SPEC.md "Core User Experience"; FEATURE_TECHNICAL_SPEC.md "Dashboard UI"

**Acceptance Criteria:**
- [ ] (CODE) Project detail page imports and renders the Ask Tally panel and pending task list for the current project ID.
  - Verify: `cd ../.. && rg -q 'AskTallyPanel|PendingTaskList|useAnalyticsTasks' 'apps/web/app/(dashboard)/projects/[id]/page.tsx'`
- [ ] (TEST) Project detail page tests render the Ask Tally input and task queue without removing existing waiting-for-first-event and GitHub-only control behavior.
  - Verify: `cd ../.. && pnpm --filter web test -- project-detail-page`
- [ ] (TEST) UI tests prove task confirmation invalidates or refreshes the task list query.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components project-detail-page`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Mount Ask Tally and task queue.
- `apps/web/tests/project-detail-page.test.ts` - Add page integration coverage.
- `apps/web/tests/dashboard-pending-tasks-components.test.tsx` - Add query invalidation coverage if needed.

**Existing Code to Reference:**
- `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Current project page structure and state handling.
- `apps/web/tests/project-detail-page.test.ts` - Existing static render pattern.

**Dependencies:**
- Task 3.1.A

**Spec Reference:** FEATURE_SPEC.md "Core User Experience"

**Browser Verification:**
- Criteria IDs: None
- Notes: Seeded browser routes are created and verified in Phase 5 after scenario fixtures exist.

### Step 3.2: Dashboard Behavior Tests

**Depends On:** Step 3.1

---

#### Task 3.2.A: Cover Dashboard Ask, Draft, Delete, And Status Copy States

**Description:**
Add focused tests for the dashboard flow states that are easy to regress: no task for answered questions, answer-first draft rendering, no persistence before confirmation, delete/dismiss behavior, and local implementation versus production verification copy.

**Requirement:** FEATURE_SPEC.md "Acceptance Criteria"; FEATURE_TECHNICAL_SPEC.md "Dashboard UI"

**Acceptance Criteria:**
- [ ] (TEST) Dashboard tests prove `answered` results do not create or show a task draft.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components analytics-question-api`
- [ ] (TEST) Dashboard tests prove dismiss/delete draft performs no task API persistence.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components analytics-tasks-api`
- [ ] (TEST) Dashboard tests prove pending delete hides the task from the active queue while history is preserved when requested.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components analytics-tasks-api`
- [ ] (TEST) Dashboard tests prove `implemented_locally`, `awaiting_deploy`, `verified`, `failed`, `cancelled`, and `archived` status copy is distinguishable.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components`
- [ ] (BROWSER:ACCESSIBILITY) Ask, confirm, edit, dismiss/delete, cancel, and archive controls are keyboard reachable in the dashboard flow.
  - Verify: `route=/projects/proj_dashboard_task_partial, selectors=[data-testid="ask-tally-input"],[data-testid="add-task-to-queue"],[data-testid="dismiss-task-draft"]`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/tests/dashboard-pending-tasks-components.test.tsx` - Add state and accessibility coverage.
- `apps/web/tests/project-detail-page.test.ts` - Add status copy coverage if needed.

**Existing Code to Reference:**
- `apps/web/tests/project-detail-page.test.ts` - Static render testing setup.
- `apps/web/components/dashboard/status-badge.tsx` - Existing status labeling style.

**Dependencies:**
- Tasks 3.1.A and 3.1.B

**Spec Reference:** FEATURE_SPEC.md "Acceptance Criteria"

**Browser Verification:**
- Criteria IDs: BROWSER-ACCESSIBILITY-3.2.A
- Notes: Final browser automation is implemented in Phase 5 harness.

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] (TEST) Dashboard component, project detail, question API, and task API tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- dashboard-pending-tasks-components project-detail-page analytics-question-api analytics-tasks-api`
- [ ] (TYPE) Web type checking passes after dashboard UI integration.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [ ] (TEST) Existing project detail states for GitHub projects and MCP no-event projects still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- project-detail-page projects-list-page live-feed-page`

**Browser Verification:**
- Criteria IDs: None
- Notes: Browser scenario verification is intentionally deferred to Phase 5, after checked-in scenario fixtures and the local harness exist.

---

## Phase 4: MCP Task Tools

**Goal:** Expose confirmed dashboard tasks through authenticated MCP tools, enforce project resolution and `mcp:tasks`, and accept idempotent local-agent status reports.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] (CODE) `mcp:tasks` scope, task query helpers, and transition services exist.
  - Verify: `cd ../.. && rg -q 'MCP_TASKS_SCOPE|transitionAnalyticsTask|listPending' apps/web/lib/oauth/validation.ts apps/web/lib/analytics/tasks`
- [ ] (CODE) Existing MCP server registration and install tool tests are present.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/server.ts && test -f apps/web/tests/mcp-route.test.ts`

### Step 4.1: MCP Schemas And Project Resolution

**Depends On:** Phase 2

---

#### Task 4.1.A: Add Task MCP Schemas, Scope Helper, And Project Resolution Adapter

**Description:**
Add Zod schemas and adapter logic for resolving task project context by explicit project ID or existing MCP repo fingerprint. This task also provides a shared `mcp:tasks` scope helper for task tools.

**Requirement:** FEATURE_SPEC.md "MCP Behavior"; FEATURE_TECHNICAL_SPEC.md "Shared Project Resolution Input"

**Acceptance Criteria:**
- [ ] (CODE) MCP task input schemas exist for list, context, and status-report tools.
  - Verify: `cd ../.. && rg -q 'listPendingAnalyticsTasks|analyticsTaskProjectResolver|reportAnalyticsTaskStatus' apps/web/lib/mcp/tools/schemas.ts apps/web/lib/mcp/tools`
- [ ] (CODE) Task MCP adapter reuses existing project fingerprint helpers instead of duplicating resolution.
  - Verify: `cd ../.. && rg -q 'buildMcpProjectFingerprintInput|mcpFingerprint|normalizeGitRemote' apps/web/lib/analytics/tasks/mcp.ts apps/web/lib/mcp/tools`
- [ ] (TEST) MCP project resolution tests cover explicit project ID, exact repo context, no match, ambiguity, and missing/ambiguous context with no cross-project fallback.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks mcp-project-queries`
- [ ] (TEST) Scope tests prove install-only tokens receive `insufficient_scope` for all three task tools.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks mcp-auth`
- [ ] (CODE) Tool output candidate lists are capped at 10 projects on ambiguity.
  - Verify: `cd ../.. && rg -q 'slice\\(0, 10\\)|limit\\(10\\)' apps/web/lib/analytics/tasks/mcp.ts apps/web/lib/mcp/tools/analytics-tasks.ts`

**Files to Create:**
- `apps/web/lib/analytics/tasks/mcp.ts` - MCP project resolution and result adapters.
- Optional `apps/web/lib/mcp/tools/auth.ts` - Shared tool auth/scope helper if not created in Phase 1.

**Files to Modify:**
- `apps/web/lib/mcp/tools/schemas.ts` - Add task tool schemas.
- `apps/web/tests/mcp-analytics-tasks.test.ts` - Add resolution and scope tests.
- `apps/web/tests/mcp-project-queries.test.ts` - Extend project resolution coverage if needed.

**Existing Code to Reference:**
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Existing structured MCP result pattern.
- `apps/web/lib/db/queries/projects.ts` - Existing MCP fingerprint helpers.

**Dependencies:**
- Tasks 1.3.A, 1.1.B, and 2.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "MCP Tools"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP/server task.

### Step 4.2: Task Tool Handlers

**Depends On:** Step 4.1

---

#### Task 4.2.A: Implement List And Context MCP Tools

**Description:**
Implement `list_pending_analytics_tasks` and `get_analytics_task_context` using owned project resolution and task query helpers. These tools should return compact `content` text plus structured task data with the original question, answer, analytics gap, event contract, verification criteria, implementation guidance, and dashboard URL.

**Requirement:** FEATURE_SPEC.md "MCP Behavior"; FEATURE_TECHNICAL_SPEC.md "`list_pending_analytics_tasks`" and "`get_analytics_task_context`"

**Acceptance Criteria:**
- [ ] (CODE) MCP server registers `list_pending_analytics_tasks` and `get_analytics_task_context`.
  - Verify: `cd ../.. && rg -q 'list_pending_analytics_tasks|get_analytics_task_context' apps/web/lib/mcp/server.ts apps/web/lib/mcp/tools/analytics-tasks.ts`
- [ ] (TEST) Tool tests cover `ready`, `no_tasks`, `needs_project_selection`, `no_matching_project`, `unauthorized`, and `insufficient_scope` statuses.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks`
- [ ] (TEST) Context tool tests assert original question, current answer, analytics gap, event contract, local verification, production verification, guidance, status, and dashboard URL.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks`
- [ ] (TEST) MCP output sanitization tests prove no OAuth tokens, GitHub tokens, Tinybird tokens, raw visitor IDs, raw user IDs, or source code appear in tool results.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks`
- [ ] (CODE) Tool results include `structuredContent` and compact text `content`.
  - Verify: `cd ../.. && rg -q 'structuredContent|content' apps/web/lib/mcp/tools/analytics-tasks.ts`

**Files to Create:**
- `apps/web/lib/mcp/tools/analytics-tasks.ts` - Task list/context/status tool handlers and result shaping.

**Files to Modify:**
- `apps/web/lib/mcp/server.ts` - Register task tools.
- `apps/web/tests/mcp-route.test.ts` - Assert registration.
- `apps/web/tests/mcp-analytics-tasks.test.ts` - Add list/context coverage.

**Existing Code to Reference:**
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - Structured content result shape.
- `apps/web/tests/mcp-route.test.ts` - Tool registration and callback test pattern.

**Dependencies:**
- Task 4.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "MCP Tools"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP tool task.

---

#### Task 4.2.B: Implement Status Report MCP Tool

**Description:**
Implement `report_analytics_task_status` so an agent can report `in_progress`, `implemented_locally`, or `failed` with sanitized evidence. The tool should delegate to transition and verification services and return Tally-derived status.

**Requirement:** FEATURE_SPEC.md "MCP Behavior" and "Verification Model"; FEATURE_TECHNICAL_SPEC.md "`report_analytics_task_status`"

**Acceptance Criteria:**
- [ ] (CODE) MCP server registers `report_analytics_task_status`.
  - Verify: `cd ../.. && rg -q 'report_analytics_task_status' apps/web/lib/mcp/server.ts apps/web/lib/mcp/tools/analytics-tasks.ts`
- [ ] (TEST) Status report tests cover `in_progress`, repeated `in_progress`, `implemented_locally`, repeated implementation fingerprint, `failed`, and foreign task denial.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks analytics-task-transitions`
- [ ] (TEST) Local event evidence submitted through MCP is stored as local evidence but does not verify the task.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks analytics-task-verification`
- [ ] (TEST) `implemented_locally` reports trigger verification refresh and return `verified` when production evidence already exists, otherwise `awaiting_deploy`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks analytics-task-verification`
- [ ] (CODE) Tool validates changed files as relative paths and bounds evidence arrays before persistence.
  - Verify: `cd ../.. && rg -q 'changedFiles|relative|verificationCommands|localEventEvidence' apps/web/lib/mcp/tools/analytics-tasks.ts apps/web/lib/analytics/tasks/transitions.ts`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/mcp/tools/analytics-tasks.ts` - Add status report handler.
- `apps/web/tests/mcp-analytics-tasks.test.ts` - Add status report and idempotency coverage.

**Existing Code to Reference:**
- `apps/web/lib/analytics/tasks/transitions.ts` - Transition service.
- `apps/web/lib/analytics/tasks/verification.ts` - Verification refresh service.

**Dependencies:**
- Tasks 2.1.A, 2.1.B, and 4.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "`report_analytics_task_status`"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP tool task.

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] (TEST) MCP task, auth, route, project-query, transition, and verification tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-analytics-tasks mcp-auth mcp-route mcp-project-queries analytics-task-transitions analytics-task-verification`
- [ ] (TYPE) Web type checking passes after MCP task tools.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [ ] (TEST) Existing install MCP tests still pass with the new scope model.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install mcp-route mcp-auth`
- [ ] (CODE) MCP task tools cannot create tasks through MCP.
  - Verify: `cd ../.. && ! rg -n 'insert\\(|create.*Task|confirm.*Task' apps/web/lib/mcp/tools/analytics-tasks.ts`

---

## Phase 5: Agent-Runnable Flow Harness And Hardening

**Goal:** Add deterministic scenarios and an end-to-end harness that drives browser UI, MCP task tools, and production/test verification evidence, then finish documentation and full regression checks.
**Depends On:** Phase 4

### Pre-Phase Setup

- [ ] (CODE) Flow verification plan is applicable and names the required browser, MCP, and event-fixture channels.
  - Verify: `rg -q 'Status: Applicable' FLOW_VERIFICATION_PLAN.md && rg -q 'Browser UI|MCP over|fixture' FLOW_VERIFICATION_PLAN.md`
- [ ] (CODE) Dashboard UI and MCP task tools exist before building the harness.
  - Verify: `cd ../.. && test -f apps/web/components/dashboard/analytics-tasks/ask-tally-panel.tsx && test -f apps/web/lib/mcp/tools/analytics-tasks.ts`
- [ ] (CODE) Local E2E scenario seeder exists and has the non-local database guard.
  - Verify: `cd ../.. && test -f apps/web/scripts/seed-e2e-scenario.mjs && rg -q 'E2E_ALLOW_REMOTE_SEED' apps/web/scripts/seed-e2e-scenario.mjs`

### Step 5.1: Scenarios And Seeder

**Depends On:** Phase 4

---

#### Task 5.1.A: Add Pending Task Scenario Schema And Deterministic Fixtures

**Description:**
Extend local scenario validation and seeding so the dashboard question matrix, pending task queue, production verification, missing-property verification, and MCP ambiguity states can be created without a human account.

**Requirement:** FEATURE_SPEC.md "Account-free local testing"; FEATURE_TECHNICAL_SPEC.md "Scenario Fixtures"; FLOW_VERIFICATION_PLAN.md "Setup/State"

**Acceptance Criteria:**
- [ ] (CODE) Scenario contracts support `analyticsTasks`, generic `analytics.events[].event_type`, `environment`, and `event_properties`.
  - Verify: `cd ../.. && rg -q 'analyticsTasks|event_properties|environment' apps/web/scripts/seed-e2e-scenario.mjs apps/web/tests/e2e-scenarios.test.ts`
- [ ] (CODE) Required dashboard and MCP pending-task scenario files exist.
  - Verify: `cd ../.. && test -f apps/web/e2e/scenarios/dashboard-task-question-answered.json && test -f apps/web/e2e/scenarios/dashboard-task-question-partial.json && test -f apps/web/e2e/scenarios/dashboard-task-question-cannot-answer.json && test -f apps/web/e2e/scenarios/dashboard-task-question-unsupported.json && test -f apps/web/e2e/scenarios/mcp-pending-analytics-task.json`
- [ ] (TEST) Scenario tests validate unique users/projects/tasks, task status values, MCP fingerprints, production/test environment markers, and required property fixtures.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-scenarios`
- [ ] (TEST) Seeder tests or scenario replay prove task rows and event fixtures are written and cleaned idempotently.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-scenarios e2e-analytics-fixtures`
- [ ] (CODE) Seeder cleanup deletes analytics task rows before projects/users so reruns are idempotent.
  - Verify: `cd ../.. && rg -q 'DELETE FROM analytics_task_status_events|DELETE FROM analytics_tasks' apps/web/scripts/seed-e2e-scenario.mjs`

**Files to Create:**
- `apps/web/e2e/scenarios/dashboard-task-question-answered.json`
- `apps/web/e2e/scenarios/dashboard-task-question-partial.json`
- `apps/web/e2e/scenarios/dashboard-task-question-cannot-answer.json`
- `apps/web/e2e/scenarios/dashboard-task-question-unsupported.json`
- `apps/web/e2e/scenarios/dashboard-task-duplicate-existing.json`
- `apps/web/e2e/scenarios/dashboard-task-agent-implemented-awaiting-deploy.json`
- `apps/web/e2e/scenarios/dashboard-task-production-verified.json`
- `apps/web/e2e/scenarios/dashboard-task-production-missing-property.json`
- `apps/web/e2e/scenarios/mcp-pending-analytics-task.json`
- `apps/web/e2e/scenarios/mcp-pending-analytics-task-ambiguous-project.json`

**Files to Modify:**
- `apps/web/scripts/seed-e2e-scenario.mjs` - Validate, seed, replay, and clean task/evidence fixtures.
- `apps/web/tests/e2e-scenarios.test.ts` - Extend scenario schema tests.
- `apps/web/lib/analytics/e2e-fixtures.ts` - Add helper behavior if needed by scenario replay.

**Existing Code to Reference:**
- `apps/web/e2e/scenarios/mcp-active-with-events.json` - Existing MCP scenario shape.
- `apps/web/scripts/seed-e2e-scenario.mjs` - Current seeding and cleanup style.
- `apps/web/tests/e2e-scenarios.test.ts` - Scenario contract tests.

**Dependencies:**
- Tasks 1.1.A, 1.2.B, 2.2.B, and 4.2.B

**Spec Reference:** FLOW_VERIFICATION_PLAN.md "Setup/State"

**Browser Verification:**
- Criteria IDs: None
- Notes: Scenario data task.

### Step 5.2: End-To-End Harness And Documentation

**Depends On:** Step 5.1

---

#### Task 5.2.A: Add Browser Plus MCP Pending Tasks Self-Test Harness

**Description:**
Add the agent-runnable harness that applies or validates local migrations, starts the local app, seeds scenarios, logs in through E2E auth, drives the dashboard Ask Tally flow with Playwright, calls MCP task tools through the MCP SDK, replays local/test and production fixtures, asserts status transitions, captures evidence, and tears down local state.

**Requirement:** FLOW_VERIFICATION_PLAN.md "Harness Shape", "Driver", "Assertions", "Evidence", and "Teardown/Rerun"

**Acceptance Criteria:**
- [ ] (CODE) Harness script exists and is wired to `pnpm --filter web e2e:mcp-pending-tasks`.
  - Verify: `cd ../.. && test -f apps/web/scripts/mcp-pending-tasks-self-test.mjs && rg -q 'e2e:mcp-pending-tasks' apps/web/package.json`
- [ ] (TEST) Harness drives browser UI, MCP SDK client calls, and fixture replay rather than only importing service functions.
  - Verify: `cd ../.. && rg -q 'playwright|StreamableHTTPClientTransport|list_pending_analytics_tasks|report_analytics_task_status|E2E_ANALYTICS_FIXTURE_DIR' apps/web/scripts/mcp-pending-tasks-self-test.mjs`
- [ ] (TEST) Harness asserts answered, partial, cannot-answer, unsupported, confirm, dismiss/delete, pending delete, duplicate, MCP context, idempotent status report, test-event non-verification, missing-property non-verification, production verification, ambiguity, foreign task, and install-only insufficient-scope cases.
  - Verify: `cd ../.. && rg -q 'dashboard-answered|dashboard-confirm-task|mcp-task-context|agent-status-idempotency|production-verification|insufficient-scope' apps/web/scripts/mcp-pending-tasks-self-test.mjs`
- [ ] (TEST) Harness prints compact JSON evidence with stage names on success and sanitized failure summaries on failure.
  - Verify: `cd ../.. && rg -q '\"ok\"|\"flow\"|\"stages\"|dashboard_pending_tasks' apps/web/scripts/mcp-pending-tasks-self-test.mjs`
- [ ] (CODE) Harness applies or validates local database migrations with `pnpm --filter web db:push` before seeding task rows.
  - Verify: `cd ../.. && rg -q 'db:push|apply.*migration|migrations' apps/web/scripts/mcp-pending-tasks-self-test.mjs`
- [ ] (TEST) Harness can be run locally and exits successfully against deterministic fixtures.
  - Verify: `cd ../.. && pnpm --filter web e2e:mcp-pending-tasks`

**Files to Create:**
- `apps/web/scripts/mcp-pending-tasks-self-test.mjs` - Browser plus MCP plus fixture self-test harness.

**Files to Modify:**
- `apps/web/package.json` - Add `e2e:mcp-pending-tasks` script.

**Existing Code to Reference:**
- `apps/web/scripts/mcp-self-test.mjs` - Local server startup, port checks, OAuth token setup, cleanup, and MCP client patterns.
- `apps/web/scripts/stripe-billing-harness.mjs` - If present, local harness stage summary and cleanup patterns.
- `apps/web/e2e/scenario-seed.spec.ts` - Playwright scenario assertions.

**Dependencies:**
- Task 5.1.A and all prior phases

**Spec Reference:** FLOW_VERIFICATION_PLAN.md "Driver"

**Browser Verification:**
- Criteria IDs: BROWSER-DOM-5.2.A, BROWSER-CONSOLE-5.2.A
- Notes: Harness owns browser verification for this feature.

---

#### Task 5.2.B: Document Harness And Final Regression Commands

**Description:**
Document the new agent-runnable dashboard pending task verification command and finish feature-level regression hardening. This phase ensures future agents know how to seed and verify the flow without a human GitHub account or production Tinybird data.

**Requirement:** FEATURE_SPEC.md "Account-free local testing"; FLOW_VERIFICATION_PLAN.md "Evidence" and "Teardown/Rerun"

**Acceptance Criteria:**
- [ ] (CODE) `docs/agent-testing.md` documents `pnpm --filter web e2e:mcp-pending-tasks`, required local env, and the no-human-account boundary.
  - Verify: `cd ../.. && rg -q 'e2e:mcp-pending-tasks|dashboard pending|E2E_TEST_MODE|no human GitHub account' docs/agent-testing.md`
- [ ] (TEST) Full web unit test suite passes.
  - Verify: `cd ../.. && pnpm --filter web test`
- [ ] (TEST) Scenario contract list passes.
  - Verify: `cd ../.. && pnpm --filter web e2e:scenarios`
- [ ] (TEST) SDK test and build plus bundle-size guard pass.
  - Verify: `cd ../.. && pnpm --filter sdk test && pnpm --filter sdk build && test "$(gzip -c packages/sdk/dist/index.js | wc -c | tr -d ' ')" -lt 3072`
- [ ] (TYPE) Web type checking passes after all feature work.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (TEST) Final harness and docs prove the flow works without GitHub App access or a human GitHub account.
  - Verify: `cd ../.. && rg -q 'without GitHub App|no GitHub App|no human GitHub account' apps/web/scripts/mcp-pending-tasks-self-test.mjs docs/agent-testing.md`

**Files to Create:**
- None

**Files to Modify:**
- `docs/agent-testing.md` - Add pending task harness instructions.
- `features/dashboard_pending_tasks/EXECUTION_PLAN.md` - Check off completed tasks during implementation.

**Existing Code to Reference:**
- `docs/agent-testing.md` - Existing scenario and fixture testing guidance.
- `AGENTS.md` - Existing local E2E and Tinybird guardrails.

**Dependencies:**
- Task 5.2.A

**Spec Reference:** FLOW_VERIFICATION_PLAN.md "Evidence" and "Teardown/Rerun"

**Browser Verification:**
- Criteria IDs: None
- Notes: Documentation and regression task.

### Phase 5 Checkpoint

**Automated Checks:**
- [ ] (TEST) Agent-runnable flow harness passes.
  - Verify: `cd ../.. && pnpm --filter web e2e:mcp-pending-tasks`
- [ ] (TEST) Full web test suite passes.
  - Verify: `cd ../.. && pnpm --filter web test`
- [ ] (TEST) Scenario contract listing passes.
  - Verify: `cd ../.. && pnpm --filter web e2e:scenarios`
- [ ] (TEST) SDK tests, build, and bundle-size guard pass.
  - Verify: `cd ../.. && pnpm --filter sdk test && pnpm --filter sdk build && test "$(gzip -c packages/sdk/dist/index.js | wc -c | tr -d ' ')" -lt 3072`
- [ ] (TYPE) Web type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`

**Regression Verification:**
- [ ] (TEST) Existing MCP install, OAuth, project detail, analytics, and events tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route mcp-next-install mcp-auth mcp-oauth project-detail-page analytics-overview-api analytics-sessions-api analytics-live-feed-api events`
- [ ] (CODE) Primary active workstream in `plans/PLAN_STATUS.md` remains `features/mcp_onboarding/` unless the human explicitly promotes this feature.
  - Verify: `cd ../.. && rg -q 'Primary active workstream: \`features/mcp_onboarding/\`' plans/PLAN_STATUS.md`
- [ ] (BROWSER:DOM) The flow harness proves the dashboard, MCP, and production verification channels end to end.
  - Verify: `cd ../.. && pnpm --filter web e2e:mcp-pending-tasks`
