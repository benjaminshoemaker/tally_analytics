TASK VERIFICATION: 2.2.C
========================

TDD Compliance:
- Tests Found: 8/8 criteria covered in `apps/web/tests/github-templates.test.ts`
- Test-First: UNABLE TO VERIFY (pending commit for updated tests)

Tests Run:
- `pnpm --filter web test`

Criteria Verification:
- [V-001] PASS — App Router template includes V2 tracking in `apps/web/lib/github/templates/app-router.ts:24`
- [V-002] PASS — Pages Router template includes V2 tracking in `apps/web/lib/github/templates/pages-router.ts:22`
- [V-003] PASS — session_start includes visitor + UTM fields in `apps/web/lib/github/templates/app-router.ts:362`
- [V-004] PASS — page_view includes engagement/scroll/cta fields in `apps/web/lib/github/templates/app-router.ts:389`
- [V-005] PASS — unload/visibility handlers send final page metrics in `apps/web/lib/github/templates/app-router.ts:337`
- [V-006] PASS — DNT gate present in `apps/web/lib/github/templates/app-router.ts:46`
- [V-007] PASS — templates are self-contained (no SDK import) in `apps/web/tests/github-templates.test.ts:24`
- [V-008] PASS — Web test suite passed (`pnpm --filter web test`)
