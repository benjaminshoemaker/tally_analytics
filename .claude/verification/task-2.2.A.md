TASK VERIFICATION: 2.2.A
========================

TDD Compliance:
- Tests Found: 4/4 criteria covered in `packages/sdk/test/types.test.ts`
- Test-First: PASS (tests and implementation in commit 3748f4f)

Tests Run:
- `pnpm --filter sdk test`

Criteria Verification:
- [V-001] PASS — AnalyticsEvent includes V2 fields in `packages/sdk/src/types.ts:9`
- [V-002] PASS — Types exported from `packages/sdk/src/index.ts:1`
- [V-003] PASS — SDK tests compile/run without type errors (`pnpm --filter sdk test`)
- [V-004] PASS — SDK test suite passed (`pnpm --filter sdk test`)
