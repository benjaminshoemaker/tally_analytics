# MCP Self-Test Plan

## Goal

Make the MCP-first onboarding flow testable by an agent end to end, without relying on a human to manually inspect intermediate states.

The target proof is:

1. Tally web/MCP server runs locally.
2. Codex connects to Tally over MCP.
3. Codex authenticates to the MCP server.
4. Codex runs against a disposable Next.js app.
5. The MCP tool creates/reuses a Tally project and returns an install patch.
6. Codex applies the patch.
7. The target app installs, builds, and runs.
8. A browser visit emits real analytics events.
9. The Tally dashboard shows those events for the MCP-created project.

## Non-Goals

- Does not test Tinybird ingestion (local fixture sink replaces it).
- Does not exercise human GitHub OAuth (E2E bootstrap replaces it).
- Does not validate production hosting, DNS, or staging secrets.
- Does not replace existing `@scenario` browser tests for dashboard states.

## Required Environment

| Variable | Purpose | Required for |
| --- | --- | --- |
| `E2E_TEST_MODE=1` | Gate all E2E-only paths (fixture sink, OAuth bootstrap, fixture reads) | All phases |
| `E2E_EVENTS_FIXTURE_SCENARIO=mcp-self-test` | Selects fixture file path under `.e2e-fixtures/` | Phase A, C |
| `E2E_MCP_AUTH_USER_ID` | Seeded user the OAuth bootstrap auto-authorizes | Phase B, C |
| `NEXT_PUBLIC_TALLY_EVENTS_URL` | Target app override pointing at local events app | Phase A, C |
| `DATABASE_URL` | Local Postgres URL (matches existing seeder rules) | All phases |

Cross-references: see `docs/agent-testing.md` for harness conventions and `docs/github-sandbox.md` for sandbox org access.

## Current Coverage

Already covered by the MCP onboarding feature:

- OAuth server route tests.
- MCP bearer-token auth tests.
- MCP tool registration tests.
- Next.js detection and patch generation fixture tests.
- `git apply --check` fixture coverage for ready patches.
- Project create/reuse coverage for MCP projects.
- Dashboard/API support for MCP project rows with nullable GitHub fields.
- Local seeded dashboard scenarios for MCP active/no-event and MCP active/with-events states.
- Browser `@scenario` tests for the MCP waiting-for-first-event state.

Not yet covered:

- Codex CLI acting as the MCP client against the hosted/local Tally MCP endpoint.
- A generated patch being applied to a separate disposable Next.js repo by Codex.
- A patched app emitting runtime events.
- The dashboard changing from waiting state to actual event data from those emitted events.

## Required Product Changes

### 1. Add SDK Events URL Override

Current SDK source hardcodes production ingestion:

```ts
const EVENTS_URL = "https://events.usetally.xyz/v1/track";
```

Add an optional `eventsUrl` field to `init()`:

```ts
init({
  projectId: "proj_...",
  eventsUrl: process.env.NEXT_PUBLIC_TALLY_EVENTS_URL,
});
```

Source-of-truth rule: the SDK itself does **not** read env vars. Only `eventsUrl` (explicit config) is honored. The MCP-generated wrapper is the single layer responsible for reading `NEXT_PUBLIC_TALLY_EVENTS_URL` and passing it through. This keeps the SDK environment-agnostic and avoids two places diverging.

Behavior:

- Default remains `https://events.usetally.xyz/v1/track` when `eventsUrl` is absent or empty.
- Local self-test sets `NEXT_PUBLIC_TALLY_EVENTS_URL=http://localhost:3001/v1/track` in the target app environment; the wrapper passes it via `eventsUrl`.
- SDK tests verify default and override behavior.
- Bundle-size guardrail: measure `gzip -c packages/sdk/dist/index.js | wc -c` before and after; fail the task if the result is at or above 3072 bytes.
- Self-test dependency rule: the runner must test the current local SDK, not whatever package version is published. Build the SDK, create a local tarball or `file:` dependency from `packages/sdk`, and rewrite the target app dependency before `pnpm install`.

### 2. Add Local Event Fixture Sink

The events app currently receives `/v1/track` and forwards to Tinybird. For self-test, add an E2E-only local sink.

When `E2E_TEST_MODE=1` and `E2E_EVENTS_FIXTURE_SCENARIO=mcp-self-test`:

- Accept posted events through the normal `/v1/track` route.
- Append normalized events to `${E2E_ANALYTICS_FIXTURE_DIR}/mcp-self-test/events.jsonl` (one JSON object per line) to avoid read-modify-write races under concurrent POSTs.
- Truncate `events.jsonl` at runner startup so each run is deterministic.
- Keep production behavior unchanged; the sink branch must be a no-op when either env var is unset.

