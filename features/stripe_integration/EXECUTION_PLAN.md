# Execution Plan: Stripe Payments Integration (v2)

## Overview

| Metric | Value |
|--------|-------|
| Feature | Stripe Billing (Pro $9/mo, Team $29/mo) |
| Target Project | Tally Analytics (apps/web) |
| Total Phases | 4 |
| Total Steps | 11 (adds reconciliation step) |

---

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/web/lib/db/schema.ts` | extends | Add `stripeSubscriptionId` + optional subscription status fields + webhook dedupe fields |
| `apps/web/lib/db/client.ts` | uses | User updates from checkout + webhook + reconcile |
| `apps/web/lib/auth/cookies.ts` | uses | Session authentication |
| `apps/web/app/api/stripe/checkout/route.ts` | adds | Create Checkout Session with `{CHECKOUT_SESSION_ID}` in success URL and “prevent multi-sub” checks |
| `apps/web/app/api/stripe/portal/route.ts` | adds | Create Billing Portal session (optionally pinned to a Stripe Portal configuration) |
| `apps/web/app/api/stripe/reconcile/route.ts` | adds | Reconcile the user’s subscription immediately after redirect if webhook has not landed |
| `apps/web/app/api/webhooks/stripe/route.ts` | adds | Webhook handler with dedupe + safer mapping behavior |
| `apps/web/app/(dashboard)/settings/page.tsx` | modifies | Adds manage/upgrade UI and client-side reconcile on success redirect |
| `apps/web/components/marketing/pricing-card.tsx` | modifies | Add upgrade action wiring |
| `apps/web/components/dashboard/quota-display.tsx` | modifies | Show upgrade CTA only when `userPlan === "free"` and require `userPlan` prop |
| `apps/web/.env.example` | modifies | Add Stripe env vars (+ optional Portal config id) |

---

## Phase dependency graph

Phase 1 → Phase 2 → Phase 3 → Phase 4

---

# Phase 1: Foundation & Setup

**Goal:** Stripe dashboard setup, env vars, DB schema, Stripe client utilities.

## Phase 1 Pre-work (Stripe Dashboard)

Human must complete before coding:

1) Products and prices
- [x] Create product "Tally Analytics"
- [x] Create recurring price "Pro" ($9/mo). Copy its price id.
- [x] Create recurring price "Team" ($29/mo). Copy its price id.

2) Billing Portal configuration (required for correct cancel/downgrade timing)
- [x] Create a **Billing Portal configuration** that:
  - [x] Allows plan switching between Pro and Team
  - [x] Sets proration behavior to match desired UX (immediate upgrade, prorated)
  - [x] For downgrades: applies change at period end (if that is the intended behavior)
  - [x] For cancellations: "cancel at period end" (not immediate)
- [x] Copy the Billing Portal configuration id (optional, but recommended to pin via API).

3) Webhook endpoint
- [x] Create webhook endpoint pointing to: `https://usetally.xyz/api/webhooks/stripe` (use a tunnel for local testing)
- [x] Enable at least:
  - [x] `checkout.session.completed`
  - [x] `customer.subscription.created` (optional but useful)
  - [x] `customer.subscription.updated`
  - [x] `customer.subscription.deleted`
  - [x] `invoice.payment_failed` (recommended for status UX)
- [x] Copy the webhook signing secret.

---

## Step 1.1: Dependencies & Environment configuration

**Files to modify**
- `apps/web/.env.example`

**Add env vars**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional until you embed Stripe.js; safe to include now)
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_TEAM`
- `STRIPE_BILLING_PORTAL_CONFIG_ID` (recommended)
- `NEXT_PUBLIC_APP_URL` (or ensure existing app URL env is used consistently)

**Acceptance criteria**
- [x] `.env.example` contains all required Stripe variables with comments.
- [x] App reads the same "app url" consistently for success/cancel/return URLs.

---

## Step 1.2: Database migration

**Goal:** Store subscription linkage and optionally enough state to drive UI safely.

**Files to create**
- `apps/web/drizzle/migrations/0002_stripe_billing.sql`

**Migration (minimum required)**
```sql
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
CREATE INDEX idx_users_stripe_subscription_id ON users(stripe_subscription_id);
```

**Recommended additional fields (for correctness and UI)**
```sql
ALTER TABLE users
  ADD COLUMN stripe_subscription_status VARCHAR(32),
  ADD COLUMN stripe_price_id VARCHAR(255),
  ADD COLUMN stripe_current_period_end TIMESTAMPTZ,
  ADD COLUMN stripe_cancel_at_period_end BOOLEAN,
  ADD COLUMN stripe_last_webhook_event_id VARCHAR(255),
  ADD COLUMN stripe_last_webhook_event_created BIGINT;
