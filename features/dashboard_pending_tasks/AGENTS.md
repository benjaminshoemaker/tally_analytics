# AGENTS.md

Scoped execution guidance for this feature.

Base project rules live in `../../AGENTS.md`.

## Scope

- Run feature execution commands from this directory.
- This file applies only to work tracked by this directory's `EXECUTION_PLAN.md`.

## Required Context

Before starting a task, read:
1. `../../AGENTS.md`
2. `../../plans/PLAN_STATUS.md` and confirm this feature is planned or active and explicitly authorized for execution
3. `FEATURE_SPEC.md`
4. `FEATURE_TECHNICAL_SPEC.md`
5. `FLOW_VERIFICATION_PLAN.md` if it exists
6. `EXECUTION_PLAN.md`
7. `../../LEARNINGS.md` if it exists

## Task Loop

1. Start fresh for each new task.
2. Read the task definition and acceptance criteria from `EXECUTION_PLAN.md`.
3. Confirm dependencies and relevant existing-code patterns.
4. Add or update tests when behavior changes.
5. Implement the minimum change needed.
6. Verify using the metadata in `EXECUTION_PLAN.md` and `.claude/verification-config.json`.
7. Update completed checkboxes in `EXECUTION_PLAN.md`.
8. Commit after verification passes using `task({id}): {description} [REQ-XXX]`.

## Regression Expectations

- When touching existing code, run the relevant regression checks, not just new tests.
- Reuse existing project patterns before introducing new ones.
- Before asking for manual verification, try to verify directly. If current
  tools cannot verify an objective criterion, look for an MCP, CLI, API, SDK,
  seeded scenario, provider sandbox, or browser automation path that would make
  it agent-verifiable and propose that setup before escalating to the human.

## Feature-Specific Workflow Additions

- Keep this workstream planned unless the human explicitly promotes it; do not change the primary active workstream away from `features/mcp_onboarding/` during routine planning or implementation.
- When implementing Tinybird schema additions, document exact staging and production alter commands before applying them because Tinybird column additions are non-reversible.
- When implementing SDK changes, measure the gzipped SDK bundle before and after the change and keep it under 3072 bytes.
