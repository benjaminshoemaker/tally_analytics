# Stripe Payments — Feature Specification

## Overview

**Goal:** Enable users to upgrade from Free to Pro ($9/mo) or Team ($29/mo) plans via Stripe, and manage their subscriptions.

**Success Metric:** Users can complete the upgrade flow in under 60 seconds.

---

## User Stories

### US-1: Upgrade from Free to Paid Plan
**As a** free-tier user approaching my quota limit,  
**I want to** upgrade to a paid plan,  
**So that** I get higher event limits and more projects.

**Acceptance Criteria:**
- User can initiate upgrade from Settings, Quota display, or Pricing page
- User is redirected to Stripe Checkout (hosted)
- After successful payment, user's plan updates immediately
- User is redirected to Settings with success confirmation

### US-2: Upgrade from Pro to Team
**As a** Pro user needing higher limits,  
**I want to** upgrade to the Team plan,  
**So that** I can track up to 1M events/month with unlimited projects.

**Acceptance Criteria:**
- Upgrade is immediate with prorated charge
- User sees new plan reflected in Settings immediately

### US-3: Downgrade Plan
**As a** paid user who wants to reduce costs,  
**I want to** downgrade to a lower tier,  
**So that** I pay less while keeping basic functionality.

**Acceptance Criteria:**
- User accesses Stripe Billing Portal from Settings
- Downgrade takes effect at end of billing period
- User retains current plan access until period ends

### US-4: Cancel Subscription
**As a** paid user who no longer needs the service,  
**I want to** cancel my subscription,  
**So that** I'm not charged next month.

**Acceptance Criteria:**
- User accesses Stripe Billing Portal from Settings
- Cancellation takes effect at end of billing period
- User retains access until period ends
- User reverts to Free plan when subscription expires

### US-5: Update Payment Method
**As a** paid user whose card is expiring,  
**I want to** update my payment method,  
**So that** my subscription continues uninterrupted.

**Acceptance Criteria:**
- User accesses Stripe Billing Portal from Settings
- User can add/remove payment methods
- User can view past invoices

### US-6: View Current Plan Status
**As a** user,  
**I want to** see my current plan and billing status,  
**So that** I know what I'm paying for.

**Acceptance Criteria:**
- Settings page shows current plan name
- Paid users see "Manage Billing" button
- Free users see "Upgrade" button

---

## Pricing Tiers

| Tier | Price | Events/Month | Projects | Data Retention | Support |
|------|-------|--------------|----------|----------------|---------|
| Free | $0 | 10,000 | 3 | 90 days | Community |
| Pro | $9/month | 100,000 | 10 | Unlimited | Email |
| Team | $29/month | 1,000,000 | Unlimited | Unlimited | Priority |

**Notes:**
- Monthly billing only (no annual plans in MVP)
- Card + Link payment methods accepted
- No free trial (Free tier serves this purpose)

---

## User Flows

### Flow 1: Upgrade via Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│ Settings Page                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Email: user@example.com                                 │ │
│ │ Plan: Free                                              │ │
│ │                                                         │ │
│ │ [Upgrade Plan]                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Plan Selection (inline or modal)                            │
│ ┌───────────────┐  ┌───────────────┐                        │
│ │ Pro - $9/mo   │  │ Team - $29/mo │                        │
│ │ [Select]      │  │ [Select]      │                        │
│ └───────────────┘  └───────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Stripe Checkout (hosted)                                    │
│ - Pre-filled email                                          │
│ - Card / Link payment                                       │
│ - Shows plan name and price                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            [Success]             [Cancel]
                    │                   │
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ Settings?success=true    │  │ Settings                 │
│ "Plan upgraded to Pro!"  │  │ (no change)              │
└──────────────────────────┘  └──────────────────────────┘
```

### Flow 2: Upgrade via Quota Warning

```
┌─────────────────────────────────────────────────────────────┐
│ Quota Display Component                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ You're at 85% of your monthly quota.                 │ │
│ │                                                         │ │
│ │ Usage: 8,500 / 10,000                                   │ │
│ │ ████████████████████░░░░ 85%                            │ │
│ │                                                         │ │
│ │ [Upgrade Plan]                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    (Same flow as above)
```

### Flow 3: Pricing Page (Logged-In User)

```
┌─────────────────────────────────────────────────────────────┐
│ Pricing Page                                                │
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ Free        │  │ Pro         │  │ Team        │          │
│ │ $0          │  │ $9/mo       │  │ $29/mo      │          │
│ │             │  │             │  │             │          │
│ │ [Current]   │  │ [Upgrade]   │  │ [Upgrade]   │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘

(If user is on Pro plan:)

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Free        │  │ Pro         │  │ Team        │
│ $0          │  │ $9/mo       │  │ $29/mo      │
│             │  │ ✓ Current   │  │             │
│ [Downgrade] │  │ [Manage]    │  │ [Manage Plan] │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Flow 4: Manage Billing (Paid User)

```
┌─────────────────────────────────────────────────────────────┐
│ Settings Page (Pro user)                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Email: user@example.com                                 │ │
│ │ Plan: Pro                                               │ │
│ │                                                         │ │
│ │ [Manage Billing]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Stripe Billing Portal (hosted)                              │
│ - View/update payment methods                               │
│ - View invoices                                             │
│ - Change plan (upgrade/downgrade)                           │
│ - Cancel subscription                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Settings Page                                               │
│ (plan updated if changed)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Settings Page Updates

**Free User View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Account Settings                                            │
│ Manage your account.                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Email          user@example.com                         │ │
│ │ Plan           Free                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Upgrade Plan]                              [Log out]       │
└─────────────────────────────────────────────────────────────┘
```

**Paid User View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Account Settings                                            │
│ Manage your account.                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Email          user@example.com                         │ │
│ │ Plan           Pro                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Manage Billing]                            [Log out]       │
└─────────────────────────────────────────────────────────────┘
```

**Success State (after upgrade):**
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Successfully upgraded to Pro!                             │
└─────────────────────────────────────────────────────────────┘
```

### Quota Display Updates

**At 80%+ Usage:**
```
┌─────────────────────────────────────────────────────────────┐
│ Quota                                                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ You're at 85% of your monthly quota.                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Usage                                    8,500 / 10,000     │
│ ████████████████████░░░░ 85%                                │
│                                                             │
│ [Upgrade Plan]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Over Quota:**
```
┌─────────────────────────────────────────────────────────────┐
│ Quota                                                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Over quota. Events are still collected, but your     │ │
│ │ dashboard may be limited until you upgrade.             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Usage                                   12,000 / 10,000     │
│ ████████████████████████ 120%                               │
│                                                             │
│ [Upgrade Plan]                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pricing Page Updates

**Logged-Out or Free User:**
- Free card: "Get Started" → links to GitHub App install
- Pro card: "Upgrade" → triggers checkout
- Team card: "Upgrade" → triggers checkout

**Pro User:**
- Free card: "Downgrade" → links to billing portal
- Pro card: "Current Plan" badge, "Manage" → billing portal
- Team card: "Manage Plan" → links to billing portal

**Team User:**
- Free card: "Downgrade" → links to billing portal
- Pro card: "Downgrade" → links to billing portal
- Team card: "Current Plan" badge, "Manage" → billing portal

---

## Subscription Lifecycle

### Plan Changes

| From | To | Timing | Billing |
|------|-----|--------|---------|
| Free | Pro | Immediate | Full charge |
| Free | Team | Immediate | Full charge |
| Pro | Team | Immediate | Prorated charge |
| Team | Pro | End of period | Prorated credit applied to next invoice |
| Pro | Free | End of period | No refund |
| Team | Free | End of period | No refund |

Note: All paid-to-paid plan changes (Pro↔Team) are handled through Stripe Billing Portal, which manages proration automatically. Stripe Checkout is only used for Free→Paid upgrades.

### Cancellation

1. User clicks "Manage Billing" → Stripe Portal
2. User clicks "Cancel subscription" in portal
3. Subscription marked as `cancel_at_period_end`
4. User retains access until period ends
5. When period ends, webhook fires → plan reverts to Free

### Failed Payments

- Stripe automatically retries failed payments (Smart Retries)
- Stripe sends dunning emails automatically
- After ~3 weeks of failures, subscription is canceled
- Webhook fires → plan reverts to Free

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User completes checkout in multiple tabs | Webhook handler is idempotent; duplicate events are ignored |
| User already has stripeCustomerId | Reuse existing customer; don't create new one |
| Webhook arrives before redirect | Plan displayed from URL query param; database updates async |
| User refreshes success page | Success message shows only once (clear URL param) |
| Canceled user tries to resubscribe | Reuse existing customer; create new subscription |

---

## Out of Scope (MVP)

- Annual billing plans
- Team member invitations
- Usage-based overage billing
- Account deletion (and associated subscription cleanup)
- Custom enterprise plans
- Coupons/discount codes
- Multiple subscriptions per user

---

## Future Considerations

1. **Annual Plans:** Add 10-20% discount for annual billing
2. **Team Features:** Invite team members to share dashboard access
3. **Usage Alerts:** Email notifications at 80%, 90%, 100% quota
4. **Account Deletion:** Cancel subscription when user deletes account
5. **Upgrade Prompts:** In-app notifications for quota warnings