```

**Notes**
- `stripe_last_webhook_event_*` enables a simple “ignore older events” strategy if you choose to implement it.
- If you do not want extra columns now, you can skip them and instead always fetch current subscription state from Stripe in webhook processing. That still needs `stripe_subscription_id` at minimum.

**Files to modify**
- `apps/web/lib/db/schema.ts` to add the new columns and indexes (and update the plan check only if you introduce additional plan values, which you should not).

**Acceptance criteria**
- [x] Migration runs successfully.
- [x] Drizzle schema matches DB columns.

---

## Step 1.3: Stripe client + constants

**Files to create**
- `apps/web/lib/stripe/client.ts` (or similar)
- `apps/web/lib/stripe/constants.ts`
- `apps/web/lib/stripe/plans.ts` (optional helper module)

**Acceptance criteria**
- [x] Stripe client uses the pinned API version.
- [x] Constants map plans → price IDs and price IDs → plans.
- [x] Price ID mapping failure does not silently downgrade users to free (details in webhook step).

---

## Phase 1 checkpoint

- [x] Stripe products, prices, portal config, and webhook endpoint exist (test mode).
- [x] Env vars added and load in dev.
- [x] DB migration applied.
- [x] Stripe client utilities compile.

---

# Phase 2: API routes

## Step 2.1: Checkout session route

**Route**
- `POST /api/stripe/checkout` at `apps/web/app/api/stripe/checkout/route.ts`

**Core behavior**
1) Authenticate user session.
2) Validate requested plan.
3) Ensure Stripe customer exists for user (create if missing).
4) **Prevent multi-subscription:**
   - If `user.stripeCustomerId` exists, query Stripe for subscriptions with status in `["active","trialing","past_due","unpaid"]`.
   - If an active subscription exists:
     - Return 409 with message “Subscription already exists” and optionally a `manageUrl` to Billing Portal (preferred UX), or
     - Redirect directly to Billing Portal (if you prefer server-driven).
5) Create Checkout Session:
   - `mode: "subscription"`
   - `line_items: [{ price: PRICE_IDS[plan], quantity: 1 }]`
   - `subscription_data.metadata.userId = user.id` and `subscription_data.metadata.plan = plan`
   - **Success URL must include Checkout Session ID:**
     - `success_url: ${appUrl}/settings?success=true&checkout_session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: ${appUrl}/settings`

**Acceptance criteria**
- [x] Returns 401 if unauthenticated.
- [x] Returns 400 for invalid plan.
- [x] Returns 409 (or redirects to portal) if an active subscription already exists.
- [x] Success URL includes `checkout_session_id={CHECKOUT_SESSION_ID}`.
- [x] Subscription metadata contains `userId` (used for reconciliation and/or webhook fallback).
- [x] Checkout Session creation errors are handled with safe messages (no key leakage).

---

## Step 2.2: Billing portal route

**Route**
- `POST /api/stripe/portal` at `apps/web/app/api/stripe/portal/route.ts`

**Core behavior**
- Authenticate user.
- Ensure Stripe customer id exists.
- Create portal session:
  - `return_url: ${appUrl}/settings`
  - If `STRIPE_BILLING_PORTAL_CONFIG_ID` is set, pass `configuration: <id>` so behavior matches the lifecycle table.

**Acceptance criteria**
- [x] 401 if unauthenticated.
- [x] 400 if user has no Stripe customer.
- [x] Redirects to portal URL.

---

## Step 2.3: Reconciliation route (new)

**Why this exists**
Webhooks are async and not guaranteed to land before the user returns from Checkout. This route makes “plan updates immediately” reliable.

**Route**
- `POST /api/stripe/reconcile` at `apps/web/app/api/stripe/reconcile/route.ts`

**Input**
- `checkout_session_id` (from Settings page query param)

**Core behavior**
1) Authenticate user.
2) Fetch Checkout Session from Stripe using `checkout_session_id` with expansions:
   - `expand: ["subscription", "customer"]`
3) Verify that the session belongs to the authenticated user:
   - Prefer: compare `session.customer` to `user.stripeCustomerId` (must match)
   - Fallback: verify `session.subscription.metadata.userId === user.id` (if available)
4) If session has a subscription, update DB:
   - Set `stripeSubscriptionId`
   - Set `plan` based on the subscription’s active price id
   - Optionally set status fields (status, period end, cancel_at_period_end, price id)

**Acceptance criteria**
- [x] 401 if unauthenticated.
- [x] 400 if missing/invalid session id.
- [x] 403 if session does not belong to user.
- [x] Returns JSON including updated `plan` and `stripeSubscriptionId`.

---

## Step 2.4: Webhook handler (updated)

**Route**
- `POST /api/webhooks/stripe` at `apps/web/app/api/webhooks/stripe/route.ts`

**Dedupe and ordering strategy (pick one)**
A) Minimal, safe enough for MVP
- Treat updates as idempotent DB writes only.
- Always fetch current subscription state from Stripe before writing user plan.

B) Stronger (recommended)
- Store `stripe_last_webhook_event_id` and `stripe_last_webhook_event_created` in users.
- Ignore exact duplicates by event id.
- Ignore older events by created timestamp per user/subscription.

**Plan mapping behavior (important)**
- If the price id is unknown (not in PRICE_TO_PLAN):
  - Do **not** set plan to “free”.
  - Log an error.
  - Keep the current DB plan (and optionally store `stripe_price_id` and status for debugging).

**Events**
- `checkout.session.completed`
  - Update user’s `stripeSubscriptionId` if present.
  - Optionally set plan, but treat this as “best effort” because subscription updates may arrive separately.
- `customer.subscription.updated`
  - Fetch subscription (if using strategy A) and write:
    - `plan` (if mapped)
    - `stripeSubscriptionId`
    - optional status fields
- `customer.subscription.deleted`
  - Set plan to `free` only if you can confirm subscription is canceled/unpaid for that customer.
- `invoice.payment_failed` (recommended)
  - Update `stripe_subscription_status` to `past_due` (or similar) and surface UX later.

**Acceptance criteria**
- [x] Verifies Stripe signature with `STRIPE_WEBHOOK_SECRET`.
- [x] Returns 400 on missing/invalid signature.
- [x] Safe under duplicate delivery and out-of-order delivery.
- [x] Unknown price id never silently downgrades to free.
- [x] Logs enough context to debug (event id, customer id, subscription id, price id).

---

## Phase 2 checkpoint

- [x] Checkout route works end-to-end in test mode.
- [x] Portal route works and returns to settings.
- [x] Reconcile route updates plan correctly on redirect even if webhook is delayed.
- [x] Webhook handler updates DB safely.

---

# Phase 3: UI integration

## Step 3.1: Settings page subscription UI (updated)

**Goal**
- Provide a single place to manage billing, and make the post-checkout experience correct.

**Implementation notes**
- Settings is currently a server component. Add a small client component inside it for:
  - Reading `checkout_session_id` from search params
  - Calling `/api/stripe/reconcile` on mount when `success=true`
  - Displaying success state only after DB is updated (or after reconcile returns)
  - Optional short polling if reconcile returns “pending” (not required if reconcile directly updates)

**Acceptance criteria**
- [x] If `success=true&checkout_session_id=...` is present:
  - [x] Calls reconcile once.
  - [x] Shows success banner based on the returned plan or refreshed DB plan (not just query params).
- [x] Shows current plan and (if implemented) billing status.
- [x] "Manage billing" button posts to `/api/stripe/portal`.

---

## Step 3.2: Pricing page integration

**Acceptance criteria**
- [x] "Upgrade" buttons post to `/api/stripe/checkout` with the correct plan.
- [x] If the user is already paid, buttons direct to Billing Portal (or are disabled with "Manage billing").

---

## Step 3.3: Quota display integration (updated)

**Goal**
Avoid showing paid users an “Upgrade” CTA due to missing plan wiring.

**Implementation**
- Update `QuotaDisplay` signature to accept `userPlan: "free" | "pro" | "team"`.
- Only show upgrade CTA when `userPlan === "free"`.

**Acceptance criteria**
- [x] QuotaDisplay receives `userPlan` from a real data source (server render or API).
- [x] No defaulting to "free" for paid users.

---

## Phase 3 checkpoint

- [x] Success redirect reliably results in a plan update visible in Settings without waiting on webhook timing.
- [x] Paid users never see "Upgrade" in QuotaDisplay due to missing props.
- [x] Portal management works from Settings.

---

# Phase 4: Testing & verification

## Step 4.1: Local webhook testing (Stripe CLI)

**Acceptance criteria**
- [x] Use Stripe CLI to forward webhooks:
  - `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
