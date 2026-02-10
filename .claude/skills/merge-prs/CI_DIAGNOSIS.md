# CI Failure Diagnosis Patterns

Reference document for automated CI failure detection, log parsing, fix strategies, flaky test management, and bisection protocol.

## Log Retrieval Chain

The skill uses a **3-tier waterfall** to get the most useful log output:

### Tier 1: Check Run Annotations (Structured)

The GitHub Checks API returns structured error data with file paths, line numbers, and messages — far more parseable than raw logs.

```bash
# Get the failing check run ID
OWNER_REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
HEAD_SHA=$(gh pr view <PR_NUMBER> --json headRefOid -q '.headRefOid')

gh api "repos/$OWNER_REPO/commits/$HEAD_SHA/check-runs" \
  --jq '.check_runs[] | select(.conclusion == "failure") | {id: .id, name: .name}'

# Get annotations (structured errors)
gh api "repos/$OWNER_REPO/check-runs/<CHECK_RUN_ID>/annotations" \
  --jq '.[] | {path: .path, line: .start_line, end_line: .end_line, level: .annotation_level, message: .message}'
```

**Output format** (directly mappable to edit operations):
```json
{
  "path": "src/pages/api/foo.ts",
  "line": 42,
  "end_line": 42,
  "level": "failure",
  "message": "error TS2345: Argument of type 'string' is not assignable..."
}
```

**When to use**: Always try first. Best for TypeScript errors, ESLint violations, and any check that produces GitHub annotations.

**Limitation**: Not all CI steps produce annotations. Test failures from Vitest typically do not.

### Tier 2: Failed Step Logs (Raw Text)

```bash
RUN_ID=$(gh run list --branch "$BRANCH" --status failure --limit 1 --json databaseId -q '.[0].databaseId')
gh run view "$RUN_ID" --log-failed 2>&1
```

**When to use**: When Tier 1 returns no annotations, or for test failures and build errors.

**Known issue**: `gh run view --log` can fail silently for very large logs (>100MB). Set a timeout and have Tier 3 ready.

### Tier 3: Full Log Tail (Last Resort)

```bash
gh run view "$RUN_ID" --log 2>&1 | tail -300
```

**When to use**: When `--log-failed` returns empty (happens with cancelled runs or infrastructure failures).

**Alternative**: Download the log archive via API:
```bash
gh api "repos/$OWNER_REPO/actions/runs/$RUN_ID/logs" > /tmp/ci-logs.zip
# Note: the redirect URL expires after 1 minute — download immediately
```

## Failure Signatures

### TypeScript Errors (typecheck step)

**Detection**: Lines matching `error TS\d{4}:`

**Common patterns**:

| Error Code | Meaning | Auto-fix Strategy |
|------------|---------|-------------------|
| TS2345 | Argument type mismatch | Cast, widen param type, or fix caller |
| TS2339 | Property doesn't exist on type | Add to interface or fix property name |
| TS2304 | Cannot find name | Add import or fix typo |
| TS2307 | Cannot find module | Fix import path, check tsconfig paths |
| TS2322 | Type not assignable | Fix the assignment or update the type |
| TS7006 | Parameter implicitly has 'any' type | Add type annotation |
| TS18046 | Variable is of type 'unknown' | Add type narrowing |
| TS2554 | Expected N arguments, got M | Fix call site argument count |
| TS2741 | Property missing in type but required | Add missing property |

**Fix approach**: Read the file at the reported line number, understand the surrounding context (10 lines above/below), apply the minimal type-correct fix.

**Integration-specific**: After merging multiple PRs, the most common TS errors are TS2304 (import from renamed/moved file) and TS2339 (property removed by one PR, used by another).

### ESLint Violations (lint step)

**Detection**: Lines with rule names like `@typescript-eslint/no-unused-vars` or `react-hooks/exhaustive-deps`

**Auto-fix**: Run `npm run lint:fix` first — this resolves ~80% of lint issues (formatting, import order, etc.).

**Manual-fix patterns**:

