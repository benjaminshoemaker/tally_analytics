---
name: code-verification
description: Multi-agent code verification workflow using a main agent and sub-agent loop. Use when verifying code against requirements, acceptance criteria, or quality standards. Triggers on requests to verify, validate, or check code against specifications, checklists, or instructions.
---

# Code Verification Skill

Verify code against requirements using a main agent / sub-agent loop with structured feedback and automatic retry.

## Workflow Overview

```
1. Parse verification instructions into testable items
2. For each instruction:
   a. Pre-flight: Confirm instruction is testable
   b. Sub-agent: Verify if instruction is met
   c. If failed: Main agent attempts fix
   d. Repeat b-c up to 5 times or until success
   e. Update checklist with result
3. Generate verification report
```

## Step 1: Parse Verification Instructions

Extract each verification instruction into a discrete, testable item:

- **ID**: Unique identifier (e.g., `V-001`)
- **Instruction**: The requirement text
- **Test approach**: How to verify (file inspection, run tests, lint, type check, etc.)
- **Files involved**: Which files to examine

## Step 2: Pre-flight Validation

Before the verification loop, confirm each instruction is testable:

- Instruction is specific and unambiguous
- Success criteria are clear
- Required files/resources exist

Flag untestable instructions immediately rather than attempting verification.

## Step 3: Sub-Agent Verification Protocol

Spawn a sub-agent to verify each instruction. The sub-agent MUST return structured output:

```
VERIFICATION RESULT
-------------------
Instruction ID: [ID]
Status: PASS | FAIL | BLOCKED
Location: [file:line or "N/A"]
Severity: BLOCKING | MINOR
Finding: [What was found]
Expected: [What was expected]
Suggested Fix: [Specific fix recommendation]
```

Sub-agent rules:
- Check ONLY the specific instruction assigned
- Do not attempt fixes—report findings only
- Be precise about location (file, line number, function name)
- Distinguish between blocking failures and minor issues

## Step 4: Main Agent Fix Protocol

When sub-agent reports FAIL:

1. **Review the finding** - Understand what failed and why
2. **Check fix history** - Do not repeat a previously attempted fix
3. **Apply targeted fix** - Make the minimum change to address the issue
4. **Log the attempt** - Record what was changed

### Fix attempt tracking

Maintain a fix log per instruction:

```
FIX LOG: [Instruction ID]
--------------------------
Attempt 1: [Description of change] → [Result]
Attempt 2: [Description of change] → [Result]
...
```

### Strategy escalation

- Attempts 1-2: Direct fix based on sub-agent suggestion
- Attempt 3: Try alternative approach
- Attempts 4-5: Broaden scope, consider architectural changes

If the same failure pattern repeats twice, explicitly try a different strategy.

## Step 5: Exit Conditions

Exit the verification loop when ANY condition is met:

| Condition | Action |
|-----------|--------|
| Sub-agent reports PASS | ✅ Check off instruction |
| 5 attempts exhausted | ❌ Mark failed with notes |
| Same failure 3+ times | ⚠️ Exit early, flag for review |
| Fix introduces regression | ⚠️ Revert, flag for review |
| Issue is MINOR severity | ⚠️ Note and continue |

## Step 6: Regression Check

After each fix attempt, verify:

- The targeted instruction (primary check)
- Any previously-passing related instructions (regression check)

If a fix breaks something else, revert and note the conflict.

## Step 7: Generate Verification Report

After all instructions are processed:

```
VERIFICATION REPORT
===================
Total Instructions: [N]
Passed: [N] ✅
Failed: [N] ❌
Needs Review: [N] ⚠️

DETAILS
-------
[V-001] ✅ [Instruction summary]
[V-002] ❌ [Instruction summary]
  - Failed after 5 attempts
  - Last error: [description]
  - Attempts: [brief log]
[V-003] ⚠️ [Instruction summary]
  - Flagged: Repeated same failure pattern
  - Recommendation: [suggestion]

AUDIT TRAIL
-----------
[Timestamp] V-001: Verified PASS on first check
[Timestamp] V-002: Attempt 1 - Changed X → FAIL
[Timestamp] V-002: Attempt 2 - Changed Y → FAIL
...
```

## Example

Given a checklist:
```
[ ] All functions have docstrings
[ ] No unused imports
[ ] Tests pass with >80% coverage
```

Workflow execution:
1. Parse into V-001, V-002, V-003
2. Pre-flight confirms all are testable
3. Sub-agent checks V-001 → FAIL (missing docstring in `utils.py:45`)
4. Main agent adds docstring
5. Sub-agent re-checks → PASS
6. Continue to V-002...
7. Final report shows 3/3 passed

## Key Principles

- **Structured feedback**: Sub-agent always returns actionable, located findings
- **No repeated fixes**: Track what was tried to avoid loops
- **Early exit**: Don't burn attempts on unfixable issues
- **Regression awareness**: Fixes shouldn't break other things
- **Audit everything**: The journey matters for debugging