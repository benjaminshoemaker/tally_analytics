# AGENTS.md - Analytics SaaS Platform

Project-wide workflow guidance for AI agents working in this project.

## Instruction Hierarchy

- This file is the durable, project-wide baseline.
- Archived plans and feature specs live under `plans/archive/`.
- Treat files in `plans/archive/` as historical context only. Do not use them as the current product plan unless the human explicitly says to resurrect a specific archived plan.
- Use `plans/PLAN_STATUS.md` as an orientation and workstream-status manifest, not as a single-plan execution lock. Explicit human direction in the current thread can authorize work on any non-archived planned feature.
- New implementation planning should create or update an explicitly named workstream instead of editing archived plans in place.
- When working in a scoped directory with a local `AGENTS.md` or `CLAUDE.md`, read this file first, then the local instructions.

## Project Context

Historical greenfield and feature planning documents have been archived to avoid confusing agents about the current direction. Current and approved planned workstreams are tracked in `plans/PLAN_STATUS.md`; at the time of writing, MCP-first analytics onboarding in `features/mcp_onboarding/` is the primary active feature.

Durable product context lives in:

- `docs/product/vision.md` — product thesis and positioning.
- `docs/product/user-flows.md` — canonical user flows.
- `docs/architecture.md` — high-level technical overview.

Future feature briefs may live under `features/*/FEATURE_BRIEF.md`. Treat those as scoped planning inputs until the human explicitly approves implementation or `plans/PLAN_STATUS.md` marks them active or approved planned work.

## Agent Testing Harness

Agent-readable local testing guidance lives in `docs/agent-testing.md`. Use this harness when you need to test product states, onboarding, project status, quota, regenerate actions, or analytics data without a human GitHub account.

Local env guidance lives in `docs/local-env.md`. The repo-root `.env.local` is the canonical local env file. App-local files such as `apps/web/.env.local` and `apps/events/.env.local` should be symlinks to `../../.env.local` or absent; do not keep divergent copies. Check with `pnpm env:check`.

Core commands:

```bash
pnpm --filter web e2e:scenarios
pnpm --filter web e2e:seed <scenario-id>
pnpm --filter web e2e:replay-events <scenario-id>
pnpm --filter web e2e --grep @scenario
```

Local scenarios live in `apps/web/e2e/scenarios/*.json`. The seeder creates deterministic app users, project records, GitHub installation-token records, and local analytics fixtures. Login through `/api/auth/e2e-login` only when `E2E_TEST_MODE=1`; never use a human GitHub account or personal OAuth/PAT credentials for local E2E.

When `E2E_TEST_MODE=1`, analytics API routes read `.e2e-fixtures/*/events.json` before Tinybird so campaign/session/live-feed tests are deterministic and account-free. Treat these fixtures as local product-state proof, not proof that Tinybird staging or production is healthy.

The seeder refuses non-local database URLs unless `E2E_ALLOW_REMOTE_SEED=1` is explicitly set. If `.env.local` points at a stale local Postgres port, override it explicitly for test runs, for example:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:seed analysis-failed-can-regenerate
```

GitHub sandbox guidance lives in `docs/github-sandbox.md`. Real GitHub App tests must target the sandbox org only. Use `pnpm --filter web github:sandbox:sync -- --org fast-pr-analytics-sandbox --dry-run` before creating or updating sandbox fixture repos.

## Follow-Up Items (TODOS.md)

During development, you may discover items outside the current task scope: refactoring opportunities, edge cases, documentation needs, technical debt, etc.

**When you identify a follow-up item:**

1. If `TODOS.md` doesn't exist yet, ask the human if it should be created to track follow-ups.

2. Add it to `TODOS.md` with context:

   ```markdown
   ## TODO: {Brief title}

   - **Source:** Task {id} or {file:line}
   - **Description:** {What needs to be done}
   - **Priority:** {Suggested: High/Medium/Low}
   - **Added:** {Date}
   ```

3. Prompt for prioritization at phase checkpoints:
   ```
   TODOS.md now has {N} items. Would you like to:
   - Review and prioritize them?
   - Add any to the current phase?
   - Defer to a future phase?
   ```

Do not silently ignore discovered issues. Do not scope-creep by fixing them without approval. Track them in `TODOS.md` and let the human decide.

---

## Git Rules

| Rule   | Details                                                          |
| ------ | ---------------------------------------------------------------- |
| Branch | `task-{id}` (e.g., `task-1.1.A`) or `phase-{N}` for feature work |
| Commit | `task({id}): {description}`                                      |
| Scope  | Only modify task-relevant files                                  |
| Ignore | Never commit `.env`, `node_modules`, build output                |

### Phase-Based Branching (Feature Work)

For multi-phase features, use one branch per phase instead of per-task:

```bash
git checkout -b phase-1-foundation
# All Phase 1 tasks committed to this branch
# PR created at phase checkpoint
```

**Branch lifecycle:**

1. Create branch from main before starting first task in phase
2. Commit after each task completion
3. Do not push until human reviews at checkpoint
4. Create PR for review at phase checkpoint
5. Merge after checkpoint approval

---

## SDK Constraints

### Bundle Size Limit

The SDK must remain under **3KB gzipped**. Check after any SDK changes:

```bash
# Build and measure
pnpm --filter sdk build
gzip -c packages/sdk/dist/index.js | wc -c

# Should output less than 3072 bytes
```

### Before SDK Changes

1. Measure current bundle size
2. Make changes
3. Re-measure and compare
4. If size increased significantly, consider:
   - Tree-shaking unused code
   - Moving optional features to separate entry points
   - Reviewing dependencies

---

## Database Migrations

### PostgreSQL (Drizzle)

For tasks involving PostgreSQL schema changes:

1. Update `apps/web/lib/db/schema.ts` to reflect new columns/tables
2. Generate migration: `pnpm --filter web db:generate`
3. Review generated SQL in `apps/web/drizzle/migrations/`
4. Apply migration: `pnpm --filter web db:push`
5. Verify existing tests pass — migrations should be additive/non-breaking when possible
6. Document rollback if migration is destructive (e.g., dropping tables)

For destructive migrations (DROP TABLE, DROP COLUMN):

- Ensure all code references are removed first
- Confirm in acceptance criteria that dependent code is deleted
- Note that this is irreversible in the completion report

### Tinybird

For tasks involving Tinybird schema changes:

1. **Test in staging first** using Tinybird workspace
2. **Add columns using CLI**:
   ```bash
   tb datasource alter <datasource> --add-column "<column_definition>"
   ```
3. **Verify with query**:
   ```bash
   tb sql "SELECT * FROM <datasource> LIMIT 1"
   ```
4. **Document migration commands** in a script for reproducibility

**Important:** Tinybird column additions are non-reversible. Test thoroughly before applying to production.

### One-Time Scripts

For data migrations or one-time operations:

- Place in `scripts/` directory
- Make idempotent when possible
- Log success/failure for each operation

---

## Critical Guardrails

- **Do not duplicate files to work around issues** — fix the original
- **Do not guess** — if you can't access something, say so
- **Read error output fully** before attempting fixes
- Make the smallest change that satisfies the acceptance criteria
- Do not introduce new APIs without noting it for spec updates

---

_The agent discovers project conventions (error handling, mocking strategies, naming patterns) from the existing codebase. This document only covers workflow mechanics._
