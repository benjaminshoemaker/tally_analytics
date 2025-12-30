# Execution Plan: Stripe Payments Integration

## Overview

| Metric | Value |
|--------|-------|
| Feature | Stripe Billing (Pro $9/mo, Team $29/mo) |
| Target Project | Tally Analytics (apps/web) |
| Total Phases | 4 |
| Total Steps | 10 |
| Total Tasks | 19 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/web/lib/db/schema.ts` | extends | Add stripe_subscription_id column |
| `apps/web/lib/db/client.ts` | uses | Database queries for user updates |
| `apps/web/lib/auth/cookies.ts` | uses | Session authentication |
| `apps/web/app/api/` | extends | Add stripe checkout, portal, webhook routes |
| `apps/web/app/(dashboard)/settings/page.tsx` | modifies | Add subscription management UI |
| `apps/web/components/marketing/pricing-card.tsx` | modifies | Add form action support |
| `apps/web/.env.example` | modifies | Add Stripe env vars |

## Phase Dependency Graph

```
┌─────────────────────────────────────────┐
│ Phase 1: Foundation & Setup             │
│ (Dependencies, Migration, Config)       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ Phase 2: API Routes                     │
│ (Checkout, Portal, Webhooks)            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ Phase 3: UI Integration                 │
│ (Settings, Pricing, Components)         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ Phase 4: Testing & Verification         │
│ (Unit Tests, E2E, Manual QA)            │
└─────────────────────────────────────────┘
```

---

## Phase 1: Foundation & Setup

**Goal:** Establish all prerequisites: dependencies, database schema, configuration, and Stripe client setup  
**Depends On:** None

### Pre-Phase Setup

Human must complete before starting:

- [ ] Create Stripe account at https://dashboard.stripe.com
- [ ] Create Product "Tally Analytics" in Stripe Dashboard
- [ ] Create Price "Pro" - $9/month recurring (copy price ID)
- [ ] Create Price "Team" - $29/month recurring (copy price ID)
- [ ] Get API keys from Developers → API keys (test mode)
- [ ] Create webhook endpoint in Developers → Webhooks:
  - Endpoint: `https://usetally.xyz/api/webhooks/stripe` (use local tunnel for dev)
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Copy webhook signing secret

### Step 1.1: Dependencies & Environment Configuration

**Depends On:** None

---

#### Task 1.1.A: Install Stripe SDK

**Description:**  
Add the Stripe Node.js SDK to the web app. This is the only external dependency needed since we're using Stripe's hosted checkout (no client-side Stripe.js required).

**Acceptance Criteria:**
- [ ] `stripe` package is added to `apps/web/package.json`
- [ ] Package is installed and `pnpm-lock.yaml` is updated
- [ ] Running `pnpm build` in apps/web completes without dependency errors

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/package.json` — add stripe dependency

**Existing Code to Reference:**
- `apps/web/package.json` — follow existing dependency patterns

**Dependencies:** None

**Spec Reference:** Technical Spec > Dependencies

**Requires Browser Verification:** No

---

#### Task 1.1.B: Add Environment Variable Configuration

**Description:**  
Add all required Stripe environment variables to the example env file and document required setup. This ensures developers know what values need to be configured.

**Acceptance Criteria:**
- [ ] `.env.example` contains STRIPE_SECRET_KEY placeholder
- [ ] `.env.example` contains STRIPE_WEBHOOK_SECRET placeholder
- [ ] `.env.example` contains NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY placeholder
- [ ] `.env.example` contains STRIPE_PRICE_PRO placeholder
- [ ] `.env.example` contains STRIPE_PRICE_TEAM placeholder
- [ ] Comments explain each variable's purpose

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/.env.example` — add Stripe environment variables section

**Existing Code to Reference:**
- `apps/web/.env.example` — follow existing variable documentation patterns

**Dependencies:** None

**Spec Reference:** Technical Spec > Environment Variables

**Requires Browser Verification:** No

---

### Step 1.2: Database Migration

**Depends On:** Step 1.1

---

#### Task 1.2.A: Create Database Migration

**Description:**  
Create a SQL migration to add the `stripe_subscription_id` column to the users table. This stores the active subscription ID for managing upgrades/downgrades via the billing portal.

