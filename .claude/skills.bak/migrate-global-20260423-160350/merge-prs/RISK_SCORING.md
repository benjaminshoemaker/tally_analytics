# Risk Scoring & Safety Details

Reference document for Phase 0 of the merge-prs skill: risk assessment, PR classification, security pre-flight, and dry-run merge testing.

## Step 0.1 — PR Risk Scoring

For each PR, compute a **risk score (0–100)** from these weighted factors:

| Factor | Weight | How to Compute |
|--------|--------|----------------|
| **Diff size** | 25% | `additions + deletions`. Score: 0–200 LOC → 0, 200–400 → 25, 400–800 → 50, 800+ → 100 |
| **File count** | 15% | Number of changed files. Score: 1–5 → 0, 6–15 → 30, 16–30 → 60, 30+ → 100 |
| **Hotspot overlap** | 25% | Files with high churn (>10 commits in last 90 days via `git log --since="90 days ago" --pretty=format: --name-only`). Score: (hotspot files in PR / total PR files) × 100 |
| **Test coverage ratio** | 20% | (test files changed / source files changed). Score: ratio ≥1.0 → 0, 0.5–1.0 → 30, <0.5 → 60, 0 tests → 100 |
| **PR staleness** | 15% | Days since PR branch diverged from base. Score: 0–3 days → 0, 4–7 → 30, 8–14 → 60, 14+ → 100 |

**Composite score**: Weighted average of all factors, rounded to nearest integer.

**Risk tiers**:
- **GREEN (0–30)**: Low risk — proceed automatically
- **YELLOW (31–60)**: Medium risk — proceed with caution, highlight concerns
- **RED (61–100)**: High risk — require `--force` or explicit user confirmation

Report risk scores:
```
Risk Assessment:
  PR  │ Score │ Tier   │ Top Factors
  ────┼───────┼────────┼─────────────────────────
  #64 │  12   │ GREEN  │ small diff, high test ratio
  #65 │   8   │ GREEN  │ tiny diff, no hotspots
  #66 │  34   │ YELLOW │ touches hotspot files
  #63 │  72   │ RED    │ 1149+742 LOC, 24 files, low test ratio
```

If any PR is RED and `--force` is not set, ask the user:
- "PR #63 has a RED risk score (72). Proceed anyway, skip this PR, or abort?"

## Step 0.2 — PR Classification (Rust-style tiers)

Auto-classify each PR into merge tiers based on its characteristics:

| Tier | Criteria | Merge Strategy |
|------|----------|----------------|
| **always** | Docs-only, test-only, config-only, <50 LOC | Batch freely, merge first |
| **maybe** | Standard feature/fix, 50–400 LOC, <10 files | Default — merge in dependency order |
| **iffy** | Touches CI config, build scripts, DB migrations, >400 LOC | Include sparingly, test carefully |
| **never** | >800 LOC, performance-sensitive, platform-dependent, >20 files | Merge individually, never batch |

**Detection heuristics**:
- `always`: All changed files match `*.md`, `*.test.*`, `*.config.*`, `.github/*`
- `iffy`: Changed files include `*.yml`, `*.toml`, `migrations/*`, `package.json`
- `never`: `additions + deletions > 800` OR `files > 20`
- `maybe`: Everything else

Report tiers alongside risk scores. Use tiers to compose the merge batch — `never`-tier PRs are excluded from batching and offered as individual merges after the batch.

## Step 0.3 — Security Pre-flight (skip if `--no-security`)

Run a lightweight security scan on each PR's diff:

**1. Secrets scan** — Check diff for high-entropy strings and known patterns:
```bash
gh pr diff <PR_NUMBER> | grep -iE '(api[_-]?key|secret|token|password|credential|private[_-]?key)\s*[:=]' || true
```

Also check for:
- AWS keys: `AKIA[0-9A-Z]{16}`
- Generic high-entropy: base64 strings >40 chars adjacent to key-like variable names
- `.env` file additions

**2. Dependency audit** — If `package.json` or `package-lock.json` changed:
```bash
# Check for new dependencies
gh pr diff <PR_NUMBER> -- package.json | grep '^\+.*"dependencies\|^\+.*"devDependencies' -A 50 | grep '^\+'
# Audit for known CVEs
npm audit --json 2>/dev/null | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical" or .value.severity == "high") | {name: .key, severity: .value.severity}'
```

**3. Report**:
```
Security Pre-flight:
  PR #63: ✓ No secrets detected, ✓ No new dependencies
  PR #65: ✓ No secrets detected, ⚠ package.json changed — 0 critical CVEs
  PR #66: ✓ Clean
```

**BLOCK** if secrets are detected (require user override). **WARN** on dependency changes with CVEs.

## Step 0.4 — Pre-merge Dry-run with `git merge-tree`

Before creating any branches, test mergeability using `git merge-tree` which operates entirely in the object database (no working tree changes):

```bash
# Fetch all PR branches
for PR in <pr-numbers>; do
  BRANCH=$(gh pr view $PR --json headRefName -q '.headRefName')
  git fetch origin "$BRANCH"
done

# Test pairwise mergeability (for conflict matrix)
git merge-tree --write-tree origin/<base> origin/<branch-A> 2>&1
# Exit code 0 = clean merge, non-zero = conflicts
# Output includes "CONFLICT" lines with file paths
```

This replaces file-overlap heuristics with **actual conflict detection**. Report results:

```
Dry-run Merge Results:
  main + #64: ✓ Clean merge
  main + #64 + #65: ✓ Clean merge
  main + #64 + #65 + #66: ✓ Clean merge
  main + #64 + #65 + #66 + #63: ⚠ 3 conflicts
    - src/lib/wizardScoring.ts (content conflict)
    - src/pages/api/properties.ts (content conflict)
    - package-lock.json (content conflict)
```

If `--dry-run` was specified and this step completes, STOP HERE and report the full analysis (risk scores, tiers, security, dry-run results).
