# Stripe Payments — Technical Specification

## Overview

Integrate Stripe Billing to enable subscription management for Pro ($9/mo) and Team ($29/mo) plans.

**Key Integration Points:**
- Stripe Checkout (hosted) for payment collection
- Stripe Billing Portal for subscription management
- Stripe Webhooks for subscription lifecycle events

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Settings     │  │ Quota        │  │ Pricing      │                  │
│  │ Page         │  │ Display      │  │ Page         │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                           │
│         └─────────────────┼─────────────────┘                           │
│                           │                                             │
│                           ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    POST /api/stripe/checkout                     │   │
│  │                    POST /api/stripe/portal                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Stripe API                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Checkout     │  │ Billing      │  │ Webhooks     │                  │
│  │ Sessions     │  │ Portal       │  │              │                  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘                  │
└─────────────────────────────────────────────┼───────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/webhooks/stripe                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ • checkout.session.completed                                      │  │
│  │ • customer.subscription.updated                                   │  │
│  │ • customer.subscription.deleted                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ users                                                             │  │
│  │ • plan: 'free' | 'pro' | 'team'                                   │  │
│  │ • stripe_customer_id: string                                      │  │
│  │ • stripe_subscription_id: string  ← NEW                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

Add to `apps/web/.env.example`:

```bash
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_TEAM="price_..."
```

**Setup Instructions:**

1. Create Stripe account at https://dashboard.stripe.com
2. Create Product: "Tally Analytics"
3. Create Price: "Pro" - $9/month recurring
4. Create Price: "Team" - $29/month recurring
5. Copy price IDs to env vars
6. Get API keys from Developers → API keys
7. Create webhook endpoint in Developers → Webhooks
   - Endpoint: `https://usetally.xyz/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
8. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Dependencies

```bash
pnpm -C apps/web add stripe
```

No client-side Stripe.js needed (using hosted checkout).

---

## Stripe Constants

**Location:** `apps/web/lib/stripe/constants.ts`

```typescript
// Plan limits for quota enforcement
export const PLAN_LIMITS = {
  free: 10_000,
  pro: 100_000,
  team: 1_000_000,
} as const;

export const PLAN_PROJECTS = {
  free: 3,
  pro: 10,
  team: Infinity,
} as const;
```

Note: After implementation, refactor `apps/web/app/api/projects/[id]/route.ts` to import `PLAN_LIMITS` from this file instead of defining locally.

---

## Database Migration

### Migration File

Create `apps/web/drizzle/migrations/0002_stripe_subscription.sql`:

```sql
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
CREATE INDEX idx_users_stripe_subscription_id ON users(stripe_subscription_id);
```

### Schema Update

Update `apps/web/lib/db/schema.ts`:

```typescript
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

    plan: varchar("plan", { length: 20 }).notNull().default("free"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }), // NEW
  },
  // ... existing checks and indexes
);
```

---

## API Routes

### POST /api/stripe/checkout

Creates a Stripe Checkout session and returns the URL for redirect.

**Location:** `apps/web/app/api/stripe/checkout/route.ts`

**Request:**
Form data with field: plan ("pro" | "team")

**Response:**
```typescript
// Success (303 redirect to Stripe Checkout)
// or
{
  error: string
}
```

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "../../../../lib/auth/cookies";
import { db } from "../../../../lib/db/client";
import { sessions, users } from "../../../../lib/db/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate user
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get user and validate plan selection
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, userId));

  const user = userRows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3. Parse request body
  const formData = await request.formData();
  const plan = formData.get("plan") as string;

  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // 4. Only allow checkout for free users (paid users must use billing portal)
  if (user.plan !== "free") {
    return NextResponse.json(
      { error: "Use billing portal to change your subscription" },
      { status: 400 }
    );
  }

  // 5. Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // 6. Create Checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usetally.xyz";
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card", "link"],
    line_items: [
      {
        price: PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/settings?success=true&plan=${plan}`,
    cancel_url: `${appUrl}/settings`,
    subscription_data: {
      metadata: {
        userId: user.id,
        plan: plan,
      },
    },
    metadata: {
      userId: user.id,
      plan: plan,
    },
  });

  // 7. Redirect to Stripe Checkout
  return NextResponse.redirect(session.url!, 303);
}
```

---

### POST /api/stripe/portal

Creates a Stripe Billing Portal session for subscription management.

**Location:** `apps/web/app/api/stripe/portal/route.ts`

**Request:** (no body required)

**Response:**
```typescript
// Success (303 redirect to Stripe Portal)
// or
{
  error: string
}
```

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "../../../../lib/auth/cookies";
import { db } from "../../../../lib/db/client";
import { sessions, users } from "../../../../lib/db/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate user
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get user
  const userRows = await db
    .select({
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, userId));

  const user = userRows[0];
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 400 }
    );
  }

  // 3. Create portal session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://usetally.xyz";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  // 4. Redirect to Stripe Portal
  return NextResponse.redirect(portalSession.url, 303);
}
```

