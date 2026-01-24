---
name: phase-checkpoint
description: Run checkpoint criteria after completing a phase
argument-hint: [phase-number]
allowed-tools: Bash, Read, Edit, Glob, Grep, AskUserQuestion
---

Phase $1 is complete. Read EXECUTION_PLAN.md and run the checkpoint criteria.

## Context Detection

Determine working context:

1. If current working directory matches pattern `*/features/*`:
   - PROJECT_ROOT = parent of parent of CWD (e.g., `/project/features/foo` → `/project`)
   - MODE = "feature"

2. Otherwise:
   - PROJECT_ROOT = current working directory
   - MODE = "greenfield"

## Directory Guard (Wrong Directory Check)

Before starting, confirm `EXECUTION_PLAN.md` exists in the current working directory.

- If it does not exist, **STOP** and tell the user to `cd` into their project/feature directory (the one containing `EXECUTION_PLAN.md`) and re-run `/phase-checkpoint $1`.

## Context Check

**Before starting:** If context is below 40% remaining, run `/compact` first. This ensures the full command instructions remain in context throughout execution. Compaction mid-command loses procedural instructions.

## Tool Availability Check

Before running checks, detect which optional tools are available by attempting a harmless call:

| Tool | Check Method | Fallback |
|------|--------------|----------|
| ExecuteAutomation Playwright | Check for `mcp__playwright__*` or `mcp__executeautomation__*` | Next in chain |
| Browser MCP | Check for `mcp__browsermcp__*` tools | Next in chain |
| Microsoft Playwright MCP | Check for `mcp__playwright__*` tools | Next in chain |
| Chrome DevTools MCP | Call `mcp__chrome-devtools__list_pages` | Manual verification |
| code-simplifier | Check if agent type available | Skip code simplification |
| Trigger.dev MCP | `mcp__trigger__list_projects` | Skip Trigger.dev checks |

**Browser tool fallback chain:** ExecuteAutomation Playwright → Browser MCP → Microsoft Playwright → Chrome DevTools → Manual

Read `.claude/verification-config.json` from PROJECT_ROOT. Use it to determine
commands for tests, lint, typecheck, build, coverage, and dev server.

If the config is missing or required commands are empty:
- Run `/configure-verification`
- Do not proceed with automated checks until commands are configured

## Local Verification (Must Pass First)

**IMPORTANT**: All local verification must pass before proceeding to production verification.
If any local check fails, stop and report — do not run production checks.

### Automated Local Checks

Run these commands and report results:

1. **Tests**
   ```
   {commands.test from verification-config}
   ```
   (if empty, block and ask to configure)

2. **Type Checking**
   ```
   {commands.typecheck from verification-config}
   ```
   (if empty, mark as not applicable or configure)

3. **Linting**
   ```
   {commands.lint from verification-config}
   ```
   (if empty, mark as not applicable or configure)

4. **Build** (if applicable)
   ```
   {commands.build from verification-config}
   ```
   (if empty and project has build step, ask to configure)

5. **Dev Server Starts**
   ```
   {devServer.command from verification-config}
   ```
   Verify it starts without errors and is accessible at `{devServer.url}`.

6. **Security Scan**

   Run security checks:
   - Use the project's configured security tooling (if documented)
   - Run secrets detection (pattern-based)
   - Run static analysis via documented tools or ask for a command

   For CRITICAL or HIGH issues:
   - Present each issue with resolution options
   - Apply fixes based on user choices
   - Re-scan to confirm resolution

   Security scan blocks checkpoint if CRITICAL or HIGH issues remain unresolved.

7. **Code Quality Metrics**

   Collect and report these metrics for the phase:

   ```
   CODE QUALITY METRICS
   --------------------
   Test Coverage: {X}% (target: 80%)
   Files changed in phase: {N}
   Lines added: {N}
   Lines removed: {N}
   New dependencies added: {list or "None"}
   ```

   To get coverage:
   - Use `commands.coverage` from verification-config if present
   - If empty, mark coverage as not applicable or ask to configure

   Flag if coverage dropped compared to before the phase (if a baseline exists).

### Optional Local Checks

These checks run only if the required tools are available (detected above).

8. **Code Simplification** (requires: code-simplifier plugin)

   If available, run code-simplifier on files changed in this phase:
   ```bash
   git diff --name-only HEAD~{commits-in-phase}
   ```

   Focus: reduce complexity, improve naming, eliminate redundancy. Preserve all functionality.