The runner should set `E2E_ANALYTICS_FIXTURE_DIR=tmp/mcp-self-test/fixtures` for both web and events services. This keeps generated fixture data out of repo-local `.e2e-fixtures/` and makes teardown safer. The dashboard already knows how to read local E2E fixture files before Tinybird when `E2E_TEST_MODE=1`; extend the reader to accept JSONL alongside existing JSON arrays, or keep parity by writing a sibling `events.json` snapshot at sink flush.

### 3. Add Test-Only MCP OAuth Bootstrap

For a fully autonomous local run, avoid requiring a human GitHub OAuth click during every self-test.

Add an E2E-only path in the OAuth authorize flow. All of the following gates must hold simultaneously, checked server-side at request time:

- `process.env.E2E_TEST_MODE === "1"`.
- `process.env.NODE_ENV !== "production"` (belt-and-suspenders against accidental prod enablement).
- Parsed request `Host` header hostname is exactly `localhost`, `127.0.0.1`, or `::1`. Do not perform DNS resolution. Ignore `x-forwarded-host` and other proxy-supplied host headers for this check.
- `process.env.E2E_MCP_AUTH_USER_ID` is set and matches a seeded E2E user.
- The bypass MUST NOT consult any request-supplied field to decide whether to enable itself.

Failure behavior:

- If `E2E_TEST_MODE` is unset, use normal interactive behavior.
- If `E2E_TEST_MODE=1` but any other gate fails, log a redacted reason and return 403 to make misconfiguration loud during development.
- If `NODE_ENV=production`, the bypass is always disabled and must not authorize.
- No gate failure should produce a 500.

This still exercises dynamic client registration, authorization-code issuance, PKCE, token exchange, access-token storage, and MCP bearer auth. It only replaces the human login step in local E2E.

Justification vs a static long-lived test token: a static token would still need the same gating to be safe, and would skip exercising the full PKCE/code-exchange path that real Codex clients take. Auto-authorize keeps the protocol surface under test.

Required tests:

- Route returns 404/403 when `E2E_TEST_MODE` is unset.
- Route returns 403 when `NODE_ENV=production` even with `E2E_TEST_MODE=1`.
- Route returns 403 when the `Host` header is non-localhost.
- Route accepts `localhost`, `127.0.0.1`, and `::1` hostnames and ignores `x-forwarded-host`.
- Route returns 403 when `E2E_MCP_AUTH_USER_ID` is unset.
- Route cannot be enabled via any request-supplied query/body/header value.
- Production-mode route test proves the bypass cannot authorize when `NODE_ENV=production`. Static bundle grep can be added as advisory evidence, but runtime behavior is authoritative.

### 4. Add Self-Test Runner

Add a script:

```bash
pnpm --filter web e2e:mcp-self-test
```

Runner responsibilities:

1. Preconditions:
   - Verify `pnpm install` has run (lockfile + `node_modules` present); run it if missing.
   - Verify local Postgres is reachable at `DATABASE_URL`; apply pending Drizzle migrations.
   - Verify ports 3000 and 3001 are free; fail fast with a clear message if either is in use (do not silently kill processes).
2. Create a temp workspace under `tmp/mcp-self-test/`. Assert the resolved absolute path is a descendant of the repo's `tmp/mcp-self-test/` before any destructive action.
3. Prepare a disposable Next.js target app:
   - Default: copy a local fixture (deterministic, offline).
   - Optional: with `--from-sandbox`, clone `fast-pr-analytics-sandbox/fpa-fixture-next-app-router`.
4. Start local services:
   - web/MCP app on `localhost:3000`
   - events app on `localhost:3001` with `E2E_TEST_MODE=1`, `E2E_EVENTS_FIXTURE_SCENARIO=mcp-self-test`, and `E2E_ANALYTICS_FIXTURE_DIR=tmp/mcp-self-test/fixtures`
5. Seed a Tally E2E user and export `E2E_MCP_AUTH_USER_ID`.
6. Configure Codex MCP:
   ```bash
   codex mcp remove tally-local || true
   codex mcp add tally-local --url http://localhost:3000/api/mcp
   codex mcp login tally-local --scopes mcp:install
   ```
7. Run Codex in the target app. The runner asserts `--cd` resolves inside `tmp/mcp-self-test/` before invoking:
   ```bash
   codex exec --cd tmp/mcp-self-test/target-app \
     --ask-for-approval never \
     --sandbox danger-full-access \
     "Use the tally-local MCP server to add Tally analytics to this Next.js app. Apply the returned patch, install dependencies, and run the build."
   ```
