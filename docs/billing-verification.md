# Billing Verification

This document describes the intended verification approach for Stripe billing.

The detailed future workstream is tracked in `features/stripe_billing_verification/FEATURE_BRIEF.md`. This document is the durable reference for what billing verification should prove.

## Goal

An AI coding agent should be able to verify Stripe billing end to end without using a human private account or relying on manual interpretation.

The billing flow under test is:

1. An authenticated free user starts checkout.
2. Stripe Checkout completes.
3. Tally reconciles the checkout session.
4. Stripe webhooks update local billing state.
5. The user sees the correct paid state.
6. Security regressions, duplicate subscriptions, and unsafe webhook behavior are caught.

## Current Verification Coverage

The repo has Vitest coverage for:

- checkout route behavior
- portal route behavior
- reconcile route behavior
- Stripe webhook handling
- price-to-plan mapping
- environment documentation
- settings page rendering
- pricing page rendering
- quota display behavior
- Stripe migration shape

Manual local smoke testing has also proven the current test-mode Stripe resources can complete hosted Checkout and return to `/settings`.

The agent-runnable harness is now available as `pnpm --filter web e2e:stripe-billing`. It has a deterministic local tier by default and an opt-in Stripe CLI/provider tier via `-- --provider=real`.

## Recommended Harness Tiers

The real-provider Stripe CLI tier is the main release-readiness proof. The deterministic tier is still the default because it is stable, local, and safe, but it should be treated as a regression safety net rather than proof that hosted billing truly works.

Implementation should prioritize the Stripe CLI path early: CLI/auth preflight, test-mode resource validation, local app startup, `stripe listen --forward-to`, hosted Checkout automation, provider event capture, redaction, DB correlation, and cleanup.

### Deterministic Tier

Default command:

```bash
pnpm --filter web e2e:stripe-billing
```

This tier should avoid hosted Stripe Checkout. It should seed disposable local users, exercise Tally-owned routes, generate signed webhook payloads locally, and assert database/UI state.

It should verify:

- invalid checkout plans are rejected
- free users can start checkout
- paid users cannot create duplicate subscriptions
- portal access requires a Stripe customer
- reconcile rejects another user's checkout session
- reconcile persists subscription state for the owning user
- webhook signatures are required
- subscription updates map known prices to plans
- unknown prices do not downgrade paid users
- subscription deletion downgrades to free
- payment failure marks subscription state as past due
- duplicate webhook events are ignored by event id
- out-of-order webhook delivery cannot corrupt billing state
- `invoice.paid` is explicitly covered, either as a safely ignored event or as a handled subscription-continuation signal

### Real Provider Smoke Tier

Explicit command:

```bash
pnpm --filter web e2e:stripe-billing -- --provider=real
```

This tier should use Stripe test mode, hosted Checkout, the Stripe CLI listener, Playwright, and a local database.

The implemented listener is intentionally filtered to billing-relevant events:

```text
checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed,invoice.paid
```

The harness records forwarded event response statuses and fails real-provider mode if any forwarded billing event receives a non-2xx response.

It should refuse to run against live-mode Stripe credentials or resources before creating or mutating anything. That includes `sk_live_`, `pk_live_`, live prices, live Checkout sessions, or live Billing Portal configuration.

It should verify:

- configured Pro and Team prices exist, are active, are test-mode resources, and have the expected recurring amount
- Billing Portal configuration exists, is active, and is test-mode
- browser reaches hosted Stripe Checkout
- test card payment returns to the local app
- `/settings` shows upgraded plan and billing status
- database contains customer, subscription, status, price, and period data
- retrying checkout as a paid user returns a management URL
- portal route returns a Stripe Billing Portal redirect
- webhook listener receives events without signature failures
- provider events can be correlated to the local run after redaction without depending on stale Stripe ids from previous runs
- test subscriptions created by the run are cleaned up or clearly reported

Stripe CLI-triggered events may be used for listener/signature plumbing, but they do not replace the hosted Checkout proof because triggered subscription payloads can contain generated fixture data that is not tied to the app-created Checkout session, customer, or subscription.

Stripe MCP is optional operator support for documentation lookup, provider-resource inspection, and cleanup triage. It should not be required by the default harness; if used, it must be test-mode-only and follow the same redaction and mutation guardrails as the real-provider tier.

## Evidence To Keep

The harness should write redacted artifacts to a temporary directory, such as:

```text
tmp/stripe-billing-verification/
```

Useful artifacts:

- `summary.json`
- local web app log
- Stripe listener log with secrets and provider ids redacted
- Playwright screenshots or traces on failure
- redacted database before/after state
- redacted provider event sequence for the real-provider smoke tier

No artifact should include raw `sk_`, `pk_`, `whsec_`, `cs_`, `cus_`, or `sub_` values.

## Repeatability

Each run should:

- use a unique test email
- create disposable local users
- avoid depending on previous checkout session ids
- stop local processes even after failure
- cancel or clean up provider-created test subscriptions where practical
- keep artifacts only on failure unless `--keep` is passed

## Open Decisions

- Whether provider-backed cancellation should be verified through Stripe API or the hosted Billing Portal UI.
- Whether this should remain a local/pre-launch agent command or become a CI job with secrets.

## Defaults

- Real-provider smoke mode tests Pro by default; Team can be added as an optional flag later.
- `invoice.paid` is verified as safely ignored unless implementation work shows the webhook model needs it.
- Stripe CLI is required for real-provider mode.
- Stripe MCP remains optional operator support, not a required harness dependency.
