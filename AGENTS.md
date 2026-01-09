# AGENTS.md - Analytics SaaS Platform

> Workflow guidelines for AI agents in a worktree-based development process.

## Workflow Overview

```
HUMAN (Orchestrator)
├── Completes pre-phase setup
├── Assigns tasks from EXECUTION_PLAN.md
├── Reviews and approves at phase checkpoints

AGENT (Executor)
├── Executes one task at a time
├── Works in git branch
├── Follows TDD: tests first, then implementation
├── Runs verification against acceptance criteria
└── Reports completion or blockers
```

## Execution Hierarchy

| Level | Managed By | Boundary |
|-------|------------|----------|
| Phase | Human | Manual testing, approval gate |
| Step | Human | Git merge of parallel worktrees |
| Task | Agent | Single focused implementation |

---

## Before Starting Any Task

1. **Read CLAUDE.md** at the project root (if it exists)
2. **Check `.claude/`** directory for project-specific skills and instructions
3. **Explore the codebase** to understand existing patterns and conventions
4. **Review the task** — acceptance criteria, dependencies, spec references
5. **Ask if unclear** — Don't guess on ambiguous requirements

---

## Task Execution

1. **Verify dependencies exist** — Check that prior tasks are merged and working
2. **Write tests first** — One test per acceptance criterion
3. **Implement** — Minimum code to pass tests
4. **Run verification** — Use the code-verification skill against acceptance criteria
5. **Update progress** — Mark acceptance criteria checkboxes as complete in EXECUTION_PLAN.md
6. **Commit** — Format: `task(1.1.A): brief description`

---

## Progress Tracking

When completing tasks from EXECUTION_PLAN.md, update checkboxes to track progress:

### Acceptance Criteria
```markdown
# Before completing criterion
- [ ] User can log in with email and password

# After completing criterion
- [x] User can log in with email and password
```

### Phase Checkpoints

At phase checkpoint:
1. Complete all automated checks (tests, typecheck, lint)
2. Complete all manual verification steps
3. Mark checkpoint items as complete
4. Get human approval before proceeding to next phase

---

## Context Management

### Starting a new task
Start a **fresh conversation** for each new task. Before working, load:
1. `AGENTS.md` (this file)
2. `TECHNICAL_SPEC.md` (architecture reference)
3. The task definition from `EXECUTION_PLAN.md`

Read source files and tests on-demand as needed. Do not preload the entire codebase.

### Why fresh context per task?
- Each task is self-contained with complete instructions
- Decisions from previous tasks exist in the code, not conversation history
- Stale context causes confusion and wastes tokens
- The code and tests are the source of truth

### When to preserve context
**Within a single task**, if tests fail or issues arise, continue in the same conversation to debug:

```
Task starts (fresh context)
    → Implement
    → Test fails
    → Debug (keep context)
    → Fix
    → Tests pass
    → Task complete
Next task (fresh context)
```

Only clear context when moving to the next task, not while iterating on the current one.

### Resuming work after a break
When returning to a project:
1. Start a fresh conversation
2. Load `AGENTS.md`, `TECHNICAL_SPEC.md`
3. Check `EXECUTION_PLAN.md` to find the current task
4. Run tests to verify current state
5. Continue from where you left off

Do not attempt to reconstruct previous conversation context.

---

## Worktree Context

You're likely running in an isolated git worktree:

```
../worktrees/task-1.1.A/    ← You are here
├── [full repo clone]
└── .git                    ← Links to main repo
```

**Key implications:**
- Your branch is isolated until the human merges
- Don't depend on work from parallel worktrees
- Only modify files relevant to your task

---

## When to Stop and Ask

Stop and ask the human if:
- A dependency is missing (file, function, or service doesn't exist)
- You need environment variables or secrets you don't have
- An external dependency or major architectural change seems required
- A test is failing and you cannot determine why **after reading the full error output**
- Acceptance criteria are ambiguous
- You need to modify files outside the task scope
- You're unsure whether a change is user-facing

**Read the full error output before attempting fixes.** The answer is usually in the stack trace. Do not guess or work around.

---

## Blocker Report Format

```
BLOCKED: Task {id}
Issue: {what's wrong}
Tried: {approaches attempted}
Need: {what would unblock}
```

---

## Completion Report

When done, briefly report:
- What was built (1-2 sentences)
- Files created/modified
- Test status (passing/failing)
- Commit hash

Keep it concise. The human can review the diff for details.

---

## Deferred Work

When a task is intentionally paused or skipped:
- Report it clearly to the human
- Note the reason and what would unblock it
- The human will update the execution plan accordingly

---

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

## Testing Policy

- Tests must exist for all acceptance criteria
- Tests must pass before reporting complete
- Never skip or disable tests to make them pass
- If tests won't pass, report as a blocker
- **Never claim "working" when any functionality is disabled or broken**

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

## Browser Verification

For tasks marked **"Requires Browser Verification: Yes"**:

1. Start dev server if not running: `pnpm dev`
2. Navigate to relevant pages specified in acceptance criteria
3. Verify each UI criterion visually:
   - Elements render correctly
   - Interactions work (clicks, hovers, dropdowns)
   - Error states display properly
4. Check browser console for errors
5. Test responsive behavior if applicable (resize or device emulation)

Report verification results:
- Screenshot descriptions for visual changes
- Any console errors encountered
- Deviations from acceptance criteria

If browser verification fails, continue debugging in the same conversation context (per existing workflow).

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
