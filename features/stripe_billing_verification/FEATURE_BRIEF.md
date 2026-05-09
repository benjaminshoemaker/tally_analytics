# Feature Brief: Stripe Billing Verification Harness

## Status

Initial harness implemented. `plans/PLAN_STATUS.md` is an orientation manifest, not a single-plan execution lock.

## Product Intent

Make Stripe billing verification repeatable for AI coding agents.

The goal is not just to have unit tests for Stripe routes. The goal is that an agent can run a command, exercise the real billing flow at the right level of realism, collect evidence, and decide whether billing still works.

## Flow Claim

An authenticated free user can upgrade through Stripe Checkout, return to Tally, have the local app reconcile and persist the subscription, receive and process Stripe webhooks correctly, and then access paid billing states without security regressions.

## Channels Under Test

- Browser UI: `/pricing`, Stripe-hosted Checkout, `/settings`.
- HTTP API: `/api/stripe/checkout`, `/api/stripe/reconcile`, `/api/stripe/portal`.
- Webhook/provider callback: `/api/webhooks/stripe`.
- Database-backed state: user plan, Stripe customer id, subscription id/status, price id, period end, cancellation fields, webhook event tracking.
- Stripe test-mode provider state for the real-provider smoke tier.

## What Exists Now

- Stripe API routes exist for checkout, portal, reconcile, and webhooks.
- Stripe unit/route tests cover checkout, portal, reconcile, webhook handling, settings, pricing, quota, env docs, and migration shape.
- Manual verification items are listed in `TODOS.md`.
- Local E2E login and seeded scenario infrastructure exist.
- A manual local smoke run has proven hosted Stripe Checkout can complete with current test resources.
- The agent-runnable billing harness exists at `apps/web/scripts/stripe-billing-harness.mjs` and is exposed as `pnpm --filter web e2e:stripe-billing`.

## Net-New Scope

Build an agent-runnable verification harness with two tiers:

1. Deterministic local billing verification.
2. Explicit real Stripe provider smoke verification.

The deterministic tier should be the default. The real provider tier should be opt-in because it depends on Stripe-hosted UI, network, test account state, and Stripe CLI behavior.

## Implementation Priority

The real-provider Stripe CLI tier is the highest-signal proof that billing truly works. The deterministic tier should provide a stable local safety net, but it must not become the only meaningful verification path.

Implementation should therefore build the harness around a shared runner that can support both tiers, then prioritize the Stripe CLI/test-mode path early:

- Stripe CLI availability and authentication preflight.
- Test-mode resource validation for prices and Billing Portal configuration.
- Local app startup with a known callback URL.
- `stripe listen --forward-to <local-app>/api/webhooks/stripe` lifecycle management.
- Hosted Checkout browser automation through Playwright.
- Provider event capture, redaction, and correlation to local DB state.
- Cleanup of provider-created test subscriptions/customers where practical.

The default command can still run deterministic checks only. The agent confidence signal for release readiness comes from the explicit real-provider command.

## Proposed Commands

Default deterministic verification:

```bash
pnpm --filter web e2e:stripe-billing
```

Real Stripe test-mode smoke:

```bash
pnpm --filter web e2e:stripe-billing -- --provider=real
```

Debug artifacts retained:

```bash
pnpm --filter web e2e:stripe-billing -- --provider=real --keep
```

## Stripe Tooling

Use the Stripe CLI as part of the formal harness. It is the right default tool for starting a local webhook listener, forwarding events to `/api/webhooks/stripe`, inspecting configured test-mode resources, and cleaning up test subscriptions created by a run.

The implemented real-provider smoke filters `stripe listen` to billing-relevant events and fails if any forwarded billing event receives a non-2xx response.

Stripe CLI-triggered events are useful for listener/signature plumbing, but they must not replace the hosted Checkout proof in the real-provider smoke tier. Triggered subscription events can contain generated fixture data that does not necessarily correlate to the actual Checkout session, customer, or subscription created by this app.

Stripe MCP can be useful as an optional agent/operator aid for documentation lookup, resource inspection, and cleanup triage. It should not be a required default dependency for the harness because availability depends on the agent client/session and because it can operate on provider resources. If used, prefer OAuth or narrowly scoped restricted keys, require test-mode-only checks, and keep any mutation behind an explicit real-provider mode.

## Deterministic Tier

This tier should run locally without completing hosted Stripe Checkout.

### Setup

- Start or reuse the local web app.
- Use a local database only.
- Seed disposable billing users.
- Use test-mode-looking Stripe ids, but do not require real provider state.
- Generate signed webhook payloads locally with the configured webhook secret.

### Driver

- Log in through `/api/auth/e2e-login`.
- Visit `/pricing` and `/settings` with Playwright where browser-visible state matters.
- Exercise `/api/stripe/checkout`, `/api/stripe/reconcile`, `/api/stripe/portal`, and `/api/webhooks/stripe`.
- Send signed webhook payloads for subscription update, deletion, payment failure, and unknown price ids.

### Assertions