---

### POST /api/webhooks/stripe

Handles Stripe webhook events for subscription lifecycle.

**Location:** `apps/web/app/api/webhooks/stripe/route.ts`

**Events Handled:**
- `checkout.session.completed` — User completed checkout
- `customer.subscription.updated` — Subscription changed (upgrade/downgrade/renewal)
- `customer.subscription.deleted` — Subscription canceled or expired

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "../../../../lib/db/client";
import { users } from "../../../../lib/db/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO!]: "pro",
  [process.env.STRIPE_PRICE_TEAM!]: "team",
};

export async function POST(request: Request): Promise<Response> {
  // 1. Get raw body and signature
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // 2. Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Handle events
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Extract user ID and plan from metadata
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !plan) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  // Check for idempotency - skip if already processed
  const existingUser = await db
    .select({ stripeSubscriptionId: users.stripeSubscriptionId })
    .from(users)
    .where(eq(users.id, userId));

  if (existingUser[0]?.stripeSubscriptionId === subscriptionId) {
    console.log(`Checkout already processed for user ${userId}`);
    return;
  }

  // Update user with new subscription
  await db
    .update(users)
    .set({
      plan: plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`User ${userId} upgraded to ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  // Find user by Stripe customer ID
  const userRows = await db
    .select({ id: users.id, stripeSubscriptionId: users.stripeSubscriptionId })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  const user = userRows[0];
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Idempotency check for subscription ID
  // (plan changes are still processed)
  
  // Determine new plan from price
  const priceId = subscription.items.data[0]?.price.id;
  const newPlan = PRICE_TO_PLAN[priceId] || "free";

  // Handle subscription status
  let effectivePlan = newPlan;
  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    effectivePlan = "free";
  }

  // Update user
  await db
    .update(users)
    .set({
      plan: effectivePlan,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`User ${user.id} subscription updated to ${effectivePlan}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  const user = userRows[0];
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // Downgrade to free
  await db
    .update(users)
    .set({
      plan: "free",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`User ${user.id} downgraded to free (subscription deleted)`);
}
```

---

## UI Components

### Settings Page Updates

**Location:** `apps/web/app/(dashboard)/settings/page.tsx`

Update to include billing buttons and success message:

```typescript
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import React from "react";

import { SESSION_COOKIE_NAME } from "../../../lib/auth/cookies";
import { db } from "../../../lib/db/client";
import { sessions, users } from "../../../lib/db/schema";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; plan?: string };
}) {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!sessionId) {
    return <p className="text-sm text-slate-700">Unauthorized.</p>;
  }

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId ?? null;
  if (!userId) {
    return <p className="text-sm text-slate-700">Unauthorized.</p>;
  }

  const userRows = await db
    .select({ email: users.email, plan: users.plan })
    .from(users)
    .where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) return <p className="text-sm text-slate-700">Unauthorized.</p>;

  const isPaidUser = user.plan !== "free";
  const showSuccess = searchParams.success === "true";

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Account settings
        </h1>
        <p className="text-sm text-slate-600">Manage your account.</p>
      </header>

      {showSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Successfully upgraded to {(searchParams.plan || user.plan).charAt(0).toUpperCase() + (searchParams.plan || user.plan).slice(1)}!
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Email</dt>
            <dd className="font-medium text-slate-900">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Plan</dt>
            <dd className="font-medium text-slate-900">
              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        {isPaidUser ? (
          <form action="/api/stripe/portal" method="post">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Manage Billing
            </button>
          </form>
        ) : (
          <UpgradePlanButton />
        )}

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

function UpgradePlanButton() {
  return (
    <div className="relative">
      <button
        type="button"
        className="peer rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Upgrade Plan
      </button>
      
      {/* Dropdown - shown on click via CSS :focus-within */}
      <div className="absolute left-0 top-full z-10 mt-2 hidden w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg peer-focus:block hover:block">
        <form action="/api/stripe/checkout" method="post" className="contents">
          <input type="hidden" name="plan" value="pro" />
          <button
            type="submit"
            className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
          >
            <span className="font-medium">Pro</span>
            <span className="ml-2 text-slate-500">$9/mo</span>
          </button>
        </form>
        <form action="/api/stripe/checkout" method="post" className="contents">
          <input type="hidden" name="plan" value="team" />
          <button
            type="submit"
            className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
          >
            <span className="font-medium">Team</span>
            <span className="ml-2 text-slate-500">$29/mo</span>
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Quota Display Updates

**Location:** `apps/web/components/dashboard/quota-display.tsx`

Add upgrade button when at 80%+ or over quota:

```typescript
import React from "react";

export default function QuotaDisplay({
  used,
  limit,
  isOverQuota,
  userPlan = "free",
}: {
  used: number;
  limit: number;
  isOverQuota: boolean;
  userPlan?: string;
}) {
  const safeLimit = limit > 0 ? limit : 1;
  const rawPercent = Math.round((used / safeLimit) * 100);
  const percent = Math.max(0, Math.min(100, rawPercent));
  const showWarning = !isOverQuota && percent >= 80;
  const showUpgrade = userPlan === "free" && (isOverQuota || showWarning);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-display text-sm font-semibold text-slate-900">Quota</h2>

      {isOverQuota ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Over quota.</strong> Events are still collected, but your dashboard may be limited until you upgrade.
        </div>
      ) : showWarning ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
          You're at <strong>{percent}%</strong> of your monthly quota.
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-700">
        <span>Usage</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>

      <div className="mt-2 h-2 w-full rounded bg-slate-200">
        <div
          className={`h-2 rounded ${isOverQuota ? "bg-amber-500" : "bg-slate-900"}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-600">{percent}%</p>

      {showUpgrade && (
        <form action="/api/stripe/checkout" method="post" className="mt-4">
          <input type="hidden" name="plan" value="pro" />
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Upgrade to Pro
          </button>
        </form>
      )}
    </section>
  );
}
```

---

### Pricing Page Updates

**Location:** `apps/web/app/(marketing)/pricing/page.tsx`

Make pricing page context-aware for logged-in users:

```typescript
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import React from "react";

import PricingCard from "../../../components/marketing/pricing-card";
import { SESSION_COOKIE_NAME } from "../../../lib/auth/cookies";
import { db } from "../../../lib/db/client";
import { sessions, users } from "../../../lib/db/schema";

// Remove force-static since we need to check auth
// export const dynamic = "force-static";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

type Tier = {
  name: string;
  planKey: "free" | "pro" | "team";
  priceLabel: string;
  priceSuffix: string;
  eventsLabel: string;
  projectsLabel: string;
  retentionLabel: string;
  supportLabel: string;
  highlighted: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    planKey: "free",
    priceLabel: "$0",
    priceSuffix: "forever",
    eventsLabel: "10,000 events/mo",
    projectsLabel: "3",
    retentionLabel: "90 days",
    supportLabel: "Community",
    highlighted: false,
  },
  {
    name: "Pro",
    planKey: "pro",
    priceLabel: "$9",
    priceSuffix: "/month",
    eventsLabel: "100,000 events/mo",
    projectsLabel: "10",
    retentionLabel: "Unlimited",
    supportLabel: "Email",
    highlighted: true,
  },
  {
    name: "Team",
    planKey: "team",
    priceLabel: "$29",
    priceSuffix: "/month",
    eventsLabel: "1,000,000 events/mo",
    projectsLabel: "Unlimited",
    retentionLabel: "Unlimited",
    supportLabel: "Priority",
    highlighted: false,
  },
];