9. **Browser Verification - Local** (requires browser MCP tools)

   First, check if phase includes UI work by scanning for `BROWSER:*` criteria.

   **If browser criteria exist:**

   a. Check tool availability (fallback chain):
      - ExecuteAutomation Playwright → Browser MCP → Microsoft Playwright → Chrome DevTools

   b. **If at least one tool available:**
      - Use the browser-verification skill with each criterion's `Verify:` metadata
      - Take snapshots for verification
      - Test against local dev server (localhost)

   c. **If NO browser tools available (SOFT BLOCK):**
      - Display warning:
        ```
        ⚠️  BROWSER VERIFICATION BLOCKED

        This phase has {N} browser-based acceptance criteria but no browser
        MCP tools are available.

        Criteria requiring browser verification:
        - {list each BROWSER:* criterion}

        Options:
        1. Continue anyway (browser criteria become manual verification)
        2. Stop and configure browser tools first

        To enable automated browser verification, install one of:
        - ExecuteAutomation Playwright: Add to .mcp.json
        - Browser MCP: Install extension from browsermcp.io
        - Chrome DevTools MCP: Often pre-installed
        ```
      - Use AskUserQuestion to let user choose:
        - "Continue with manual verification" → Add browser checks to Human Required section
        - "Stop to configure tools" → Halt checkpoint, provide setup instructions

10. **Technical Debt Check** (optional)

    If `.claude/skills/tech-debt-check/SKILL.md` exists:
    - Run duplication analysis
    - Run complexity analysis
    - Check file sizes
    - Detect AI code smells

    Report findings with severity levels. Informational only (does not block).

### Manual Local Verification

From the "Phase $1 Checkpoint" section in EXECUTION_PLAN.md, extract LOCAL items
marked for manual verification.

**Before listing for human review, attempt automation using the auto-verify skill:**

For each manual item:
1. Invoke auto-verify skill with item text and available tools
2. Record attempt result (PASS, FAIL, or MANUAL)

**Categorize and report results:**

```
Automated Successfully:
- [x] "{item}" — PASS ({method}, {duration})

Automation Failed (needs human review):
- [ ] "{item}"
  - Attempted: {method}
  - Error: {error message}
  - Suggested Fix: {if applicable}
  - Manual Steps:
    1. {First action to take}
    2. {What to verify/look for}
    3. {How to confirm success}

Truly Manual (no automation possible):
- [ ] "{item}"
  - Reason: {why automation is not feasible}
  - Steps:
    1. {First action to take}
    2. {What to verify/look for}
    3. {How to confirm success}
```

**Note:** Only items in "Truly Manual" genuinely require human action. Items in
"Automation Failed" may be automatable once the underlying issue is fixed.

### Update EXECUTION_PLAN.md Checkboxes (Auto-Verified Items)

After auto-verify passes items, immediately update their checkboxes in EXECUTION_PLAN.md:

1. **For each item that auto-verify marked PASS:**
   - Read EXECUTION_PLAN.md
   - Find the "### Phase $1 Checkpoint" section
   - Locate the exact line: `- [ ] {criterion text}`
   - Edit: change `- [ ]` to `- [x]`
   - Verify edit succeeded

2. **Matching rules:**
   - Match the exact checkbox text (criterion may be truncated in reports)
   - Use the phase section as anchor to avoid updating wrong items
   - Skip items already checked (`- [x]`)

### Human Confirmation (Batch)

For items in "Automation Failed" or "Truly Manual" categories, ask human for batch confirmation:

1. **List all items needing human verification:**
   ```
   Manual verification needed for {N} items:
   1. {item 1 text}
   2. {item 2 text}
   ...
   ```

2. **Ask ONE question using AskUserQuestion:**
   - Question: "Which items have you verified?"
   - Options:
     - "All verified" → Update ALL remaining checkboxes at once
     - "Some verified" → Follow up asking which ones (comma-separated numbers)
     - "None yet" → Leave all unchecked, continue to next section

3. **Accept natural language responses:**
   - "they're all good", "verified", "all done" → Treat as "All verified"
   - "all except 2" or "1 and 3 only" → Update specified items only

4. **Update checkboxes:**
   - For confirmed items, edit EXECUTION_PLAN.md to change `- [ ]` to `- [x]`
   - Use a single Edit call when updating multiple items in sequence
   - Do NOT ask follow-up confirmation questions after user says "all verified"