- Logged-out pricing state does not imply paid checkout is available without login.
- Logged-in free users see checkout actions.
- Checkout route rejects invalid plans.
- Checkout route creates or reuses a Stripe customer shape.
- Paid users retrying checkout receive `409` and a management URL.
- Reconcile requires an authenticated user.
- Reconcile rejects another user's checkout session with `403`.
- Reconcile persists subscription fields for the owning user.
- Portal route rejects users without a Stripe customer.
- Portal route redirects paid users to billing management.
- Webhook route rejects missing or invalid signatures.
- Subscription update moves users to the mapped paid plan.
- Unknown price ids do not downgrade a user to `free`.
- Subscription deletion downgrades to `free`.
- Payment failure sets billing status to `past_due`.
- Duplicate webhook events are ignored by event id.
- Out-of-order webhook delivery does not corrupt billing state; the harness should verify this with business-relevant event sequences, not only by checking that older timestamps are skipped.
- `invoice.paid` is covered explicitly: either it is safely ignored without changing local billing state, or the implementation handles it as a subscription-continuation signal and the harness asserts the resulting state.
- Quota/upgrade UI reflects free vs paid state correctly.

## Real Provider Smoke Tier

This tier should use Stripe test mode and hosted Checkout.

### Setup

- Verify `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `STRIPE_WEBHOOK_SECRET` or Stripe CLI listener, and `STRIPE_BILLING_PORTAL_CONFIG_ID`.
- Refuse to run against live-mode credentials or resources. Real-provider mode must fail fast if any credential/resource indicates live mode, including `sk_live_`, `pk_live_`, live prices, live Checkout sessions, or live Billing Portal configuration.
- Verify the configured Pro and Team prices exist, are active, are test-mode resources, and have the expected recurring amount.
- Verify the Billing Portal configuration exists, is active, and belongs to test mode.
- Start a local web app on a known port with a local database.
- Start `stripe listen --forward-to <local-app>/api/webhooks/stripe` and capture the generated webhook secret without printing it.
- Seed a disposable local user.

### Driver

- Log in through `/api/auth/e2e-login`.
- Open `/pricing`.
- Start Pro checkout.
- Complete Stripe-hosted Checkout with a Stripe test card.
- Return to `/settings?success=true`.
- Let the reconcile client update local state.
- Confirm webhook state is also processed.
- Retry checkout as the now-paid user.
- Create a Billing Portal session.
- Exercise at least one provider-backed cancellation/update path when practical.
- Use `stripe trigger` only for secondary listener or signature checks; it does not satisfy the hosted Checkout success criterion.

### Assertions

- Browser reaches Stripe Checkout.
- Checkout completion returns to the configured local app URL.
- `/settings` shows the upgraded plan and billing status.
- Database contains a Stripe customer id, subscription id, active status, expected price id, and period data.
- Retry checkout returns `409` and a Billing Portal URL.
- Portal route returns a Stripe Billing Portal redirect.
- Stripe listener logs show webhook delivery without signature failures.
- The provider event sequence can be correlated to the local run after redaction without depending on stale `cs_`, `cus_`, or `sub_` ids from previous runs.
- Cleanup cancels or deletes test subscriptions created by the run.

## Evidence

The harness should produce a redacted run summary under a temp artifact directory, for example:

```text
tmp/stripe-billing-verification/
```

Useful artifacts:

- `summary.json`
- local app log
- Stripe listener log with `whsec_`, `sk_`, `pk_`, `cus_`, `sub_`, and `cs_` values redacted
- Playwright screenshots or trace on failure
- redacted DB state before and after
- Stripe resource ids redacted or truncated for correlation
- redacted provider event sequence for the real-provider smoke tier

## Teardown And Rerun

- Stop local web server and Stripe listener even after failure.
- Cancel/delete real Stripe test subscriptions created by the real-provider tier.
- Reset or delete disposable local users.
- Use unique emails per run to avoid stale customer/subscription state.
- Keep artifacts only on failure unless `--keep` is passed.
- Reruns must not depend on previous Stripe sessions, checkout ids, or seeded DB rows.

## Out Of Scope

- Production Stripe verification.
- Testing live cards or live payments.
- Running against live-mode Stripe credentials or live-mode provider resources.
- Human private Stripe account actions outside configured test-mode credentials.
- Making hosted Stripe Checkout part of every CI run.
- Reworking pricing/product packaging.

## Initial Acceptance Criteria

- Default command runs without opening hosted Stripe Checkout.
- Default command gives a clear pass/fail result with redacted evidence.
- Real-provider command completes Stripe test Checkout end to end.
- Real-provider command refuses live-mode credentials and resources before creating or mutating anything.
- Real-provider command cleans up provider/local state or clearly reports what must be cleaned manually.
- No secrets are printed to console output or committed artifacts.
- The harness can be torn down and recreated repeatedly by an AI coding agent.

## Dependencies

- Existing Stripe API routes and webhook handler.
- Existing E2E login support.
- Local Postgres availability for seeded users.
- Stripe CLI for the real-provider tier.
- Optional Stripe MCP access for agent-assisted documentation/resource inspection and cleanup triage.
- Current Stripe test-mode prices and Billing Portal configuration.

## Defaults

- Real-provider smoke mode should test Pro by default; Team can be added as an optional flag later.
- `invoice.paid` should be verified as safely ignored for now unless implementation work shows the current webhook model needs it.
- Stripe CLI is required for real-provider mode.
- Stripe MCP remains optional operator support, not a required harness dependency.

## Open Questions

- Should provider-backed cancellation be automated through Stripe API or verified through the hosted Billing Portal UI?
- Should the harness create fresh Stripe products/prices in test mode, or validate and reuse the configured account-level prices?
- Should this become a CI job with secrets, or remain a local/pre-launch agent command?