async function getCurrentUserPlan(): Promise<string | null> {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const now = new Date();
  const sessionRows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

  const userId = sessionRows[0]?.userId;
  if (!userId) return null;

  const userRows = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId));

  return userRows[0]?.plan ?? null;
}

function getCtaForTier(
  tier: Tier,
  currentPlan: string | null
): { label: string; href?: string; action?: string; planValue?: string } {
  const planHierarchy = { free: 0, pro: 1, team: 2 };

  // Not logged in
  if (!currentPlan) {
    if (tier.planKey === "free") {
      return { label: "Get Started", href: INSTALL_URL };
    }
    return { label: "Start Free, Upgrade Later", href: INSTALL_URL };
  }

  const currentLevel = planHierarchy[currentPlan as keyof typeof planHierarchy] ?? 0;
  const tierLevel = planHierarchy[tier.planKey];

  // Current plan
  if (tier.planKey === currentPlan) {
    return { label: "Current Plan" };
  }

  // Upgrade
  if (tierLevel > currentLevel) {
    // Only free users go through checkout; paid users use portal
    if (currentPlan === "free") {
      return { label: "Upgrade", action: "/api/stripe/checkout", planValue: tier.planKey };
    }
    return { label: "Manage Plan", action: "/api/stripe/portal" };
  }

  // Downgrade
  return { label: "Downgrade", action: "/api/stripe/portal" };
}

