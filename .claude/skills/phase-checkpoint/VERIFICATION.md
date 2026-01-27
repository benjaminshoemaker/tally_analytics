# Local Verification Details

## Automated Local Checks

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

## Optional Local Checks

These checks run only if the required tools are available.

### Code Simplification (requires: code-simplifier plugin)

If available, run code-simplifier on files changed in this phase:
```bash
git diff --name-only HEAD~{commits-in-phase}
```

Focus: reduce complexity, improve naming, eliminate redundancy. Preserve all functionality.

### Browser Verification (requires browser MCP tools)

First, check if phase includes UI work by scanning for `BROWSER:*` criteria.

**If browser criteria exist:**

a. **Resolve target URL** (deployment config check):
   - Read `deployment.enabled` from verification-config.json
   - If enabled: Invoke vercel-preview skill to get preview URL
   - If preview URL found: TARGET = preview URL
   - If not found and `fallbackToLocal`: TARGET = localhost (with warning)
   - If not found and NO fallback: BLOCK verification
   - If deployment not enabled: TARGET = localhost (devServer.url)

b. Check tool availability (fallback chain):
   - ExecuteAutomation Playwright → Browser MCP → Microsoft Playwright → Chrome DevTools

c. **If at least one tool available:**
   - Use the browser-verification skill with each criterion's `Verify:` metadata
   - Take snapshots for verification
   - Test against TARGET URL

**Display target in output:**
```
Browser Verification:
- Target: Vercel Preview (https://my-app-xyz.vercel.app)
[Or]
- Target: Local Dev Server (http://localhost:3000)
- Target: Local Dev Server (fallback - no preview deployment found)
```

c. **If NO browser tools available (SOFT BLOCK):**
   - Display warning and use AskUserQuestion:
     - "Continue with manual verification" → Add browser checks to Human Required section
     - "Stop to configure tools" → Halt checkpoint, provide setup instructions

### Technical Debt Check (optional)

If `.claude/skills/tech-debt-check/SKILL.md` exists:
- Run duplication analysis
- Run complexity analysis
- Check file sizes
- Detect AI code smells

Report findings with severity levels. Informational only (does not block).

---

## Manual Verification

### Auto-Verify Attempt

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
```

### Manual Verification Guide Format

When ANY items require manual verification, produce a detailed, standalone guide.

**CRITICAL: URL Resolution**

Before generating instructions, resolve the BASE_URL:
1. Read `deployment.enabled` from verification-config.json
2. If deployment enabled: Invoke vercel-preview skill for preview URL
3. All URLs in the guide MUST use BASE_URL

**Guide Structure:**

```
═══════════════════════════════════════════════════════════════════════════════
MANUAL VERIFICATION: {criterion title}
═══════════════════════════════════════════════════════════════════════════════

## What We're Verifying
{1-2 sentence explanation of what this tests and why}

## Prerequisites
- [ ] Dev server/deployment ready at {BASE_URL}
- [ ] Browser open
- [ ] {Any test accounts, API keys, or data needed}

## Step-by-Step Verification

### Step 1: {Action title}
1. Open browser and navigate to: `{BASE_URL}{route}`
2. You should see: {expected initial state}
   - If not: {troubleshooting hint}

### Step 2: {Action title}
1. {Exact action to take}
2. You should see: {expected result}

{Continue with as many steps as needed}

## Expected Results
✓ {Specific observable outcome 1}
✓ {Specific observable outcome 2}

## How to Confirm Success
The criterion PASSES if ALL of the following are true:
1. {Concrete, verifiable condition}
2. {Concrete, verifiable condition}

## Common Issues & Troubleshooting
| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| {symptom} | {cause} | {solution} |

## If Verification Fails
1. Check browser console for errors (F12 → Console)
2. Check terminal for server errors
3. Try: {specific recovery steps}
───────────────────────────────────────────────────────────────────────────────
```

### Human Confirmation (Batch)

For items in "Automation Failed" or "Truly Manual" categories:

1. **List all items needing human verification**
2. **Ask ONE question using AskUserQuestion:**
   - "All verified" → Update ALL checkboxes at once
   - "Some verified" → Follow up asking which ones
   - "None yet" → Leave unchecked, continue
3. **Update checkboxes** in EXECUTION_PLAN.md

### Approach Review (Human)

Ask the human to review implementation approach:
- Solutions use appropriate abstractions
- New code follows existing patterns
- No unnecessary dependencies added
- Error handling is consistent
- Any AI solutions that need refinement?

---

## Production Verification

**BLOCKED** until all Local Verification passes.

When local verification passes, extract PRODUCTION items from EXECUTION_PLAN.md:

1. **Staging/Production Deployment Verification**
2. **External Integration Verification**
3. **Production-Only Manual Checks**
