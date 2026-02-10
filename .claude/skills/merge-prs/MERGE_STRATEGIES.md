# Merge Strategies & Finalization

Reference document for Phase 4 (Finalize) and Phase 5 (Cleanup) of the merge-prs skill.

## Phase 4: Finalize

### Step 4.1 — Summary Report

Present a complete summary:

```
Integration Summary
═══════════════════

Branch: integrate/prs-63-64-65-66
Base: main
Safety tag: pre-merge/20260207-143022

Risk scores: #64 (12/GREEN), #65 (8/GREEN), #66 (34/YELLOW), #63 (72/RED)
Security: ✓ No issues detected

PRs merged (in order):
  1. ✓ #64 — Add unit tests for wizard demo scoring helpers (clean)
  2. ✓ #65 — Update wizard demo scoring to reuse shared carry cost helper (clean)
  3. ⚠ #66 — Improve wizard demo predictions (2 conflicts resolved)
  4. ⚠ #63 — Refactor ID routes and services (5 conflicts resolved)

CI fixes applied:
  - PR #63: Fixed TypeScript error in src/pages/api/foo.ts
  - PR #66: Retried flaky test (passed on retry)

Integration fixes:
  - Resolved duplicate import in src/lib/wizardScoring.ts

Verification: ✓ All checks pass (typecheck, lint, test, build)
Total commits on integration branch: <N>
```

### Step 4.2 — Generate Changelog Preview

Parse merged PR titles and categorize by conventional commit type:

```
Changelog Preview:
──────────────────
### Features
- Improve wizard demo predictions and explainability inputs (#66)

### Bug Fixes
- Update wizard demo scoring to reuse shared carry cost helper (#65)

### Refactoring
- Refactor ID routes and services for tech debt cleanup (#63)

### Tests
- Add unit tests for wizard demo scoring helpers (#64)
```

If PR titles do not follow conventional commit format, infer type from:
- Labels: `enhancement` → feat, `bug` → fix, `documentation` → docs
- File patterns: only `.test.*` files → test, only `.md` files → docs
- PR title keywords: "add" → feat, "fix" → fix, "refactor" → refactor, "update" → fix

Include this changelog in the PR body (Option 3) or commit message (Options 1/2).

### Step 4.3 — Ask User for Merge Strategy

Present options:

```
How would you like to proceed?

1. Merge integration branch → main (squash)
   Creates a single commit on main with all changes

2. Merge integration branch → main (merge commit)
   Preserves individual PR commits with a merge commit

3. Close individual PRs and push integration branch (Recommended)
   Push the integration branch and create a new combined PR

4. Keep integration branch for review
   Don't merge yet — inspect the branch first
```

**Default recommendation**: Option 3 (new combined PR) — it preserves auditability and lets CI run on the combined result before merging to main.

### Step 4.4 — Execute Chosen Strategy

**Option 1 (squash)**:
```bash
git checkout main
git merge --squash integrate/<name>
git commit -m "$(cat <<'EOF'
feat: merge PRs #63, #64, #65, #66

- #63: Refactor ID routes and services for tech debt cleanup
- #64: Add unit tests for wizard demo scoring helpers
- #65: Update wizard demo scoring to reuse shared carry cost helper
- #66: Improve wizard demo predictions and explainability inputs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
Then ask before pushing.

**Option 2 (merge commit)**:
```bash
git checkout main
git merge integrate/<name> --no-ff -m "merge: integrate PRs #63 #64 #65 #66"
```
Then ask before pushing.

**Option 3 (new PR)**:
```bash
git push -u origin integrate/<name>
gh pr create --base main --title "Integrate PRs #63, #64, #65, #66" --body "$(cat <<'EOF'
## Summary
Combined integration of multiple PRs with conflict resolution.

### PRs included
- #63: Refactor ID routes and services for tech debt cleanup
- #64: Add unit tests for wizard demo scoring helpers
- #65: Update wizard demo scoring to reuse shared carry cost helper
- #66: Improve wizard demo predictions and explainability inputs

### Risk Assessment
| PR | Score | Tier |
|----|-------|------|
| #64 | 12 | GREEN |
| #65 | 8 | GREEN |
| #66 | 34 | YELLOW |
| #63 | 72 | RED |

### Conflicts resolved
- {list of resolved conflicts}

### CI fixes applied
- {list of CI fixes}

### Changelog
{changelog preview from Step 4.2}

## Test plan
- [x] All individual PR tests pass
- [x] Integration verification passes (typecheck, lint, test, build)
- [x] Security pre-flight passed
- [ ] Manual review of conflict resolutions