| Rule | Fix |
|------|-----|
| `no-unused-vars` | Remove the unused import/variable |
| `@typescript-eslint/no-explicit-any` | Replace `any` with proper type |
| `react-hooks/exhaustive-deps` | Add missing deps to array (verify no infinite loops) |
| `no-console` | Remove console.log or replace with proper logging |

**Integration-specific**: Merging imports from multiple PRs often creates unused-vars (both PRs import the same thing, one is shadowed).

### Test Failures (test step)

**Detection**: `FAIL` prefix, `AssertionError`, `expect(received).toBe(expected)`, `Vitest` error blocks

**Diagnosis approach**:
1. Extract the failing test file and test name
2. Extract the expected vs. received values
3. Read both the test file AND the source file it tests
4. Determine: is the test wrong (outdated expectation) or the source wrong (regression)?

**Decision heuristic**:
- If the PR being merged CHANGED the source file → test expectation may need updating
- If the PR only added tests → the source has a regression from another PR's merge
- If the test uses mocked data → check if mock shape matches current types

**Flaky test check** (BEFORE diagnosis): See "Flaky Test Management" section below.

**CRITICAL**: Never delete failing tests. Either fix the source or update the test expectation with a clear reason.

### Build Errors (build step)

**Detection**: `Could not resolve`, `Module not found`, `build failed`, `SyntaxError`

**Common post-merge issues**:
- **Moved/renamed file**: PR-A renamed a file, PR-B still imports old path → fix import
- **Deleted export**: PR-A removed an export, PR-B uses it → re-export or update consumer
- **Circular dependency**: Merging PRs created an import cycle → restructure imports
- **Missing env var**: Build needs `PUBLIC_*` env vars → check CI secrets config

### Infrastructure / Timeout Failures

**Detection**: `ETIMEDOUT`, `ENOMEM`, `SIGTERM`, `exceeded`, `runner`, `disk space`

**NOT auto-fixable.** These are environment issues, not code issues.

**Strategy**:
1. Retry once: `gh run rerun <RUN_ID> --failed`
2. If retry fails, report to user with recommendation (e.g., "Runner may be out of memory — consider splitting the build step or upgrading the runner")
3. Never attempt code changes for infrastructure failures

### Dependency Issues

**Detection**: `npm ERR!`, `ERESOLVE`, `peer dep`, `ENOENT`

**Fix**: Usually `npm ci` resolves. If `package-lock.json` has merge conflicts, regenerate:
```bash
git checkout --theirs package-lock.json
npm install
git add package-lock.json
```

## Flaky Test Management

### What is a flaky test?

A test that passes and fails intermittently without code changes. Research shows **20-40% of CI failures are caused by flaky tests** (Trunk.io 2025 data). Without flaky test awareness, a merge skill will waste time "fixing" non-bugs.

### Detection Strategy

**1. Historical tracking** — Maintain `.claude/flaky-tests.json`:

```json
{
  "tests": {
    "src/tests/someTest.test.ts::should handle concurrent requests": {
      "flake_count": 3,
      "total_runs": 20,
      "last_flake": "2026-02-05",
      "last_pass": "2026-02-06",
      "flake_rate": 0.15,
      "category": "timing"
    }
  },
  "updated_at": "2026-02-07T10:30:00Z"
}
```

**2. Change correlation** — Before treating a test failure as flaky, check:
- Did ANY PR in the merge batch modify the test file? → **Not flaky** (real failure)
- Did ANY PR modify files that the test imports/exercises? → **Probably not flaky** (real failure)
- Was the test already in the flaky registry? → **Likely flaky** (retry once)
- Did the test pass on the individual PR branch but fail on the integration branch? → **Integration issue** (not flaky, diagnose)

**3. Retry protocol**:
```bash
# Retry only the failed jobs (not the entire workflow)
gh run rerun <RUN_ID> --failed
gh run watch <RERUN_ID> --exit-status
```