export default async function PricingPage() {
  const currentPlan = await getCurrentUserPlan();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight text-[#1b140d]">Pricing</h1>
        <p className="mt-4 text-lg text-[#9a734c]">
          Start free in minutes. Upgrade when you need higher limits and retention.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {TIERS.map((tier, index) => {
          const cta = getCtaForTier(tier, currentPlan);
          const isCurrent = tier.planKey === currentPlan;

          return (
            <div
              key={tier.name}
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <PricingCard
                name={tier.name}
                priceLabel={tier.priceLabel}
                priceSuffix={tier.priceSuffix}
                eventsLabel={tier.eventsLabel}
                projectsLabel={tier.projectsLabel}
                retentionLabel={tier.retentionLabel}
                supportLabel={tier.supportLabel}
                highlighted={tier.highlighted}
                isCurrent={isCurrent}
                ctaLabel={cta.label}
                ctaHref={cta.href}
                ctaAction={cta.action}
                ctaPlanValue={cta.planValue}
              />
            </div>
          );
        })}
      </div>

      {/* Compare plans table - unchanged */}
      <section className="mt-16 overflow-hidden rounded-xl border border-[#e8e0d9] bg-white shadow-warm">
        {/* ... existing comparison table ... */}
      </section>
    </main>
  );
}
```

---

### PricingCard Component Updates

**Location:** `apps/web/components/marketing/pricing-card.tsx`

Update to support form actions:

```typescript
import React from "react";

type PricingCardProps = {
  name: string;
  priceLabel: string;
  priceSuffix: string;
  eventsLabel: string;
  projectsLabel: string;
  retentionLabel: string;
  supportLabel: string;
  highlighted: boolean;
  isCurrent?: boolean;
  ctaLabel: string;
  ctaHref?: string;
  ctaAction?: string;
  ctaPlanValue?: string;
};