Generated with [Claude Code](https://claude.com/claude-code) `/merge-prs`
EOF
)"
```

**Option 4 (keep for review)**:
Report the branch name and how to inspect it. No further action.

### Step 4.5 — Post-merge Validation (Options 1/2 only)

If the user chose to merge directly to main (Options 1 or 2):

1. **Poll CI on the merge commit** (up to 15 minutes):
   ```bash
   # Get the merge commit SHA
   MERGE_SHA=$(git rev-parse HEAD)
   # Wait for CI to complete
   gh run list --commit "$MERGE_SHA" --limit 1 --json databaseId,status,conclusion
   ```

2. **If CI passes**: Report success. Clean up:
   ```
   ✓ Post-merge CI passed. Integration complete.
   Safety tag 'pre-merge/20260207-143022' can be deleted when you're confident.
   ```

3. **If CI fails**: Automatically draft a revert PR:
   ```bash
   git checkout -b revert/integrate-<name> main
   git revert -m 1 HEAD --no-edit
   git push -u origin revert/integrate-<name>
   gh pr create --title "Revert: Integrate PRs #63, #64, #65, #66" --body "$(cat <<'EOF'
   ## Revert Reason
   Post-merge CI failed after integrating PRs #63, #64, #65, #66.

   **Failure**: {failure description from CI logs}

   ## Rollback
   This reverts the integration merge commit. The original integration
   branch `integrate/<name>` is preserved for debugging.

   Safety tag: `pre-merge/20260207-143022`
   EOF
   )"
   ```

   Report: "Post-merge CI failed. Revert PR drafted: <URL>. Review and merge to rollback."

---

## Phase 5: Cleanup

After the integration PR is merged (Option 3) or the direct merge succeeds (Options 1/2), **automatically prompt** for full cleanup. Do NOT wait for the user to ask.

### Step 5.1 — Prompt for Cleanup

Present the cleanup plan:

```
Integration complete! Ready to clean up?

This will:
  • Close original PRs #63, #64, #65, #66 (with "Included in #67" comment)
  • Delete remote branches for all original PRs
  • Delete the integration branch (local + remote)
  • Delete the safety tag
  • Switch to main and pull latest
  • Prune stale remote-tracking references
  • Delete local branches whose remotes are gone

Proceed? [Y/n]
```

If the user confirms (or says nothing indicating yes), execute all cleanup steps. If they decline, report what manual steps they'd need to take later.

### Step 5.2 — Execute Cleanup

**Close original PRs and delete their remote branches:**
```bash
for PR in <pr-numbers>; do
  gh pr close $PR --comment "Included in integration PR #<integration-pr>" --delete-branch
done
```

**Switch to main and pull:**
```bash
git checkout main
git pull origin main
```

**Delete local integration branch:**
```bash
git branch -D integrate/<name> 2>/dev/null
```

**Delete safety tag:**
```bash
git tag -d pre-merge/<timestamp> 2>/dev/null
```

**Prune stale remotes and delete orphaned local branches:**
```bash
git fetch --prune
# Delete local branches whose remote tracking branch is gone
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -D
```

**Verify clean state:**
```bash
git status
git branch
```

### Step 5.3 — Report Final State

```
Cleanup Complete
════════════════
  ✓ PRs #63, #64, #65, #66 closed
  ✓ Remote branches deleted (4 PR branches + integration)
  ✓ Local integration branch deleted
  ✓ Safety tag deleted
  ✓ On main, up to date with origin

  Remaining local branches:
    * main
    (list any other local branches that still have remotes)

  Ready for new work.
```

---

## CI Log Quick-Reference

Common `gh` commands used by this skill:

```bash
# Check Run Annotations (structured errors — best for auto-fix)
gh api repos/{owner}/{repo}/check-runs/{id}/annotations \
  --jq '.[] | {path, line: .start_line, level: .annotation_level, message}'

# List failed runs for a branch
gh run list --branch <BRANCH> --status failure --limit 3 --json databaseId,name,conclusion,startedAt

# Get failed step output
gh run view <RUN_ID> --log-failed

# Get full run log (fallback)
gh run view <RUN_ID> --log 2>&1 | tail -300

# Watch a run in progress
gh run watch <RUN_ID> --exit-status

# Re-run only failed jobs (for flaky test retry)
gh run rerun <RUN_ID> --failed

# Check PR status
gh pr checks <PR_NUMBER>
```
