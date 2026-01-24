# TODOs — Tally Analytics

## 🔴 Bugs

### Dependency Audit: `lodash` Prototype Pollution (moderate)
`pnpm audit --prod` reports `lodash@4.17.21` (via `recharts`) is vulnerable. Consider bumping `recharts` and/or adding a pnpm override to force `lodash>=4.17.23`.

**Priority:** Medium — not blocking, but should be cleaned up before launch

### Auto-Generated PRs: Export/Import Naming Mismatch
The GitHub template generation exports `TallyAnalytics` but the generated import statement references `FastPrAnalytics`, causing build failures.

**Likely locations:**
- `apps/web/lib/github/templates/` — template generation code
- Wherever PR content is assembled

**Symptoms:**
- Build fails on generated PR code
- Manual fix required to change import name

**Priority:** High — breaks generated PRs

---

## 🟠 Revenue & Monetization

### Stripe Payment Integration
Stripe billing is implemented; run these manual verifications before launch.

**Manual verification checklist (ranked):**
1. [ ] Reconcile forbidden (security): User B calling `/api/stripe/reconcile` with User A’s `checkout_session_id` returns `403`.
2. [ ] Multi-subscription prevention: paid user re-submitting `/api/stripe/checkout` returns `409` + `manageUrl` (or redirects to portal).
3. [ ] Unknown price id safety: wrong `STRIPE_PRICE_*` does not downgrade user to `free` after a real `customer.subscription.updated`.
4. [ ] Webhook secret rotation: restart `stripe listen` (new `whsec_...`), update `STRIPE_WEBHOOK_SECRET`, restart dev server; no signature failures.
5. [ ] `/pricing` wiring: logged-out CTAs go to GitHub install; logged-in free → checkout; logged-in paid → portal.
6. [ ] QuotaDisplay wiring: paid users never see “Upgrade plan”; free users do.

---

## 🟡 Product Polish

### GitHub OAuth — Phase 4 Cleanup
Complete Phase 4 from `features/github_oauth/EXECUTION_PLAN.md` (remove magic link auth + drop `magic_links` table).

**Includes:**
- Delete magic link routes + libraries + related unit tests
- Add migration to drop `magic_links` table
- Update Playwright E2E auth flow to use `POST /api/auth/e2e-login`

---

### Landing Page: Hero Secondary Link → "How it works"
Change the hero secondary link to scroll to the "How it works" section.

**Likely location:** `apps/web/components/marketing/hero.tsx`

---

### Landing Page: CTA Audit
Audit all CTAs on the main landing page for consistency (copy, destination, logged-in vs logged-out behavior).

**Likely locations:**
- `apps/web/components/marketing/navbar.tsx`
- `apps/web/components/marketing/hero.tsx`
- `apps/web/app/(marketing)/page.tsx`

---

### Docs Section Formatting
Improve formatting for the docs section (layout/typography/scanability).

**Likely locations:**
- `apps/web/app/(marketing)/docs/setup/page.tsx`
- Any landing-page docs section component (if separate)

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

### Deeply investigate which metrics the app implements

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
- [x] SDK package rename — now `@tally-analytics/sdk`
- [x] Fix "no cookies" claim — updated to "no consent banner needed"
- [x] OG meta tags — added openGraph and twitter metadata
- [x] Footer links — added `/privacy`, `/terms`, support link
- [x] SDK docs expanded — Pages Router, DNT, identify(), troubleshooting
- [x] How it Works section — 4-step visual flow
- [x] Feature icons — already existed
- [x] Vercel Web Analytics — integrated in layout
- [x] Comparison page research — saved to `design/comparison-page-research.md`
- [x] OG Image PNG — exists at `apps/web/public/og-image.png`
- [x] Logged-in marketing nav — navbar shows "Dashboard" when session cookie exists
- [x] GitHub Templates — updated to Tally branding (`tally-analytics.tsx`, `tally_sid`, `TallyAnalytics`)
- [x] Footer Support Link — updated to `mailto:support@usetally.xyz`
- [x] Quota Upgrade CTA — inline upgrade button shown at 80%+ and over quota states
- [x] Fix top_pages.pipe & top_referrers.pipe SQL errors — wrapped CROSS JOIN scalar in `any()` aggregate

---

## Reference Links

- Marketing chat: https://claude.ai/chat/f26fbdc8-cf3e-49c5-a62b-f527048c2634
- Stripe docs: https://stripe.com/docs/billing/quickstart
- GitHub App: https://github.com/apps/tally-analytics-agent