**Acceptance Criteria:**
- [ ] Migration file follows existing naming convention (sequential number prefix)
- [ ] Migration adds `stripe_subscription_id` VARCHAR(255) column to users table
- [ ] Migration creates index on `stripe_subscription_id` for efficient lookups
- [ ] Migration can be run successfully with `pnpm drizzle-kit push` or equivalent
- [ ] Migration is reversible (DROP COLUMN syntax documented)

**Files to Create:**
- `apps/web/drizzle/migrations/0002_stripe_subscription.sql` — migration file

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/drizzle/migrations/` — follow existing migration patterns
- `apps/web/drizzle.config.ts` — understand migration configuration

**Dependencies:** None

**Spec Reference:** Technical Spec > Database Migration > Migration File

**Requires Browser Verification:** No

---

#### Task 1.2.B: Update Schema Types

**Description:**  
Update the Drizzle schema to include the new `stripe_subscription_id` column. This ensures TypeScript types are correct when querying/updating user records.

**Acceptance Criteria:**
- [ ] `stripeSubscriptionId` column added to users table definition
- [ ] Column is VARCHAR(255) and nullable
- [ ] TypeScript types compile without errors
- [ ] Existing queries using the users table continue to work

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/db/schema.ts` — add stripeSubscriptionId column

**Existing Code to Reference:**
- `apps/web/lib/db/schema.ts` — follow existing column definition patterns

**Dependencies:** Task 1.2.A (migration should exist first)

**Spec Reference:** Technical Spec > Database Migration > Schema Update

**Requires Browser Verification:** No

---

### Step 1.3: Stripe Client Setup

**Depends On:** Step 1.1

---

#### Task 1.3.A: Create Stripe Client Utility

**Description:**  
Create a shared Stripe client instance that can be imported by API routes. This centralizes the Stripe configuration and API version.

**Acceptance Criteria:**
- [ ] Stripe client is instantiated with correct API version (2024-11-20.acacia)
- [ ] Client uses STRIPE_SECRET_KEY from environment
- [ ] File exports a typed Stripe instance
- [ ] TypeScript compilation passes

**Files to Create:**
- `apps/web/lib/stripe/client.ts` — Stripe client singleton

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/db/client.ts` — follow similar client initialization pattern

**Dependencies:** Task 1.1.A (Stripe SDK installed)

**Spec Reference:** Technical Spec > API Routes (client instantiation pattern)

**Requires Browser Verification:** No

---

#### Task 1.3.B: Create Stripe Constants

**Description:**  
Create a constants file for Stripe-related values like price ID mappings and plan hierarchy. This centralizes configuration that multiple files need.

**Acceptance Criteria:**
- [ ] PRICE_IDS object maps 'pro' and 'team' to environment variables
- [ ] PLAN_HIERARCHY object defines numeric ordering (free: 0, pro: 1, team: 2)
- [ ] PLAN_LIMITS object defines event quotas per plan (free: 10_000, pro: 100_000, team: 1_000_000)
- [ ] PLAN_PROJECTS object defines project limits per plan (free: 3, pro: 10, team: Infinity)
- [ ] Values are type-safe with explicit types
- [ ] Environment variables throw helpful errors if missing

**Files to Create:**
- `apps/web/lib/stripe/constants.ts` — Stripe configuration constants

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/` — follow existing constant/config patterns

**Dependencies:** Task 1.1.B (env vars documented)

**Spec Reference:** Technical Spec > API Routes (PRICE_IDS, planHierarchy)

**Requires Browser Verification:** No

