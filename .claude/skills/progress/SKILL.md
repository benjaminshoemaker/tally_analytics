---
name: progress
description: Show progress through EXECUTION_PLAN.md
allowed-tools: Read, Grep
---

Read EXECUTION_PLAN.md and show the current execution status.

## Directory Guard (Wrong Directory Check)

Before starting, confirm `EXECUTION_PLAN.md` exists in the current working directory.

- If it does not exist, **STOP** and tell the user to `cd` into their project directory (the one containing `EXECUTION_PLAN.md`) and re-run `/progress`.

## Checkbox Categories

Execution plans contain **4 distinct checkbox categories**. Count them separately:

| Category | Location | Identifier |
|----------|----------|------------|
| **Task Acceptance Criteria** | Under `#### Task X.Y.Z` headers, after `**Acceptance Criteria:**` | Has type tags like `(TEST)`, `(CODE)`, `(BROWSER:*)`, `(MANUAL)` |
| **Phase Checkpoint Criteria** | Under `### Phase N Checkpoint` headers | Sections: "Automated Checks", "Manual Local Verification", "Browser Verification" |
| **Pre-Phase Setup Criteria** | Under `### Pre-Phase Setup` headers | Items with `Verify:` commands |
| **Manual Verification** | Under "Human Required" headers | Items with `Reason:` lines |

**Primary Metric:** Task Acceptance Criteria only (represents actual implementation work).

**Secondary Metrics:** Checkpoint, Setup, and Manual criteria (procedural/verification work).

## Progress Report

1. **Overview**
   - Total phases, steps, tasks
   - Current phase in progress

2. **Completion Status**

   For each phase, count **Task Acceptance Criteria only**:
   - Total criteria: Count `- [ ]` and `- [x]` lines under `#### Task` sections
   - Completed: Count `- [x]` lines
   - Remaining: Count `- [ ]` lines

   Calculate percentage complete per phase.

   **Important:** Do NOT count checkpoint criteria, pre-phase setup items, or phase-level verification checkboxes in the primary progress metric.

3. **Current Position**
   - Last completed task (all its acceptance criteria are `[x]`)
   - Next task to execute (first task with any `[ ]` criteria)
   - Any blocked tasks (marked with `**Status:** BLOCKED`)

4. **Summary Table**

   ```
   | Phase | Status | Task Criteria | Checkpoint Criteria |
   |-------|--------|---------------|---------------------|
   | Phase 1: {name} | Complete | 12/12 (100%) | 5/5 |
   | Phase 2: {name} | In Progress | 5/8 (62%) | 0/4 |
   | Phase 3: {name} | Not Started | 0/10 (0%) | 0/6 |
   ```

   Status definitions:
   - **Complete**: All task acceptance criteria checked
   - **In Progress**: Some task criteria checked, some unchecked
   - **Not Started**: No task criteria checked

5. **Verification Breakdown** (optional, if relevant)

   If checkpoint or setup criteria exist, show:
   ```
   Additional Criteria:
   - Pre-Phase Setup: X/Y completed
   - Phase Checkpoints: X/Y completed
   - Manual Verification: X/Y confirmed
   ```

6. **Next Action**

   Recommend what to do next:
   - Continue with task X.Y.Z
   - Run /phase-checkpoint N (if all tasks in phase complete)
   - Run /phase-prep N for next phase
