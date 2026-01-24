---
description: Scan for security vulnerabilities in dependencies, code, and secrets
argument-hint: [--deps|--secrets|--code|--fix]
allowed-tools: Bash, Read, Edit, Grep, Glob, AskUserQuestion
---

Scan the codebase for security vulnerabilities.

## Directory Guard (Wrong Directory Check)

Before starting:
- If the current directory appears to be the toolkit repo (e.g., `GENERATOR_PROMPT.md` exists), **STOP** and tell the user to run `/security-scan` from their project directory instead.

## Arguments

`$1` = Optional flag to limit scan scope:
- `--deps` — Dependency vulnerabilities only
- `--secrets` — Secrets detection only
- `--code` — Static analysis only
- `--fix` — Auto-fix issues where possible
- (no argument) — Run all checks

## Process

Follow the instructions in `.claude/skills/security-scan/SKILL.md`:

1. **Detect tech stack** from package.json, requirements.txt, etc.
2. **Run dependency audit** using npm audit, pip-audit, etc.
3. **Run secrets detection** using pattern matching
4. **Run static analysis** for insecure code patterns
5. **Present findings** with severity levels
6. **Offer fixes** for each CRITICAL and HIGH issue
7. **Apply fixes** based on user choices

## Scope Filtering

If `$1` is provided:
- `--deps`: Skip steps 3-4, only run dependency audit
- `--secrets`: Skip steps 2 and 4, only run secrets detection
- `--code`: Skip steps 2-3, only run static analysis
- `--fix`: Run all checks, auto-fix without prompting where safe

## Output

```
SECURITY SCAN RESULTS
=====================
Tech Stack: [detected]
Checks Run: [list]

CRITICAL (N)
------------
[issue details]

HIGH (N)
--------
[issue details]

Summary: X critical, Y high, Z medium, W low
Status: PASSED | FAILED | PASSED WITH NOTES
```

## Exit Criteria

- **PASSED**: No critical or high issues
- **PASSED WITH NOTES**: No critical/high, but medium/low exist
- **FAILED**: Critical or high issues remain unresolved

## Logging

Append a summary entry to `.claude/verification-log.jsonl`:
```json
{
  "timestamp": "{ISO timestamp}",
  "scope": "security-scan",
  "status": "PASSED | PASSED WITH NOTES | FAILED",
  "critical": N,
  "high": N,
  "evidence": null
}
```
