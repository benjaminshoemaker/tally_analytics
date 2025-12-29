# TODOs — Tally Analytics

## 🔴 Pre-Launch Critical

### OG Image PNG
The root layout metadata references `/og-image.png` but the file doesn't exist in `apps/web/public/`.

**Action:** Convert `branding/og-image.svg` to 1200×630 PNG and save to `apps/web/public/og-image.png`

```bash
# Using Inkscape
inkscape branding/og-image.svg -w 1200 -h 630 -o apps/web/public/og-image.png

# Or ImageMagick
convert -background white -size 1200x630 branding/og-image.svg apps/web/public/og-image.png
```

---

### GitHub Templates — Update Branding
The PR generation templates still use old "fast-pr-analytics" branding.

**Files:**
- `apps/web/lib/github/templates/app-router.ts`
- `apps/web/lib/github/templates/pages-router.ts`

**Changes needed:**
- Generated file: `components/fast-pr-analytics.tsx` → `components/tally-analytics.tsx`
- Cookie name: `fast_pr_analytics_sid` → `tally_sid`
- Component name: `FastPrAnalytics` → `TallyAnalytics`
- Hook name: `useFastPrAnalytics` → `useTallyAnalytics`

---

### Footer Support Link — Fix Placeholder
In `apps/web/components/marketing/footer.tsx`, the support link points to:
`https://github.com/your-org/tally-analytics/issues`

**Action:** Update to actual repo URL or change to `mailto:support@usetally.xyz`

---

## 🟠 Revenue & Monetization

### Stripe Payment Integration
No payment system exists. Users cannot upgrade from Free → Pro → Team.

**Steps:**
1. Create Stripe account, add products (Free $0, Pro $9/mo, Team $29/mo)
2. Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Install: `pnpm -C apps/web add stripe @stripe/stripe-js`
4. Create API routes:
   - `POST /api/stripe/checkout` — create Checkout session
   - `POST /api/stripe/portal` — create Billing Portal session
   - `POST /api/webhooks/stripe` — handle subscription events
5. Database already has `users.plan` and `users.stripeCustomerId` columns

---

### Quota Upgrade CTA
In `apps/web/components/dashboard/quota-display.tsx`, add "Upgrade Plan" button when over quota or at 80%+.

**Depends on:** Stripe integration

---

## 🟡 Product Polish

### Sessions Page — Period-over-Period Change
In `apps/web/app/(dashboard)/projects/[id]/sessions/page.tsx`, all StatCard components have hardcoded `change={0}`.

**Action:** 
1. Update sessions API to calculate previous period comparison
2. Return `totalSessionsChange`, `newVisitorsChange`, `returningVisitorsChange`
3. Use actual change values in StatCards

---

### Demo Page
Create `/demo` route with static sample data so visitors can preview the dashboard without signing up.

**Location:** `apps/web/app/(marketing)/demo/page.tsx`

**Contents:**
- Fake 7-day analytics data
- Sample top pages, referrers
- Banner: "This is demo data. Connect your repo for real analytics."
- CTA to install GitHub App

---

### Social Proof Section
Add testimonials/logos section to marketing landing page.

**Location:** `apps/web/components/marketing/social-proof.tsx`

**Note:** Requires real user testimonials — defer until post-launch

---

## 🔵 Feature Enhancements

### Re-run Detection on Repo Changes
Add "Re-run analysis" action so fixing a repo doesn't require uninstall/reinstall.

Options:
- Manual "Re-run" button in dashboard
- Auto re-run when repo contents change (via push webhook)

---

### Poll for Updates / Auto-PR
Detect when tracked routes change and automatically create new PRs to update analytics integration.

**Complexity:** High — requires comparing file hashes, detecting meaningful changes

---

### Comparison Pages
Create SEO-optimized `/vs/[competitor]` pages based on research in `design/comparison-page-research.md`.

Suggested first pages:
- `/vs/google-analytics`
- `/vs/plausible`
- `/vs/posthog`

---

## ⚪ Monitoring & Alerting (Deferred)

### Vercel Speed Insights
Docs: https://vercel.com/docs/speed-insights/quickstart

1. Enable in Vercel Dashboard → Speed Insights tab
2. Install: `pnpm -C apps/web add @vercel/speed-insights`
3. Add to layout: `<SpeedInsights />`

---

### Vercel Alerts
Docs: https://vercel.com/docs/alerts

1. Vercel Dashboard → Observability → Alerts
2. Subscribe to error anomaly alerts
3. Configure Slack/email delivery

---

### Neon Database Alerts
Docs: https://neon.tech/docs/guides/datadog

Options:
- Datadog integration for connection saturation alerts
- OpenTelemetry for custom metrics

---

### Tinybird Monitoring
Docs: https://www.tinybird.co/docs/forward/monitoring/service-datasources

1. Monitor `tinybird.datasources_ops_log` for ingestion failures
2. Monitor `tinybird.pipe_stats_rt` for query errors
3. Create health-check endpoints, alert externally on threshold breach

---

## ✅ Completed

- [x] SDK Events URL — updated to `https://events.usetally.xyz/v1/track`
- [x] Logged-in marketing nav — shows "Dashboard" when session cookie exists
- [x] SDK package rename — now `@tally-analytics/sdk`
- [x] Fix "no cookies" claim — updated to "no consent banner needed"
- [x] OG meta tags — added openGraph and twitter metadata
- [x] Footer links — added `/privacy`, `/terms`, support link
- [x] SDK docs expanded — Pages Router, DNT, identify(), troubleshooting
- [x] How it Works section — 4-step visual flow
- [x] Feature icons — already existed
- [x] Vercel Web Analytics — integrated in layout
- [x] Comparison page research — saved to `design/comparison-page-research.md`

---

## Reference Links

- Marketing chat: https://claude.ai/chat/f26fbdc8-cf3e-49c5-a62b-f527048c2634
- Stripe docs: https://stripe.com/docs/billing/quickstart
- GitHub App: https://github.com/apps/tally-analytics-agent
