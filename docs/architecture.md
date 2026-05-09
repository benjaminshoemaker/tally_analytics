# Architecture

This document is a high-level technical overview of Tally Analytics. It is intended to orient agents and developers before they inspect implementation files.

## System Overview

Tally Analytics has four main surfaces:

1. Web dashboard and marketing app.
2. Event ingestion service.
3. Client SDK.
4. MCP server for coding-agent integration.

The current strategic direction is MCP-first onboarding: coding agents integrate Tally into user apps, while the Tally website provides account, dashboard, billing, and project control-plane surfaces.

## Repository Layout

```text
apps/
  web/        Web dashboard, marketing site, auth, billing, MCP route
  events/     Event ingestion service
packages/
  sdk/        Client SDK published as @tally-analytics/sdk
tinybird/     Analytics data pipeline
docs/         Durable product, architecture, and verification docs
features/     Active and future feature specs/briefs
plans/        Workstream status and archived plans
```

## Web App

`apps/web` is a Next.js app. It owns:

- marketing pages
- dashboard pages
- GitHub-backed human login
- Tally OAuth endpoints for MCP clients
- hosted MCP route
- project APIs
- Stripe billing routes and webhooks
- Drizzle schema and database queries

Important route groups:

- `apps/web/app/(marketing)/`
- `apps/web/app/(dashboard)/`
- `apps/web/app/api/mcp/route.ts`
- `apps/web/app/api/oauth/*`
- `apps/web/app/api/stripe/*`
- `apps/web/app/api/webhooks/*`

## Event Ingestion

`apps/events` accepts SDK event payloads and validates that the referenced project is active before ingesting analytics data.

MCP-created projects must be active immediately so first deployed events are accepted after the user installs and deploys Tally.

## SDK

`packages/sdk` provides the app-side tracking runtime.

The MCP install flow should generate a small wrapper around SDK exports instead of copying a separate tracker implementation into user apps. The SDK has a strict bundle-size constraint documented in `AGENTS.md`.

## MCP Integration

The MCP server is hosted by `apps/web`.

The MCP install flow:

1. Client discovers the MCP endpoint.
2. Client completes Tally OAuth.
3. Agent supplies minimal repo context.
4. Tally validates the request.
5. Tally creates or reuses a project.
6. Tally returns a unified diff patch bundle, install command, dashboard URL, and verification checklist.
7. Agent applies the patch locally.

The MCP server should not receive arbitrary source trees, secrets, lockfiles, or environment files.

## Authentication

Human Tally login is currently backed by GitHub OAuth.

MCP OAuth is a separate protocol layer where Codex or another MCP client acts as an OAuth client and Tally acts as the authorization server. MCP OAuth should create or link a Tally account and only create projects after authentication succeeds.

## Data Stores

Postgres stores:

- users
- sessions
- projects
- GitHub integration data
- MCP OAuth clients/tokens/codes
- Stripe customer/subscription state
- future pending analytics tasks

Tinybird stores and queries analytics event data.

Local E2E fixtures can stand in for Tinybird when `E2E_TEST_MODE=1`.

## Billing

Stripe owns hosted checkout and billing management. Tally owns local subscription state derived from checkout reconciliation and Stripe webhooks.

Key routes:

- `/api/stripe/checkout`
- `/api/stripe/reconcile`
- `/api/stripe/portal`
- `/api/webhooks/stripe`

Billing verification guidance lives in `docs/billing-verification.md`.

## Optional GitHub App

The GitHub App is no longer the desired first-run path. It remains useful for optional hosted PR automation:

- remote repo inspection
- opening PRs
- webhook-driven updates
- dashboard-triggered changes without returning to a local coding agent

Core MCP-first onboarding should not require GitHub App installation.

## Testing And Verification

Agent-readable local testing guidance lives in `docs/agent-testing.md`.

The MCP self-test harness under `apps/web/scripts/mcp-self-test.mjs` verifies a full local MCP install loop against a disposable Next.js app.

Stripe billing verification is being separated into a dedicated harness plan under `features/stripe_billing_verification/`.
