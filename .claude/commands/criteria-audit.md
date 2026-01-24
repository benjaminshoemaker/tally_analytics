---
description: Audit EXECUTION_PLAN.md for verification metadata and testability
argument-hint: [project-directory]
allowed-tools: Read, Grep, Glob, AskUserQuestion
---

Audit EXECUTION_PLAN.md for verification metadata completeness and testability.

## Project Directory

Use the current working directory by default.

If `$1` is provided, treat `$1` as the project directory and read files under
`$1` instead.

## Directory Guard (Wrong Directory Check)

Before starting, confirm `EXECUTION_PLAN.md` exists in the working directory.

- If it does not exist, **STOP** and tell the user to `cd` into their
  project/feature directory (the one containing `EXECUTION_PLAN.md`) and
  re-run `/criteria-audit`.

## Process

Follow `.claude/skills/criteria-audit/SKILL.md` exactly.

## Output

Provide the structured audit report and a PASS/WARN/FAIL status.
If FAIL, list the top blockers that must be fixed before /phase-start.