### Approach Review (Human)

Ask the human to review the phase's implementation approach against these criteria:

- Solutions use appropriate abstractions (not over/under-engineered)
- New code follows existing codebase patterns and conventions
- No unnecessary dependencies were added
- Error handling is consistent with rest of codebase
- Any "almost correct" AI solutions that need refinement?

**Reporting format:**
- Only list items that have issues or need attention
- If all criteria pass, report: "Approach Review: No issues noted"
- If issues exist, report each one briefly with context

### Regression Check (if feature work)

- Confirm existing tests still pass
- Note any changes to existing functionality

---

## Production Verification (After Local Passes)

**BLOCKED** until all Local Verification passes.

If local verification has any failures, show:
```
## Production Verification

(Blocked: Complete local verification first)

Pending production checks:
- [ ] {list items from EXECUTION_PLAN.md marked for production/staging}
```

### When Local Verification Passes

Extract PRODUCTION items from "Phase $1 Checkpoint" in EXECUTION_PLAN.md:

1. **Staging/Production Deployment Verification**
   - If phase includes deployment: verify staging environment works
   - Check production logs for errors (if applicable)
   - Verify no regressions in deployed environment

2. **External Integration Verification**
   - Third-party API connections working
   - External services responding correctly
   - Webhooks/callbacks functioning

3. **Production-Only Manual Checks**
   - Items that can only be verified in production environment
   - Performance under real load (if applicable)
   - Cross-browser/device testing on production URLs

## State Update

After checkpoint passes, update `.claude/phase-state.json`:

1. Set phase status to `CHECKPOINTED`
2. Add `completed_at` timestamp
3. Record checkpoint results

```json
{
  "phases": [
    {
      "number": 1,
      "status": "CHECKPOINTED",
      "completed_at": "{ISO timestamp}",
      "checkpoint": {
        "tests_passed": true,
        "type_check_passed": true,
        "lint_passed": true,
        "security_passed": true,
        "coverage_percent": 85,
        "manual_verified": true
      }
    }
  ]
}
```

If checkpoint fails, keep status as `IN_PROGRESS` and add `checkpoint_failed` with details.

## Verification Evidence and Logs

After running checks:
- Write a checkpoint report to `.claude/verification/phase-$1.md`
- Append results to `.claude/verification-log.jsonl`
  - Include check type, status, timestamp, and evidence path
 - Ensure `.claude/verification/` exists before writing evidence files

Example log entry:
```json
{
  "timestamp": "{ISO timestamp}",
  "scope": "phase-checkpoint",
  "phase": "$1",
  "check": "tests",
  "status": "PASS",
  "evidence": ".claude/verification/phase-$1.md"
}
```

---

## Report

```
Phase $1 Checkpoint Results
===========================

Tool Availability:
- ExecuteAutomation Playwright: ✓ | ✗ (primary)
- Browser MCP Extension: ✓ | ✗
- Microsoft Playwright MCP: ✓ | ✗
- Chrome DevTools MCP: ✓ | ✗
- code-simplifier: ✓ | ✗
- Trigger.dev MCP: ✓ | ✗ | N/A

## Local Verification

Automated Checks:
- Tests: PASSED | FAILED
- Type Check: PASSED | FAILED | SKIPPED
- Linting: PASSED | FAILED | SKIPPED
- Build: PASSED | FAILED | SKIPPED
- Dev Server: PASSED | FAILED | SKIPPED
- Security: PASSED | FAILED | X critical, Y high
- Coverage: {X}% (target: 80%)

Optional Checks:
- Code Simplification: APPLIED | SKIPPED
- Browser Verification (local): PASSED | SKIPPED
- Tech Debt: PASSED | NOTES | SKIPPED

Manual Local Checks:
- Automated: {X} items verified automatically
- Failed automation: {Y} items (see details below)
- Truly manual: {Z} items (human judgment required)

Automated Successfully:
- [x] "{item}" — PASS ({method}, {duration})

Failed Automation:
- [ ] "{item}"
  - Attempted: {method}, Error: {error}
  - Steps: ...

Truly Manual:
- [ ] "{item}"
  - Reason: {why not automatable}
  - Steps: ...

Approach Review: No issues noted | {list specific issues}

Local Verification: ✓ PASSED | ✗ FAILED (address issues above)

---

## Production Verification

[If local passed:]
- [ ] Staging deployment verified
- [ ] Production logs clean
- [ ] External integrations working
- [ ] {other production items from EXECUTION_PLAN.md}

[If local failed:]
(Blocked: Complete local verification first)

---

Overall: Ready to proceed | Local issues to address | Production issues to address
```

