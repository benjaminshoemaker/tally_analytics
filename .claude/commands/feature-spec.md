---
description: Generate FEATURE_SPEC.md through guided Q&A
argument-hint: [target-directory]
allowed-tools: Read, Write, AskUserQuestion
---

Generate a feature specification document for the project at `$1`.

## Prerequisites

- This command must be run from the ai_coding_project_base toolkit directory
- If `$1` is empty, ask the user for the target directory path

## Directory Guard (Wrong Directory Check)

Before starting, confirm you're in the toolkit directory by reading `FEATURE_PROMPTS/FEATURE_SPEC_PROMPT.md` from the current working directory.

- If `FEATURE_PROMPTS/FEATURE_SPEC_PROMPT.md` is not present, **STOP** and tell the user:
  - They're likely in their target project directory (or another repo)
  - They should `cd` into the `ai_coding_project_base` toolkit repo and re-run `/feature-spec $1`

## Existing File Guard (Prevent Overwrite)

Before asking any questions, check whether `$1/FEATURE_SPEC.md` already exists.

- If it does not exist: continue normally.
- If it exists: **STOP** and ask the user what to do:
  1. **Backup then overwrite (recommended)**: read the existing file and write it to `$1/FEATURE_SPEC.md.bak.YYYYMMDD-HHMMSS`, then write the new document to `$1/FEATURE_SPEC.md`
  2. **Overwrite**: replace `$1/FEATURE_SPEC.md` with the new document
  3. **Abort**: do not write anything; suggest they rename/move the existing file first

## Project Root Detection

Derive project root from the target directory:

1. If `$1` matches pattern `*/features/*` (contains `/features/` followed by a feature name):
   - PROJECT_ROOT = parent of parent of $1 (e.g., `/project/features/foo` → `/project`)
   - FEATURE_NAME = basename of $1

2. Validate PROJECT_ROOT:
   - Check `PROJECT_ROOT/AGENTS.md` exists
   - If missing: "Could not find AGENTS.md at PROJECT_ROOT. Is this a valid project with the features/ structure?"

3. If `$1` does NOT match the `*/features/*` pattern:
   - Warn: "`$1` doesn't appear to be a feature directory (expected path like `/project/features/feature-name`)"
   - Ask if they want to continue anyway (may indicate `/setup` was not run for Feature type)

## Process

Read FEATURE_PROMPTS/FEATURE_SPEC_PROMPT.md from this toolkit directory and follow its instructions exactly:

1. Ask the user to describe the feature they want to add
2. Work through each question category (Problem, Users, Behavior, Integration, Scope)
3. Make recommendations with confidence levels
4. Generate the final FEATURE_SPEC.md document

## Output

Write the completed specification to `$1/FEATURE_SPEC.md`.

## Deferred Requirements Capture (During Q&A)

**IMPORTANT:** Capture deferred requirements interactively during the Q&A process, not after.

Write deferred items to `PROJECT_ROOT/DEFERRED.md` (not the feature directory).

### When to Trigger

During the Q&A, watch for signals that the user is deferring something:
- "out of scope"
- "not in this feature" / "separate feature"
- "v2" / "future version"
- "later" / "eventually"
- "follow-up" / "future enhancement"
- "nice to have"
- "we'll skip that for now"

### Capture Flow

When you detect a deferral signal, immediately use AskUserQuestion:

```
Question: "Would you like to save this to your deferred requirements?"
Header: "Defer?"
Options:
  - "Yes, capture it" — I'll ask a few quick questions to document it
  - "No, skip" — Don't record this
```

**If user selects "Yes, capture it":**

Ask these clarifying questions:

1. **What's being deferred?**
   "In one sentence, what's the requirement or feature?"
   (Pre-fill with your understanding from context)

2. **Why defer it?**
   Options: "Out of scope for this feature" / "Separate feature" / "V2" / "Needs more research" / "Other"

3. **Notes for later?**
   "Any context that will help when revisiting this?"
   (Optional — user can skip)

### Write to DEFERRED.md Immediately

After collecting answers, append to `PROJECT_ROOT/DEFERRED.md` right away.

**If file doesn't exist, create it:**

```markdown
# Deferred Requirements

> Captured during specification Q&A. Review when planning future versions.

## From FEATURE_SPEC.md: {FEATURE_NAME} ({date})

| Requirement | Reason | Notes |
|-------------|--------|-------|
| {user's answer} | {selected reason} | {notes or "—"} |
```

**If file exists, add new feature section or append to existing:**

```markdown

## From FEATURE_SPEC.md: {FEATURE_NAME} ({date})

| Requirement | Reason | Notes |
|-------------|--------|-------|
| {user's answer} | {selected reason} | {notes or "—"} |
```

### Continue Q&A

After capturing (or skipping), continue the spec Q&A where you left off.

## Cross-Model Review (Automatic)

After writing FEATURE_SPEC.md, run cross-model review if Codex CLI is available:

1. Check if Codex CLI is installed: `codex --version`
2. If available, run `/codex-consult` on the generated document
3. Present any findings to the user before proceeding

**Consultation invocation:**
```
/codex-consult --research "feature requirements, user stories" $1/FEATURE_SPEC.md
```

**If Codex finds issues:**
- Show critical issues and recommendations
- Ask user: "Address findings before proceeding?" (Yes/No)
- If Yes: Apply suggested fixes
- If No: Continue with noted issues

**If Codex unavailable:** Skip silently and proceed to Next Step.

## Next Step

When complete, inform the user:
```
FEATURE_SPEC.md created at $1/FEATURE_SPEC.md
Deferred Requirements: {count} items captured to PROJECT_ROOT/DEFERRED.md
Cross-Model Review: PASSED | PASSED WITH NOTES | SKIPPED

Next: Run /feature-technical-spec $1
```
