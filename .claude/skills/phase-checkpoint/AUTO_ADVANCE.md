# Auto-Advance Logic

Check if auto-advance is enabled and this checkpoint passes all criteria.

## Configuration Check

Read `.claude/settings.local.json` for auto-advance configuration:

```json
{
  "autoAdvance": {
    "enabled": true      // default: true
  }
}
```

If `autoAdvance` is not configured, use defaults (`enabled: true`).

## Auto-Advance Conditions

Auto-advance to `/phase-prep {N+1}` ONLY if ALL of these are true:

1. ✓ All automated checks passed (tests, lint, types, security)
2. ✓ No "truly manual" verification items remain (auto-verify was attempted above)
3. ✓ No production verification items exist
4. ✓ Phase $1 is not the final phase
5. ✓ `--pause` flag was NOT passed to this command
6. ✓ `autoAdvance.enabled` is true (or not configured, defaulting to true)

**Rationale:** Auto-verify (run in Manual Local Verification above) attempts automation before blocking. Only items that genuinely require human judgment block auto-advance. Production verification items always require human presence to confirm deployed behavior.

## If Auto-Advance Conditions Met

1. **Show brief notification:**
   ```
   AUTO-ADVANCE
   ============
   All Phase $1 criteria verified (no truly manual items remain).
   Proceeding to next phase...
   ```

2. **Execute immediately:**
   - Track this command in auto-advance session log
   - Invoke `/phase-prep {N+1}` using the Skill tool
   - Continue auto-advance chain (phase-prep will continue if it passes)

## If Auto-Advance Conditions NOT Met

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

## Auto-Advance Session Tracking

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

## Session Report (When Auto-Advance Stops)

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
