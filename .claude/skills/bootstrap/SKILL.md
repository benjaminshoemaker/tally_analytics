---
name: bootstrap
description: Generate feature plan with codebase-aware context. Use when starting a new feature in an existing codebase to skip full spec workflow.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Bootstrap

Generate a feature plan with codebase-aware context. Scans your codebase, understands existing patterns, and creates a targeted feature specification and execution plan.

## When to Use

- Starting a new feature in an existing codebase
- You have a clear idea of what to build
- You want to skip the full product/technical spec workflow
- You ran `/adopt` from the orchestrator and saved context

## Workflow

Copy this checklist and track progress:

```
Bootstrap Progress:
- [ ] Step 1: Gather initial description
- [ ] Step 2: Orient to project root
- [ ] Step 3: Run /setup automatically
- [ ] Step 4: Codebase scan
- [ ] Step 5: Check for unfinished plans
- [ ] Step 6: Ask clarifying questions (if needed)
- [ ] Step 7: Derive and confirm feature name
- [ ] Step 8: Create feature directory and documents
- [ ] Step 9: Update CLAUDE.md
- [ ] Step 10: Clean up and report
```

### Step 1: Gather Initial Description

Check for existing context:
```bash
cat .claude/bootstrap-context.md 2>/dev/null
```

If exists, offer to use it. Otherwise, ask:
```
What would you like to build?
```

Store as `USER_DESCRIPTION`.

### Step 2: Orient to Project Root

1. Check for git repository: `git rev-parse --show-toplevel`
2. If not git, search upward for AGENTS.md
3. Store result as `PROJECT_ROOT`

### Step 3: Run /setup Automatically

Ensure the toolkit is installed in the project:

1. Determine toolkit location:
   - If running from the toolkit repo (e.g., `GENERATOR_PROMPT.md` exists in CWD), use that path
   - Otherwise resolve from `.claude/toolkit-version.json` if present
   - If still unknown, try common paths (e.g., `~/Projects/ai_coding_project_base`)

2. Run `/setup PROJECT_ROOT` (idempotent — safe to run multiple times)
   - If toolkit already installed and current, setup will report "Already up to date"
   - If toolkit needs updating, setup will perform incremental sync
   - If toolkit not installed, setup will perform full installation

3. Continue after setup completes (no user interaction needed for idempotent runs)

### Step 4: Codebase Scan

See [CODEBASE_SCAN.md](CODEBASE_SCAN.md) for detailed scanning procedures.

Compile findings as `CODEBASE_CONTEXT` with:
- Language/Framework detected
- Patterns to follow
- Related existing code
- Testing approach

### Step 5: Check for Unfinished Execution Plans

```bash
find PROJECT_ROOT -name "EXECUTION_PLAN.md" -type f
```

For each found plan:

1. If `.claude/phase-state.json` exists, use it for completion status
2. If no state file, parse the plan for completion:
   - Count `- [x]` (completed) vs `- [ ]` (incomplete) criteria
   - A plan is incomplete if any criteria are unchecked

If unfinished plans exist, report:
```
UNFINISHED EXECUTION PLANS DETECTED
===================================
- EXECUTION_PLAN.md: Phase 2 of 4 (5/12 tasks complete)
- features/analytics/EXECUTION_PLAN.md: Phase 1 of 2 (3/8 tasks complete)
```

Ask with AskUserQuestion:
```
Question: "There are unfinished execution plans. How should I proceed?"
Options:
- "Continue anyway" — Create new feature plan alongside existing work
- "Add TODO reminder" — Add reminder to TODOS.md and continue
- "Cancel" — Stop bootstrap to focus on existing work
```

If "Add TODO reminder":
```bash
echo "- [ ] [backlog] Complete unfinished execution plans before starting new work" >> PROJECT_ROOT/TODOS.md
```

If "Cancel": Stop and report existing plans that need attention.

### Step 6: Ask Clarifying Questions

Only ask what's necessary. Do NOT ask about:
- Things implied by USER_DESCRIPTION
- Implementation details you can decide from patterns
- Nice-to-haves for later

### Step 7: Derive and Confirm Feature Name

1. Extract key concepts from description
2. Create kebab-case name (2-4 words)
3. Confirm with user

Store as `FEATURE_NAME`.

### Step 8: Create Feature Directory and Documents

```bash
mkdir -p PROJECT_ROOT/features/FEATURE_NAME
```

Create:
- `FEATURE_SPEC.md` — Problem, solution, scope, acceptance criteria
- `EXECUTION_PLAN.md` — Phases, tasks, files to modify

See [TEMPLATES.md](TEMPLATES.md) for document templates.

### Step 9: Update CLAUDE.md

If CLAUDE.md doesn't reference AGENTS.md, add:
```
@AGENTS.md
```

### Step 10: Clean Up and Report

If bootstrap-context.md was used, offer to delete it.

```
FEATURE PLAN CREATED
====================
Feature: {FEATURE_NAME}
Location: PROJECT_ROOT/features/FEATURE_NAME/

Files created:
- FEATURE_SPEC.md
- EXECUTION_PLAN.md — {N} phases, {M} tasks

Next steps:
1. Review: cat PROJECT_ROOT/features/FEATURE_NAME/FEATURE_SPEC.md
2. Start: cd PROJECT_ROOT/features/FEATURE_NAME && /fresh-start && /phase-start 1
```

## Example

**Input:** "Add dark mode toggle to settings page with localStorage persistence"

**Codebase scan finds:** React app, Settings.tsx, existing Toggle component, CSS modules

**Output:** Feature directory at `features/dark-mode/` with FEATURE_SPEC.md and EXECUTION_PLAN.md referencing existing patterns and files.