- [x] Test flows:
  - [x] Free → Pro checkout, return, reconcile updates plan
  - [x] Pro → Team upgrade (proration behavior matches portal config)
  - [x] Cancel at period end (portal config matches desired timing)
  - [x] Duplicate event delivery does not break state

---

## Step 4.2: Automated tests (minimum set)

- [x] Unit test: plan mapping for known price ids and unknown price ids.
- [x] Unit test: reconcile route refuses session belonging to another customer/user.
- [x] Integration test: checkout route prevents multi-sub (mock Stripe).

---

## Step 4.3: Error handling and observability

- [x] Log webhook event id, type, customer id, subscription id, and price id.
- [x] Add a basic "billing status" surface in Settings if you store status fields (recommended).
- [x] Document manual recovery steps:
  - [x] If DB drifts: run reconcile with a known checkout session id or fetch subscription by customer id and update user row.

---

# Rollback plan

- Remove/disable billing UI.
- Keep webhook route but no-op (or disable endpoint in Stripe dashboard) to stop writes.
- If you added DB columns, leave them unused; do not drop in rollback.

---

# Post-launch monitoring

Track:
- Webhook error rate and signature verification failures.
- Reconcile route usage (should be common immediately after checkout).
- Rate of “unknown price id” logs (should be zero; indicates config drift).