- **Retry passes**: Record flake in `.claude/flaky-tests.json`, continue merge
- **Retry fails**: Treat as genuine failure, proceed to diagnosis
- **Max 1 retry per test** — two consecutive failures = real failure regardless of flaky history

### Flaky Test Categories

| Category | Signature | Root Cause |
|----------|-----------|------------|
| **Timing** | `setTimeout`, `waitFor`, race conditions | Async operations with insufficient wait |
| **Environment** | Passes locally, fails in CI | CI runner differences (memory, CPU, network) |
| **Order-dependent** | Fails only when run with other tests | Shared mutable state between tests |
| **Network** | `ECONNREFUSED`, `timeout`, `fetch failed` | External service dependency |

## Integration-Specific Failures

These failures only appear when merging multiple PRs together:

### Duplicate Identifiers
Two PRs independently add the same import or variable name.
- **Fix**: Remove the duplicate, keep one instance

### Interface Divergence
Two PRs modify the same TypeScript interface differently.
- **Fix**: Union both sets of changes into the interface

### Conflicting Test Mocks
Two PRs mock the same module differently.
- **Fix**: Merge mock configurations, ensure both test suites' expectations work

### State Shape Mismatch
One PR changes a data structure, another PR adds code using the old shape.
- **Fix**: Update the newer code to use the new data structure shape

### Semantic Conflicts (textually clean, logically broken)
Git merges cleanly but the result is wrong. Example: PR-A renames `calculateTotal()` to `computeTotal()`, PR-B adds a call to `calculateTotal()` in a different file. No textual conflict, but a runtime error.

- **Detection**: These are caught by typecheck (TS2304: Cannot find name) or test failures, NOT by git merge
- **Fix**: After every merge, run `tsc --noEmit` even if git reported no conflicts. This catches semantic conflicts early.
- **Prevention**: The skill runs `.workstream/verify.sh` after every integration merge, which includes typecheck

## Bisection Protocol

When the integration branch fails verification after 3 fix attempts, use binary bisection to isolate the culprit PR.

### Algorithm

Given PRs [A, B, C, D] merged in order and failing:

```
Round 1: Test [A, B] (first half)
  → If PASS: culprit is in [C, D]
  → If FAIL: culprit is in [A, B]

Round 2: Test the failing half
  → [A, B] fails? Test [A] alone
  → [C, D] fails? Test [A, B, C]
    → If PASS: culprit is D
    → If FAIL: culprit is C
```

**Complexity**: O(log₂ N) verification runs. For 4 PRs = 2 runs. For 8 PRs = 3 runs. For 16 PRs = 4 runs.

### Implementation

```bash
# Create a test branch for the first half
git checkout <base-branch>
git checkout -b bisect-test
git merge origin/<pr-A-branch> --no-edit
git merge origin/<pr-B-branch> --no-edit

# Run verification
.workstream/verify.sh
RESULT=$?

# Clean up
git checkout <integration-branch>
git branch -D bisect-test
```

### Special Cases

- **`--first-parent` for git bisect**: If using `git bisect` directly (instead of manual splitting), always use `--first-parent` to treat each PR as a single unit. Without this, bisect may land on intermediate commits within a PR branch that were never meant to be standalone.

- **Build failures during bisection**: Some intermediate states may not compile (e.g., PR-B depends on PR-A's changes). Use exit code 125 (`git bisect skip`) for these.

- **Dependency chains**: If PR-B depends on PR-A, they must always be tested together (never test B without A). Adjust the bisection split points to respect dependencies.

### Reporting

```
Bisection Result (2 verification runs):
  ✓ PRs #64, #65, #66 integrate cleanly and pass all checks
  ✗ PR #63 introduces failure when combined with the above

  Failing check: test (vitest)
  Test: src/tests/wizardScoring.test.ts::should compute correct P3 score
  Error: Expected 42, received 37
  Likely cause: PR #63 refactored scoring logic, conflicting with #66's new inputs

Options:
  1. Merge passing subset (#64, #65, #66) now, fix #63 separately
  2. Attempt to fix #63's integration issues
  3. Abort
```