8. Verify target app:
   - `git diff` contains the Tally wrapper and entrypoint changes.
   - `package.json` includes `@tally-analytics/sdk`.
   - `@tally-analytics/sdk` resolves to the current local SDK tarball or `file:` dependency prepared by the runner, not a registry version.
   - Target app build passes.
9. Run target app with:
   ```bash
   NEXT_PUBLIC_TALLY_EVENTS_URL=http://localhost:3001/v1/track
   ```
10. Drive a browser visit using Playwright (the same driver used by existing `@scenario` tests). Navigate to `http://localhost:<target-port>/` and wait for `networkidle` so the page-view event is flushed.
11. Open the local Tally dashboard and assert:
    - Project exists with `source = mcp_codex`.
    - Waiting copy disappears after events arrive.
    - Live feed shows the emitted page view.
12. Emit a single structured summary on stdout — one JSON object with a `stages` array (`{ name, status, durationMs, error? }`) plus a top-level `ok` boolean — so a calling agent can parse pass/fail per stage without scraping logs.

Teardown (always runs, success or failure, via `trap`/`finally`):

- Stop web, events, and target-app processes.
- `codex mcp remove tally-local`.
- Remove all self-test database artifacts: seeded E2E user, sessions, OAuth clients/codes/access tokens/refresh tokens, MCP-created projects, regenerate requests, and any installation/token rows created by the run.
- Delete `tmp/mcp-self-test/` (guarded by the same path-prefix check).
- Truncate/remove `tmp/mcp-self-test/fixtures/mcp-self-test/events.jsonl`.

## Manual Work Required

To build the harness, no manual work should be required beyond normal local env availability.

To run it fully against the GitHub sandbox org (only with `--from-sandbox`), one-time setup may be required:

- The machine needs GitHub access to `fast-pr-analytics-sandbox`.
- If sandbox fixture repos are private, `gh` or git credentials must be available.
- Local Postgres must be running at the configured test URL.
- Dependencies must be installed.

No repeated manual browser OAuth should be required after the E2E-only OAuth bootstrap exists.

## Execution Phases

### Phase A: Make Runtime Telemetry Testable

- Add SDK `eventsUrl` override (config-only; no env reads inside SDK).
- Update MCP-generated wrappers to read `NEXT_PUBLIC_TALLY_EVENTS_URL` and pass it via `eventsUrl`.
- Add tests for default production URL and local override.
- Measure SDK bundle size before and after; fail if ≥ 3072 bytes gzipped.
- Add local SDK tarball or `file:` dependency support to the self-test runner so the target app exercises the current workspace SDK.
- Add E2E local fixture sink in the events app (JSONL under `E2E_ANALYTICS_FIXTURE_DIR`, truncate-on-start).
- Verify a direct browser visit can write local fixture events.

### Phase B: Make MCP Auth Self-Testable

- Add E2E-only OAuth auto-authorize path with all gates listed above.
- Add route tests for every negative case (E2E off, prod, non-localhost host, missing user id, request-supplied bypass attempt).
- Add a production-mode route test asserting the bypass is unreachable when `NODE_ENV=production`; make bundle grep optional/advisory.
- Add a small script/helper that runs `codex mcp add` and `codex mcp login`.

### Phase C: Add Target App Harness

- Add a local Next.js target fixture as the default source.
- Add optional `--from-sandbox` flag for `fast-pr-analytics-sandbox` clone.
- Add runner orchestration: preconditions, port checks, service startup, Codex CLI, Playwright browser drive, dashboard assertions, structured summary, teardown.

### Phase D: CI/Staging Optional Follow-Up

Defer until owner and trigger are defined. Tracked in `TODOS.md` rather than this plan. Drop from scope if unclaimed at Phase C completion.

## Acceptance Criteria

- `pnpm --filter web e2e:mcp-self-test` completes from a clean local checkout, including `pnpm install`, migrations, and seeding as runner-managed preconditions.
- The runner fails loudly if Codex cannot authenticate to the MCP server.
- The runner fails if Codex does not apply the MCP patch.
- The runner fails if the target app does not build.
- The runner fails if no event reaches the local event sink.
- The runner fails if the dashboard does not show the emitted event.
- The runner emits a structured JSON summary on stdout with per-stage status.
- Teardown runs on both success and failure paths; no orphan processes, temp dirs, fixture files, OAuth rows, MCP project rows, seeded users, or `codex mcp` registrations remain.
- SDK gzipped bundle size remains under 3072 bytes.
- Production defaults remain unchanged: SDK default URL, OAuth bypass route disabled, fixture sink branch a no-op when env gates are unset.
- A production-mode route test confirms the OAuth bypass branch is unreachable when `NODE_ENV=production`.
