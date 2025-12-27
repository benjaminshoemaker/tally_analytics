# Security Notes (MVP)

This repo is an MVP and should be treated accordingly. Before production launch, review these areas and keep this document up to date.

## Authentication

- Magic links are single-use and expire (see `apps/web/app/api/auth/verify/route.ts`).
- Sessions are stored server-side in Postgres; the browser receives an HTTP-only session cookie (`apps/web/lib/auth/session.ts`).
- Session cookies are `Secure` when `NEXT_PUBLIC_APP_URL` is HTTPS (`apps/web/lib/auth/cookies.ts`).

### E2E Test Mode

For Playwright E2E tests, `/api/auth/magic-link` can return a `loginUrl` instead of sending email when:

- `E2E_TEST_MODE=1`
- `NODE_ENV !== "production"`

Do not enable `E2E_TEST_MODE` in production.

## GitHub Webhooks

- Webhook payload signatures are verified using `GITHUB_WEBHOOK_SECRET` (`apps/web/app/api/webhooks/github/route.ts`, `apps/web/lib/github/webhook-verify.ts`).

## SQL Injection

- Postgres queries use Drizzle query builders (parameterized) throughout `apps/web`.
- Tinybird queries currently build SQL strings; user-controlled values are escaped or constrained before interpolation (e.g. project IDs are quoted/escaped, limits are clamped) in `apps/web/app/api/projects/[id]/analytics/*/route.ts`.

## Secrets

- Store secrets in environment variables (local: `apps/web/.env.local`, production: Vercel env vars).
- Do not commit secrets (`.env.local` and `*.pem` are ignored by `.gitignore`).

