---
description: Show progress through EXECUTION_PLAN.md
allowed-tools: Read, Grep
---

Read EXECUTION_PLAN.md and show the current execution status.

## Directory Guard (Wrong Directory Check)

Before starting, confirm `EXECUTION_PLAN.md` exists in the current working directory.

- If it does not exist, **STOP** and tell the user to `cd` into their project directory (the one containing `EXECUTION_PLAN.md`) and re-run `/progress`.

## Progress Report

1. **Overview**
   - Total phases, steps, tasks
   - Current phase in progress

2. **Completion Status**

   For each phase, count:
   - Total acceptance criteria (checkboxes)
   - Completed criteria (checked boxes `- [x]`)
   - Remaining criteria (unchecked boxes `- [ ]`)

   Calculate percentage complete per phase.

3. **Current Position**
   - Last completed task
   - Next task to execute
   - Any blocked tasks

4. **Summary Table**

   ```
   | Phase | Status | Progress |
   |-------|--------|----------|
   | Phase 1: {name} | Complete | 12/12 (100%) |
   | Phase 2: {name} | In Progress | 5/8 (62%) |
   | Phase 3: {name} | Not Started | 0/10 (0%) |
   ```

5. **Next Action**

   Recommend what to do next:
   - Continue with task X.Y.Z
   - Run /phase-checkpoint N
   - Run /phase-prep N for next phase