export default function PricingCard({
  name,
  priceLabel,
  priceSuffix,
  eventsLabel,
  projectsLabel,
  retentionLabel,
  supportLabel,
  highlighted,
  isCurrent = false,
  ctaLabel,
  ctaHref,
  ctaAction,
  ctaPlanValue,
}: PricingCardProps) {
  const isDisabled = ctaLabel === "Current Plan";

  const buttonClasses = highlighted
    ? "block w-full rounded-lg bg-[#ec7f13] py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#d46f0e] disabled:opacity-50 disabled:cursor-not-allowed"
    : "block w-full rounded-lg border border-[#1b140d] py-2.5 text-center text-sm font-semibold text-[#1b140d] transition hover:bg-[#1b140d] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 ${
        highlighted
          ? "border-[#ec7f13] bg-white shadow-lg"
          : "border-[#e8e0d9] bg-white"
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-4 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
          Current Plan
        </span>
      )}

      <h3 className="font-display text-lg font-semibold text-[#1b140d]">{name}</h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold text-[#1b140d]">{priceLabel}</span>
        <span className="text-sm text-[#9a734c]">{priceSuffix}</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm text-[#1b140d]">
        <li className="flex items-center gap-2">
          <CheckIcon />
          {eventsLabel}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon />
          {projectsLabel} projects
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon />
          {retentionLabel} retention
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon />
          {supportLabel} support
        </li>
      </ul>

      <div className="mt-6">
        {ctaAction ? (
          <form action={ctaAction} method="post">
            {ctaPlanValue && <input type="hidden" name="plan" value={ctaPlanValue} />}
            <button type="submit" className={buttonClasses} disabled={isDisabled}>
              {ctaLabel}
            </button>
          </form>
        ) : ctaHref ? (
          <a href={ctaHref} className={buttonClasses}>
            {ctaLabel}
          </a>
        ) : (
          <button className={buttonClasses} disabled={isDisabled}>
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-[#ec7f13]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
```

---

## Testing Strategy

### Unit Tests

**Location:** `apps/web/tests/stripe-*.test.ts`

```typescript
// stripe-checkout.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn().mockResolvedValue({ id: "cus_test123" }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test123",
            url: "https://checkout.stripe.com/test",
          }),
        },
      },
    })),
  };
});

describe("POST /api/stripe/checkout", () => {
  it("returns 401 if not authenticated", async () => {
    // Test implementation
  });

  it("returns 400 for invalid plan", async () => {
    // Test implementation
  });

  it("creates checkout session and redirects", async () => {
    // Test implementation
  });

  it("reuses existing Stripe customer ID", async () => {
    // Test implementation
  });
});
```

```typescript
// stripe-webhook.test.ts
import { describe, it, expect, vi } from "vitest";

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 for missing signature", async () => {
    // Test implementation
  });

  it("returns 400 for invalid signature", async () => {
    // Test implementation
  });

  it("handles checkout.session.completed", async () => {
    // Test implementation
  });

  it("handles customer.subscription.updated", async () => {
    // Test implementation
  });

  it("handles customer.subscription.deleted", async () => {
    // Test implementation
  });

  it("is idempotent for duplicate events", async () => {
    // Test implementation
  });
});
```

### Local Development Testing

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli

2. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Copy the webhook signing secret and set `STRIPE_WEBHOOK_SECRET`

4. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires auth: `4000 0025 0000 3155`

5. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   ```

---

## Security Considerations

1. **Webhook Signature Verification:** Always verify `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`

2. **API Key Security:** Never expose `STRIPE_SECRET_KEY` to client; only use in server-side code

3. **HTTPS Required:** All Stripe communication must use HTTPS

4. **Idempotent Handlers:** Webhook handlers check for duplicate processing to prevent double-updates

5. **User Validation:** All endpoints verify session authentication before processing

6. **Metadata Validation:** Webhook handler validates presence of required metadata fields

---

## Rollout Plan

### Phase 1: Development
1. Add Stripe SDK dependency
2. Run database migration
3. Implement API routes
4. Update UI components
5. Write unit tests

### Phase 2: Testing
1. Test locally with Stripe CLI
2. Test in Stripe test mode on staging
3. Verify webhook handling
4. Test all upgrade/downgrade paths

### Phase 3: Production
1. Create production Stripe products/prices
2. Set production environment variables
3. Create production webhook endpoint
4. Deploy and monitor

---

## Future Considerations

- **Annual Billing:** Add yearly prices with discount
- **Team Seats:** Per-seat pricing for Team plan
- **Usage-Based Billing:** Charge for overages instead of hard limits
- **Dunning Emails:** Customize failed payment emails
- **Invoice PDF:** Generate custom invoices
- **Tax Handling:** Add Stripe Tax for VAT/sales tax
