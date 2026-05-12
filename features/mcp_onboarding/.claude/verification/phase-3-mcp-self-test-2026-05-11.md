# MCP Onboarding Self-Test

Date: 2026-05-11 23:02:36 -0700

Command:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-self-test
```

Result: passed.

Stages passed:

- `preflight`
- `prepare-target`
- `seed-user`
- `start-services`
- `codex-mcp-login`
- `codex-apply-patch`
- `install-and-build-target`
- `find-mcp-project`
- `emit-target-event`
- `assert-dashboard-event`
- `teardown`

Evidence summary:

- Local migrations applied successfully.
- Workspace SDK built successfully.
- Temporary target Next.js app was created.
- Codex logged into the local MCP server through OAuth.
- `prepare_nextjs_install_patch` returned a ready patch.
- The returned patch passed `git apply --check` before application.
- Target app installed dependencies and `next build` passed.
- Target app emitted analytics events through the local events service.
- Dashboard live analytics API returned the event for the MCP-created project.
- Harness teardown completed.
