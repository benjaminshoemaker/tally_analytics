# AGENTS.md - Analytics SaaS Platform

Project-wide workflow guidance for AI agents working in this project.

## Instruction Hierarchy

- This file is the durable, project-wide baseline.
- Initial greenfield execution guidance lives in `plans/greenfield/AGENTS.md`.
- Feature execution guidance lives in `features/<name>/AGENTS.md`.
- When working in a scoped directory, read this file first, then the local `AGENTS.md` or `CLAUDE.md` in that directory.

## Project Context

Greenfield planning documents now live in `plans/greenfield/`. Project-specific durable guidance appears below.

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

| Rule | Details |
|------|---------|
| Branch | `task-{id}` (e.g., `task-1.1.A`) or `phase-{N}` for feature work |
| Commit | `task({id}): {description}` |
| Scope | Only modify task-relevant files |
| Ignore | Never commit `.env`, `node_modules`, build output |

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

*The agent discovers project conventions (error handling, mocking strategies, naming patterns) from the existing codebase. This document only covers workflow mechanics.*
