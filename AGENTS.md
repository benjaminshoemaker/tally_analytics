# AGENTS.md — Tally Analytics

Project-wide guidance for AI agents working on Tally Analytics.

## Project Context

Tally is MCP-first analytics for apps built with AI coding agents. The local
agent installs and improves instrumentation; the Tally dashboard shows usage,
billing, project status, and confirmed analytics tasks.

Read these sources as needed:

- `docs/product/vision.md` for product direction
- `docs/product/user-flows.md` for canonical flows
- `docs/architecture.md` for system boundaries
- `docs/feature-history.md` for implemented feature status
- `IDEAS.md` for uncommitted opportunities
- `docs/agent-testing.md` and `docs/local-env.md` for verification setup

Feature folders preserve product and technical context. Their presence does not
authorize implementation, and old execution plans are not active requirements.

## Working Rules

- Make the smallest change that solves the requested problem.
- Default to tests first for behavior changes.
- Reuse existing project patterns before adding APIs or dependencies.
- Treat product claims, provider state, and external-service results as facts to
  verify.
- Keep root `.env.local` canonical; app-local environment files must remain
  absent or symlinked. Run `pnpm env:check` without printing secrets.
- Real GitHub App verification must use the sandbox organization.
- Preserve the MCP analytics query surface as read-only unless the user
  explicitly requests a product change.
- Treat instruction, automation, CI, auth, billing, and security configuration
  as high-impact files and call out changes explicitly.
- Capture durable product ideas in `IDEAS.md` or a focused feature brief, not
  generated phase state or agent logs.

## Verification

Use the narrowest relevant commands, then expand for risky or cross-cutting
changes:

```bash
pnpm env:check
pnpm --filter @tally-analytics/sdk build
pnpm -C apps/web typecheck
pnpm -C apps/web test
pnpm build
```

The seeded browser and MCP harnesses are documented in
`docs/agent-testing.md`. Before manual escalation, try repository commands,
local CLI tools, direct APIs or SDKs, MCP tools, and browser automation.

For SDK changes, report the gzipped bundle size:

```bash
gzip -c packages/sdk/dist/index.js | wc -c
```

For Postgres migrations, prefer additive changes and verify affected tests.
Treat Tinybird schema changes as non-reversible: validate in staging and record
the exact migration commands.

## Git

Work in the current Git context unless the user requests a branch or worktree.
Stage only intended files. Report changes, verification, blockers, and relevant
follow-up work when finished.
