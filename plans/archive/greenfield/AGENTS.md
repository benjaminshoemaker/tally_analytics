# AGENTS.md

Scoped execution guidance for the initial greenfield build.

Base project rules live in `../../AGENTS.md`.

## Scope

- Run greenfield execution commands from this directory: `plans/greenfield/`
- This file applies only to the initial project build tracked by `EXECUTION_PLAN.md`.
- Feature work belongs in `../../features/<name>/`.

## Required Context

Before starting a task, read:
1. `../../AGENTS.md`
2. `PRODUCT_SPEC.md` if it exists
3. `TECHNICAL_SPEC.md` if it exists
4. `EXECUTION_PLAN.md`
5. `QUESTIONS.md` if it exists
6. `../../LEARNINGS.md` if it exists

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

## Testing Policy

- Tests must exist for all acceptance criteria
- Tests must pass before reporting complete
- Never skip or disable tests to make them pass
- If tests won't pass, report as a blocker
- **Never claim "working" when any functionality is disabled or broken**

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
