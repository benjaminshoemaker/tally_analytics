# Suggested AGENTS.md Additions

## Reason for Additions

The GitHub OAuth feature includes:
1. **UI tasks with browser verification** — Login page, header dropdown, and marketing CTAs need visual confirmation
2. **Database migrations** — Schema changes and table drops require careful execution
3. **Follow-up tracking** — Complex migration may surface edge cases or cleanup needs

The current AGENTS.md covers TDD workflow and task execution but doesn't address these specific verification types.

---

## New Sections to Add

### Browser Verification Workflow

```markdown
## Browser Verification

For tasks marked **"Requires Browser Verification: Yes"**:

1. **Start dev server** if not running: `pnpm dev`
2. **Navigate to relevant pages** specified in acceptance criteria
3. **Verify each UI criterion visually**:
   - Elements render correctly
   - Interactions work (clicks, hovers, dropdowns)
   - Error states display properly
4. **Check browser console** for errors
5. **Test responsive behavior** if applicable (resize or device emulation)

Report verification results:
- Screenshot descriptions for visual changes
- Any console errors encountered
- Deviations from acceptance criteria

If browser verification fails, continue debugging in the same conversation context (per existing workflow).
```

**Where to add:** After "Testing Policy" section

---

### Database Migration Workflow

```markdown
## Database Migrations

For tasks involving database schema changes:

1. **Create migration file** using Drizzle Kit patterns
2. **Update schema.ts** to reflect new columns/tables
3. **Test migration locally**:
   - Apply: `pnpm drizzle-kit push` or generate
   - Verify schema changes in database
4. **Verify existing tests pass** — migrations should be additive/non-breaking when possible
5. **Document rollback** if migration is destructive (e.g., dropping tables)

For destructive migrations (DROP TABLE, DROP COLUMN):
- Ensure all code references are removed first
- Confirm in acceptance criteria that dependent code is deleted
- Note that this is irreversible in the completion report

One-time scripts (like user data migrations):
- Place in `scripts/` directory
- Make idempotent when possible
- Log success/failure for each operation
```

**Where to add:** After "Browser Verification" section

---

### Follow-Up Items Workflow

```markdown
## Follow-Up Items (TODOS.md)

During development, you may discover items outside current task scope: refactoring opportunities, edge cases, documentation needs, technical debt, etc.

**When you identify a follow-up item:**

1. **Prompt the human to start TODOS.md** if it doesn't exist:
   ```
   I've identified a follow-up item: {description}
   Should I create TODOS.md to track this and future items?
   ```

2. **Add items to TODOS.md** with context:
   ```markdown
   ## TODO: {Brief title}
   - **Source:** Task {id} or {file:line}
   - **Description:** {What needs to be done}
   - **Priority:** {Suggested: High/Medium/Low}
   - **Added:** {Date}
   ```

3. **Prompt for prioritization** at phase checkpoints:
   ```
   TODOS.md now has {N} items. Would you like to:
   - Review and prioritize them?
   - Add any to the current phase?
   - Defer to a future phase?
   ```

Do not silently ignore discovered issues. Do not scope-creep by fixing them without approval. Track them in TODOS.md and let the human decide.
```

**Where to add:** After "Deferred Work" section

---

## Summary of Additions

| Section | Purpose |
|---------|---------|
| Browser Verification | Guide for UI acceptance criteria verification |
| Database Migrations | Safe patterns for schema changes |
| Follow-Up Items | Track discovered work without scope creep |

These additions are optional but recommended for this feature's complexity. They can be removed after the feature ships if not useful for future work.