## Auto-Advance (After Checkpoint Passes)

Check if auto-advance is enabled and this checkpoint passes all criteria.

### Configuration Check

Read `.claude/settings.local.json` for auto-advance configuration:

```json
{
  "autoAdvance": {
    "enabled": true,      // default: true
    "delaySeconds": 15    // default: 15
  }
}
```

If `autoAdvance` is not configured, use defaults (`enabled: true`, `delaySeconds: 15`).

### Auto-Advance Conditions

Auto-advance to `/phase-prep {N+1}` ONLY if ALL of these are true:

1. ✓ All automated checks passed (tests, lint, types, security)
2. ✓ No "truly manual" verification items remain (auto-verify was attempted above)
3. ✓ No production verification items exist
4. ✓ Phase $1 is not the final phase
5. ✓ `--pause` flag was NOT passed to this command
6. ✓ `autoAdvance.enabled` is true (or not configured, defaulting to true)

**Rationale:** Auto-verify (run in Manual Local Verification above) attempts automation before blocking. Only items that genuinely require human judgment block auto-advance. Production verification items always require human presence to confirm deployed behavior.

### If Auto-Advance Conditions Met

1. **Show countdown:**
   ```
   AUTO-ADVANCE
   ============
   All Phase $1 criteria verified (no truly manual items remain).

   Auto-advancing to /phase-prep {N+1} in 15s...
   (Press Enter to pause)
   ```

2. **Wait for delay or interrupt:**
   - Wait `autoAdvance.delaySeconds` (default 15)
   - If user presses Enter during countdown, cancel auto-advance
   - Show countdown updates: `14s... 13s... 12s...`

3. **If not interrupted:**
   - Track this command in auto-advance session log
   - Execute `/phase-prep {N+1}`
   - Continue auto-advance chain (phase-prep will continue if it passes)

4. **If interrupted:**
   ```
   Auto-advance paused by user.

   Ready for Phase {N+1}. Run manually when ready:
     /phase-prep {N+1}
   ```

### If Auto-Advance Conditions NOT Met

Stop and report why:

```
AUTO-ADVANCE STOPPED
====================

Reason: {one of below}
- Truly manual verification items remain (human judgment required)
- Production verification items exist (human intervention required)
- Phase $1 is the final phase
- Auto-advance disabled via --pause flag
- Auto-advance disabled in settings

{If manual/production items exist:}
Human verification required:
- [ ] {item 1}
- [ ] {item 2}

Next steps:
1. Complete the verification items above
2. Run /phase-prep {N+1} manually when ready
```

### Auto-Advance Session Tracking

Maintain `.claude/auto-advance-session.json` during auto-advance:

```json
{
  "started_at": "{ISO timestamp}",
  "commands": [
    {"command": "/phase-checkpoint 1", "status": "PASS", "timestamp": "{ISO}"},
    {"command": "/phase-prep 2", "status": "PASS", "timestamp": "{ISO}"},
    {"command": "/phase-start 2", "status": "PASS", "timestamp": "{ISO}"},
    {"command": "/phase-checkpoint 2", "status": "MANUAL_REQUIRED", "timestamp": "{ISO}"}
  ],
  "stopped_at": "{ISO timestamp}",
  "stop_reason": "manual_verification_required"
}
```

### Session Report (When Auto-Advance Stops)

When auto-advance stops (for any reason), generate a summary:

```
AUTO-ADVANCE SESSION COMPLETE
=============================

Commands executed:
1. /phase-checkpoint 1 → ✓ All criteria passed
2. /phase-prep 2 → ✓ All setup complete
3. /phase-start 2 → ✓ All tasks completed
4. /phase-checkpoint 2 → ⚠ Manual verification required

Summary:
- Phases completed: 1 (Phase 2)
- Steps completed: 4
- Duration: 12m 34s
- Stopped: Manual verification items detected

Requires attention:
- [ ] Verify payment flow works end-to-end (localhost:3000/checkout)
- [ ] Confirm email notifications received

Next: Complete manual items, then run /phase-checkpoint 2 again
```

Delete `.claude/auto-advance-session.json` after reporting (or on fresh `/phase-start 1` with no prior session).