---

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] All existing tests pass
- [ ] TypeScript compilation passes (`pnpm tsc --noEmit`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build completes (`pnpm build`)

**Regression Verification:**
- [ ] Existing user authentication still works
- [ ] Existing database queries function correctly
- [ ] Application starts without errors

**Manual Verification:**
- [ ] Database migration runs successfully
- [ ] New `stripe_subscription_id` column exists in users table
- [ ] Environment variables are documented in `.env.example`
- [ ] Stripe client imports without errors

**Browser Verification:** N/A (no UI changes)

---

## Phase 2: API Routes

**Goal:** Implement all server-side Stripe integration: checkout session creation, billing portal access, and webhook handling  
**Depends On:** Phase 1

### Pre-Phase Setup

Human must complete before starting:

- [ ] Set actual Stripe environment variables in `.env.local`
- [ ] Install Stripe CLI for local webhook testing: https://stripe.com/docs/stripe-cli
- [ ] Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Copy the CLI webhook secret to STRIPE_WEBHOOK_SECRET

### Step 2.1: Checkout Session Route

**Depends On:** Phase 1 complete

---

#### Task 2.1.A: Implement Checkout Route

**Description:**  
Create the POST /api/stripe/checkout endpoint that creates a Stripe Checkout session and redirects the user. This handles the upgrade flow from free to paid plans.

**Acceptance Criteria:**
- [ ] Route validates session authentication (returns 401 if unauthenticated)
- [ ] Route validates plan parameter (returns 400 if invalid or missing)
- [ ] Route prevents checkout for current or lower plan (returns 400 with helpful message)
- [ ] Route creates Stripe customer if user doesn't have one
- [ ] Route saves new stripeCustomerId to database
- [ ] Route creates checkout session with correct price ID
- [ ] Route redirects to Stripe checkout URL (303 status)
- [ ] Checkout session includes userId in subscription metadata

**Files to Create:**
- `apps/web/app/api/stripe/checkout/route.ts` — checkout API route

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/app/api/` — follow existing route handler patterns
- `apps/web/lib/auth/cookies.ts` — session cookie handling
- `apps/web/lib/db/schema.ts` — user schema for queries

**Dependencies:** Task 1.3.A, Task 1.3.B (Stripe client and constants)

**Spec Reference:** Technical Spec > API Routes > POST /api/stripe/checkout

**Requires Browser Verification:** No (API-only, but will test in Phase 3)

---

### Step 2.2: Billing Portal Route

**Depends On:** Step 2.1

---

#### Task 2.2.A: Implement Portal Route

**Description:**  
Create the POST /api/stripe/portal endpoint that generates a Stripe Billing Portal session. This allows users to manage their existing subscription (upgrade, downgrade, cancel, update payment method).

**Acceptance Criteria:**
- [ ] Route validates session authentication (returns 401 if unauthenticated)
- [ ] Route returns 400 if user has no stripeCustomerId
- [ ] Route creates billing portal session with correct return URL
- [ ] Route redirects to portal URL (303 status)
- [ ] Return URL brings user back to settings page

**Files to Create:**
- `apps/web/app/api/stripe/portal/route.ts` — billing portal API route

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/app/api/stripe/checkout/route.ts` — follow authentication pattern from checkout route

**Dependencies:** Task 2.1.A (can share authentication pattern)

**Spec Reference:** Technical Spec > API Routes > POST /api/stripe/portal

**Requires Browser Verification:** No (API-only, but will test in Phase 3)

---

### Step 2.3: Webhook Handler

**Depends On:** Step 2.1

---

#### Task 2.3.A: Implement Webhook Route

**Description:**  
Create the POST /api/webhooks/stripe endpoint that handles subscription lifecycle events from Stripe. This is critical for keeping the database in sync with Stripe's subscription state.

**Acceptance Criteria:**
- [ ] Route verifies stripe-signature header using STRIPE_WEBHOOK_SECRET
- [ ] Route returns 400 if signature is missing or invalid
- [ ] Route handles `checkout.session.completed` event:
  - Extracts userId from subscription metadata
  - Extracts plan from price ID
  - Updates user's plan and stripeSubscriptionId
- [ ] Route handles `customer.subscription.updated` event:
  - Maps new price ID to plan name
  - Updates user's plan in database
- [ ] Route handles `customer.subscription.deleted` event:
  - Sets user's plan back to 'free'
  - Clears stripeSubscriptionId
- [ ] Route returns 200 for successfully processed events
- [ ] Route is idempotent (duplicate events don't cause errors)
- [ ] Route logs unhandled event types without error

**Files to Create:**
- `apps/web/app/api/webhooks/stripe/route.ts` — webhook handler route

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/db/schema.ts` — user update patterns
- `apps/web/lib/stripe/constants.ts` — price ID to plan mapping

**Dependencies:** Task 1.3.A, Task 1.3.B (Stripe client and constants)

**Spec Reference:** Technical Spec > API Routes > POST /api/webhooks/stripe

**Requires Browser Verification:** No

---

#### Task 2.3.B: Create Price-to-Plan Mapping Utility

**Description:**  
Create a utility function that maps Stripe price IDs to plan names. This is needed by the webhook handler to determine which plan a user upgraded/downgraded to.

**Acceptance Criteria:**
- [ ] Function accepts a price ID string
- [ ] Function returns 'pro' for STRIPE_PRICE_PRO
- [ ] Function returns 'team' for STRIPE_PRICE_TEAM
- [ ] Function returns 'free' for unknown price IDs (safe default)
- [ ] Function is exported and reusable

**Files to Create:**
- `apps/web/lib/stripe/utils.ts` — Stripe utility functions

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/stripe/constants.ts` — PRICE_IDS mapping

**Dependencies:** Task 1.3.B (constants exist)

**Spec Reference:** Technical Spec > API Routes > Webhook handler (getPlanFromPriceId)

**Requires Browser Verification:** No

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] All existing tests pass
- [ ] TypeScript compilation passes
- [ ] Linting passes
- [ ] Build completes

**Regression Verification:**
- [ ] Existing API routes still function
- [ ] Authentication middleware unaffected
- [ ] Database operations work correctly

**Manual Verification:**
- [ ] POST to /api/stripe/checkout with valid session redirects to Stripe
- [ ] POST to /api/stripe/checkout without session returns 401
- [ ] POST to /api/stripe/checkout with invalid plan returns 400
- [ ] POST to /api/stripe/portal with paid user redirects to billing portal
- [ ] Stripe CLI receives test webhooks: `stripe trigger checkout.session.completed`
- [ ] Webhook handler processes events (check logs/database)

**Browser Verification:** No (will verify full flow in Phase 3)

---

## Phase 3: UI Integration

**Goal:** Connect the Stripe APIs to the user interface: settings page subscription management and pricing page upgrades  
**Depends On:** Phase 2

### Pre-Phase Setup

Human must complete before starting:

- [ ] Verify API routes work from Phase 2 checkpoint
- [ ] Have test user accounts ready (one free, one with existing subscription)

### Step 3.1: Settings Page Subscription UI

**Depends On:** Phase 2 complete

---

#### Task 3.1.A: Add Subscription Section to Settings

**Description:**  
Add a subscription management section to the settings page that shows current plan and provides upgrade/manage buttons. Users on free plan see upgrade options; paid users see a "Manage Subscription" button that opens the billing portal.

**Acceptance Criteria:**
- [ ] Settings page shows current plan name
- [ ] Free users see "Upgrade to Pro" and "Upgrade to Team" buttons
- [ ] Paid users see "Manage Billing" button
- [ ] Upgrade buttons submit forms to /api/stripe/checkout (free users only)
- [ ] Manage Billing button submits form to /api/stripe/portal (paid users only)
- [ ] Success query param shows success toast/message after returning from Stripe

**Files to Create:**
- `apps/web/app/(dashboard)/settings/SubscriptionSection.tsx` — subscription UI component (if not inline)

**Files to Modify:**
- `apps/web/app/(dashboard)/settings/page.tsx` — add subscription section

**Existing Code to Reference:**
- `apps/web/app/(dashboard)/settings/page.tsx` — existing settings page structure
- `apps/web/components/` — existing component patterns

**Dependencies:** Tasks 2.1.A, 2.2.A (checkout and portal routes)

**Spec Reference:** Technical Spec > Frontend Changes > Settings Page

**Requires Browser Verification:** Yes
- Verify subscription section renders correctly
- Verify buttons navigate to correct Stripe pages
- Verify success message appears after returning from checkout

---

### Step 3.2: Pricing Page Integration

**Depends On:** Step 3.1

---

#### Task 3.2.A: Update Pricing Page for Authenticated Users

**Description:**  
Modify the pricing page to detect authenticated users and show upgrade forms instead of sign-up CTAs. The page should also indicate which plan is current for logged-in users.

**Acceptance Criteria:**
- [ ] Authenticated users see form-based upgrade buttons
- [ ] Unauthenticated users see sign-up links (existing behavior)
- [ ] Current plan is marked with "Current Plan" badge
- [ ] Upgrade buttons are disabled for current plan
- [ ] Lower plans show "Use billing portal" messaging
- [ ] Free users see "Upgrade" buttons that trigger checkout
- [ ] Paid users see "Manage Plan" buttons that link to billing portal (not checkout)
- [ ] Forms submit correctly to /api/stripe/checkout (free upgrades) and /api/stripe/portal (paid changes)

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/(marketing)/pricing/page.tsx` — add authenticated state handling

**Existing Code to Reference:**
- `apps/web/app/(marketing)/pricing/page.tsx` — existing pricing page
- `apps/web/app/(dashboard)/settings/page.tsx` — authentication pattern

**Dependencies:** Task 3.1.A (similar form patterns)

**Spec Reference:** Technical Spec > Frontend Changes > Pricing Page

**Requires Browser Verification:** Yes
- Verify unauthenticated view unchanged
- Verify authenticated view shows correct CTAs
- Verify current plan badge displays

---

#### Task 3.2.B: Update PricingCard Component

**Description:**  
Update the PricingCard component to support form-based actions in addition to link-based CTAs. This enables the upgrade flow directly from the pricing cards.

**Acceptance Criteria:**
- [ ] Component accepts optional `ctaAction` prop for form action URL
- [ ] Component accepts optional `ctaPlanValue` prop for hidden plan input
- [ ] Component accepts `isCurrent` prop for current plan styling
- [ ] When ctaAction is provided, renders a form with submit button
- [ ] When ctaHref is provided, renders a link (existing behavior)
- [ ] Disabled state styling works correctly
- [ ] Current plan badge renders when isCurrent is true

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/components/marketing/pricing-card.tsx` — add form action support

**Existing Code to Reference:**
- `apps/web/components/marketing/pricing-card.tsx` — existing component structure

**Dependencies:** None (can be done in parallel with 3.2.A)

**Spec Reference:** Technical Spec > Frontend Changes > PricingCard Component Update

**Requires Browser Verification:** Yes
- Verify form submission works
- Verify link behavior preserved
- Verify disabled state styling

---

### Step 3.3: Quota Display Integration

**Depends On:** Step 3.1

---

#### Task 3.3.A: Update Quota Display with Plan Limits

**Description:**  
Update the quota/usage display component to show limits based on the user's current plan. This provides context for why a user might want to upgrade.

**Acceptance Criteria:**
- [ ] Free plan shows correct limits (5K events, 1 project, 7-day retention)
- [ ] Pro plan shows correct limits (100K events, 5 projects, 90-day retention)
- [ ] Team plan shows correct limits (1M events, unlimited projects, 365-day retention)
- [ ] Current usage is displayed relative to plan limits
- [ ] Near-limit states show upgrade prompt

**Files to Create:**
- None (or create `apps/web/lib/plans.ts` if constants don't exist)

**Files to Modify:**
- Component that displays quota/usage (identify from codebase)

**Existing Code to Reference:**
- Existing quota display component
- `apps/web/lib/stripe/constants.ts` — can extend for plan limits

**Dependencies:** Task 1.3.B (constants file exists)

**Spec Reference:** Technical Spec > Architecture diagram (Quota Display)

**Requires Browser Verification:** Yes
- Verify limits display correctly per plan
- Verify usage numbers are accurate

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] All existing tests pass
- [ ] TypeScript compilation passes
- [ ] Linting passes
- [ ] Build completes

**Regression Verification:**
- [ ] Existing settings page functionality preserved
- [ ] Existing pricing page styling preserved
- [ ] Authentication flow unaffected

**Manual Verification:**
- [ ] Free user can complete upgrade to Pro via settings page
- [ ] Free user can complete upgrade to Team via pricing page
- [ ] Pro user can access billing portal from settings
- [ ] Team user sees correct UI state
- [ ] Success messages appear after Stripe redirects

**Browser Verification:**
- [ ] All UI acceptance criteria verified via browser
- [ ] No console errors on settings, pricing pages
- [ ] Forms submit correctly
- [ ] Redirects work as expected
- [ ] Mobile responsive (if applicable)

---

## Phase 4: Testing & Verification

**Goal:** Comprehensive testing including unit tests, integration tests, and full end-to-end verification  
**Depends On:** Phase 3

### Pre-Phase Setup

Human must complete before starting:

- [ ] Ensure Stripe test mode is active
- [ ] Have test card numbers ready (see Technical Spec > Testing)
- [ ] Stripe CLI running for webhook forwarding

### Step 4.1: Unit Tests

**Depends On:** Phase 3 complete

---

#### Task 4.1.A: Checkout Route Tests

**Description:**  
Write unit tests for the checkout route covering authentication, validation, and successful checkout session creation.

**Acceptance Criteria:**
- [ ] Test: returns 401 if not authenticated
- [ ] Test: returns 400 for invalid plan
- [ ] Test: returns 400 if user already on requested plan
- [ ] Test: creates Stripe customer if none exists
- [ ] Test: reuses existing Stripe customer ID
- [ ] Test: creates checkout session with correct parameters
- [ ] Test: returns redirect to checkout URL
- [ ] All tests pass with mocked Stripe SDK

**Files to Create:**
- `apps/web/tests/stripe-checkout.test.ts` — checkout route tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/tests/` — existing test patterns and setup
- `apps/web/vitest.config.ts` or `jest.config.js` — test configuration

**Dependencies:** Task 2.1.A (route exists to test)

**Spec Reference:** Technical Spec > Testing Strategy > Unit Tests

**Requires Browser Verification:** No

---

#### Task 4.1.B: Webhook Route Tests

**Description:**  
Write unit tests for the webhook handler covering signature verification, event handling, and database updates.

**Acceptance Criteria:**
- [ ] Test: returns 400 for missing signature
- [ ] Test: returns 400 for invalid signature
- [ ] Test: handles checkout.session.completed correctly
- [ ] Test: handles customer.subscription.updated correctly
- [ ] Test: handles customer.subscription.deleted correctly
- [ ] Test: is idempotent for duplicate events
- [ ] Test: returns 200 for unhandled event types (no error)
- [ ] All tests pass with mocked Stripe SDK and database

**Files to Create:**
- `apps/web/tests/stripe-webhook.test.ts` — webhook route tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/tests/` — existing test patterns
- Technical Spec test examples

**Dependencies:** Task 2.3.A (route exists to test)

**Spec Reference:** Technical Spec > Testing Strategy > Unit Tests

**Requires Browser Verification:** No

---

#### Task 4.1.C: Portal Route Tests

**Description:**  
Write unit tests for the billing portal route covering authentication and portal session creation.

**Acceptance Criteria:**
- [ ] Test: returns 401 if not authenticated
- [ ] Test: returns 400 if user has no Stripe customer ID
- [ ] Test: creates portal session with correct return URL
- [ ] Test: returns redirect to portal URL
- [ ] All tests pass with mocked Stripe SDK

**Files to Create:**
- `apps/web/tests/stripe-portal.test.ts` — portal route tests

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/tests/stripe-checkout.test.ts` — similar test patterns

**Dependencies:** Task 2.2.A (route exists to test)

**Spec Reference:** Technical Spec > Testing Strategy

**Requires Browser Verification:** No

---

### Step 4.2: Integration Testing

**Depends On:** Step 4.1

---

#### Task 4.2.A: End-to-End Upgrade Flow Test

**Description:**  
Test the complete upgrade flow from free user clicking upgrade through to database reflecting the new plan. Uses Stripe test mode with CLI webhook forwarding.

**Acceptance Criteria:**
- [ ] Free user can initiate checkout for Pro plan
- [ ] Stripe checkout accepts test card (4242...)
- [ ] Webhook received and processed
- [ ] User's plan updated to 'pro' in database
- [ ] User's stripeSubscriptionId populated
- [ ] Settings page reflects new plan
- [ ] Same flow works for Team plan upgrade

**Files to Create:**
- `apps/web/tests/e2e/stripe-upgrade.spec.ts` (if using Playwright/Cypress)

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/tests/e2e/` — existing E2E test patterns (if any)

**Dependencies:** Tasks 4.1.A, 4.1.B, 4.1.C (unit tests pass first)

**Spec Reference:** Technical Spec > Testing Strategy > Local Development Testing

**Requires Browser Verification:** Yes (this is the E2E browser test)

---

#### Task 4.2.B: Subscription Management Flow Test

**Description:**  
Test the billing portal flow for existing subscribers: accessing portal, making changes, and webhook processing.

**Acceptance Criteria:**
- [ ] Pro user can access billing portal
- [ ] Portal shows current subscription
- [ ] User can upgrade to Team (webhook updates plan)
- [ ] User can cancel subscription (webhook sets to free)
- [ ] User can update payment method
- [ ] All state changes reflected in app UI

**Files to Create:**
- None (manual testing checklist, or extend E2E test file)

**Files to Modify:**
- None

**Existing Code to Reference:**
- Task 4.2.A E2E test patterns

**Dependencies:** Task 4.2.A (basic flow working)

**Spec Reference:** Technical Spec > Testing Strategy

**Requires Browser Verification:** Yes

---

### Step 4.3: Error Handling & Edge Cases

**Depends On:** Step 4.2

---

#### Task 4.3.A: Verify Error Handling

**Description:**  
Test and verify error handling for various failure scenarios: declined cards, webhook failures, network errors.

**Acceptance Criteria:**
- [ ] Declined card shows appropriate error in Stripe checkout
- [ ] Invalid signature returns 400 (not 500)
- [ ] Missing metadata in webhook handled gracefully
- [ ] Database errors don't crash webhook handler
- [ ] User sees helpful error messages, not technical errors
- [ ] All error states logged appropriately

**Files to Create:**
- None (extend existing test files)

**Files to Modify:**
- API routes (if error handling gaps found)

**Existing Code to Reference:**
- Existing error handling patterns in API routes

**Dependencies:** Tasks 4.2.A, 4.2.B (happy paths work)

**Spec Reference:** Technical Spec > Security Considerations

**Requires Browser Verification:** Yes (verify UI error states)

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] All unit tests pass (stripe-checkout, stripe-webhook, stripe-portal)
- [ ] All existing tests still pass
- [ ] TypeScript compilation passes
- [ ] Linting passes
- [ ] Build completes
- [ ] E2E tests pass (if applicable)

