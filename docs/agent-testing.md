# Agent Testing Harness

This project should be testable by agents without using a human GitHub account. The local harness uses deterministic scenario files, a non-production login endpoint, and seeded database state. Real GitHub coverage belongs in a later sandbox-org tier.

## Goals

- Let agents create known product states without GitHub OAuth.
- Make dashboard, onboarding, project, quota, regenerate, and analytics states reproducible.
- Keep personal accounts and production data out of automated tests.
- Give every scenario an explicit contract: seed data, routes, and expected assertions.

## Trust Layers

| Layer                    | Purpose                                                               | External services       | Current status              |
| ------------------------ | --------------------------------------------------------------------- | ----------------------- | --------------------------- |
| Local state              | Dashboard state, auth, project status, quota, PR links                | None                    | Implemented by `e2e:seed`   |
| Local analytics fixtures | Deterministic event payloads for campaigns and sessions               | None                    | Written to `.e2e-fixtures/` |
| Staging GitHub sandbox   | Real GitHub App install, repo analysis, PR creation, webhook delivery | Sandbox GitHub org only | Future phase                |

Local tests should prefer seeded state over third-party UI. Only flows that must prove real GitHub behavior should use the later sandbox org.

## Scenario Files

Scenario files live in `apps/web/e2e/scenarios/*.json`.

Required top-level fields:

| Field                  | Meaning                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | Stable scenario id. Must match the filename.                                                                                  |
| `description`          | Human-readable purpose.                                                                                                       |
| `tags`                 | Searchable labels such as `local`, `state`, `analytics`, `github-app`.                                                        |
| `user`                 | Seeded app user. The user logs in through `/api/auth/e2e-login`.                                                              |
| `github.installations` | Local GitHub installation records for project ownership and app-token state.                                                  |
| `projects`             | Seeded project rows. Each project owns a status and optional PR, quota, detection, and conversion state.                      |
| `analytics.events`     | Deterministic event payloads. The local seeder writes these to `.e2e-fixtures/`; staging can later replay them into Tinybird. |
| `expectations`         | Routes and assertions future agents should verify.                                                                            |

The scenario contract intentionally includes GitHub-looking ids and PR URLs, but local phase tests do not call GitHub.

## Commands

List scenarios:

```bash
pnpm --filter web e2e:scenarios
```

Seed a scenario:

```bash
pnpm --filter web e2e:seed active-project-with-campaign-data
```

Refresh only the local analytics fixture for a scenario:

```bash
pnpm --filter web e2e:replay-events active-project-with-campaign-data
```

Run an E2E scenario test:

```bash
pnpm --filter web e2e --grep @scenario
```

The seeder defaults to the local Playwright database URL:

```text
postgres://postgres:postgres@127.0.0.1:5432/postgres
```

It refuses to seed a non-local database unless `E2E_ALLOW_REMOTE_SEED=1` is explicitly set.

If `.env.local` points at a different local Postgres port, override it explicitly:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:seed analysis-failed-can-regenerate
```

When `E2E_TEST_MODE=1`, analytics API routes read `.e2e-fixtures/*/events.json` before Tinybird. This keeps campaign/session/live-feed checks deterministic and account-free.

## MCP Analytics Querying

Use the MCP analytics querying harness when you need to prove that a coding agent can retrieve Tally analytics through MCP tools, not through direct service imports, dashboard HTTP APIs, or browser UI assertions.

Run the harness against the local E2E database:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:mcp-analytics-querying
```

The harness seeds local analytics scenarios, creates local OAuth rows for the MCP resource at `http://localhost:3000/api/mcp`, starts the web app with `E2E_TEST_MODE=1`, connects an MCP SDK client through `StreamableHTTPClientTransport`, and calls the read-only analytics tools over the hosted MCP route. Passing output is compact JSON with `ok: true` plus named stages such as `tools-list`, `usage-summary`, `signup-path`, `missing-signup-recommendation`, `ownership-guard`, and `invalid-inputs`.

The harness deletes temporary fixtures and local OAuth rows by default. Add `--keep` only when you need to inspect `tmp/mcp-analytics-querying-self-test/` after a failure.

## Agent Workflow

1. Pick a scenario from `pnpm --filter web e2e:scenarios`.
2. Run `pnpm --filter web e2e:seed <scenario-id>`.
3. Log in by POSTing `{ "userId": "<scenario.user.id>" }` to `/api/auth/e2e-login`, or use `loginScenarioUser` from `apps/web/e2e/support/scenarios.ts`.
4. Visit the route in `scenario.expectations.startPath` or a project path.
5. Assert only behavior defined by the scenario.

## Boundaries

- Do not use a human GitHub account for local E2E.
- Do not seed production by default.
- Do not put secrets in scenario files.
- Do not treat local fixture events as proof that Tinybird staging is healthy. They are local product-state contracts.
