# GitHub Sandbox

The GitHub sandbox is the only place agents should exercise real GitHub App repo automation. Local E2E should still use `docs/agent-testing.md`.

## App Mapping

| App                                | Use                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| OAuth `Tally Analytics`            | Production human login. Not used for local agent E2E.                                                                               |
| OAuth `Tally Local`                | Local human OAuth testing. Not used by seeded E2E.                                                                                  |
| GitHub App `Tally (local)`         | Local/tunnel GitHub App integration tests. Use when callbacks/webhooks point at a local or staging environment.                     |
| GitHub App `Tally Analytics Agent` | Public/product GitHub App. Use only against sandbox-owned repos for real smoke tests unless explicitly doing production validation. |

For Phase 3, the sandbox repo owner is:

```text
fast-pr-analytics-sandbox
```

## Fixture Repositories

The sync script creates and updates these private repositories:

| Repo                             | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `fpa-fixture-next-app-router`    | Supported Next.js App Router repo.                        |
| `fpa-fixture-next-pages-router`  | Supported Next.js Pages Router repo.                      |
| `fpa-fixture-existing-analytics` | Supported repo with an existing analytics package/import. |
| `fpa-fixture-unsupported-remix`  | Unsupported framework fixture.                            |
| `fpa-fixture-malformed-next`     | Next.js repo with missing supported entrypoint.           |
| `fpa-fixture-monorepo-next`      | Monorepo layout with a nested Next.js app.                |

## Commands

Dry run:

```bash
pnpm --filter web github:sandbox:sync -- --org fast-pr-analytics-sandbox --dry-run
```

Create or update fixture repos:

```bash
pnpm --filter web github:sandbox:sync -- --org fast-pr-analytics-sandbox
```

The script refuses org names that do not include `sandbox` unless `GITHUB_SANDBOX_FORCE=1` is set.

## Local Install Callback Checklist

GitHub App setup callbacks can redirect to `localhost` because the redirect happens in the browser. Webhooks cannot reach `localhost`; use a tunnel or replay signed webhook fixtures for webhook testing.

For a callback like:

```text
http://localhost:4329/api/github/callback?installation_id=...&setup_action=install
```

the local app must be running on the same port before completing the GitHub install:

```bash
PORT=4329 \
NEXT_PUBLIC_APP_URL=http://localhost:4329 \
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
pnpm --filter web dev
```

The callback requires an authenticated local app session. If the browser is not already logged in to `localhost:4329`, the route redirects to `/login` and does not link the installation.

Common failure modes:

- `Couldn't connect to server`: nothing is listening on the callback port.
- DB connection error: `.env.local` points at a local Postgres port that is not running.
- Redirect to `/login`: no valid `fpa_session` cookie for the local app.
- No project rows after install: the setup callback linked the installation, but GitHub webhooks did not reach localhost.

## Guardrails

- Do not run sandbox sync against a personal account.
- Do not run sandbox smoke tests against customer or production repos.
- Install GitHub Apps on selected sandbox repos only.
- Keep fixture repos private unless the human explicitly asks otherwise.
- For local/tunnel testing, prefer `Tally (local)`.
- For production smoke testing, use `Tally Analytics Agent` only after confirming the target repos are in the sandbox org.