**Regression Verification:**
- [ ] All Phase 1-3 functionality still works
- [ ] No performance degradation
- [ ] No new console errors

**Manual Verification:**
- [ ] Complete upgrade flow: Free → Pro (test card)
- [ ] Complete upgrade flow: Pro → Team (via portal)
- [ ] Downgrade flow: Team → Pro (via portal)
- [ ] Cancel flow: Pro → Free (via portal)
- [ ] Test with requires-auth card: 4000 0025 0000 3155
- [ ] Test webhook replay: `stripe events resend evt_xxx`
- [ ] Verify idempotency: replay same event twice

**Browser Verification:**
- [ ] All flows verified in actual browser
- [ ] No console errors
- [ ] Mobile responsive (if applicable)
- [ ] Screenshots captured for documentation

---

## Rollback Plan

**Feature Flag Option:**
If issues arise, the feature can be disabled by:
1. Removing upgrade buttons from UI (quick)
2. Having checkout/portal routes return maintenance message
3. Webhooks can continue processing (Stripe subscriptions still valid)

**Database Rollback:**
The migration is additive only (new column). To rollback:
1. Clear `stripe_subscription_id` values: `UPDATE users SET stripe_subscription_id = NULL`
2. Column can remain (no breaking changes)

**Full Rollback:**
1. Revert UI changes (settings, pricing pages)
2. Disable API routes (return 503)
3. Contact affected users about Stripe subscription status
4. Process refunds via Stripe dashboard if needed

---

## Post-Launch Monitoring

- [ ] Monitor Stripe webhook success rate in dashboard
- [ ] Set up alerts for failed webhooks
- [ ] Track checkout conversion rate
- [ ] Monitor for subscription failures/churns
- [ ] Watch for error spikes in application logs
