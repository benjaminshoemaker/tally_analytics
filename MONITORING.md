# Monitoring & Alerting (MVP)

This project is designed to run on Vercel with Neon (Postgres) and Tinybird.

## Vercel Analytics

- Enable **Vercel Web Analytics** for `usetally.xyz` (marketing + dashboard).
- Enable **Vercel Speed Insights** (optional but recommended).

## Error Tracking

MVP default: use Vercel’s built-in logs + error views.

Suggested follow-ups:
- Add Sentry (or similar) if you need full stack traces and alert routing.

## Alerts (Recommended)

Set alerts in the relevant provider dashboards:

- **Vercel**
  - High error rate (target: > 1% 5xx over 5–10 minutes)
  - Webhook handler latency spikes (target: > 30s average)
- **Neon**
  - Connection pool saturation (target: > 80% utilization)
  - Slow queries / timeouts
- **Tinybird**
  - Ingestion failures (non-2xx from `/v0/events`)
  - Query error rate spikes

## Key Metrics To Watch

From `TECHNICAL_SPEC.md` (Section 11):
- GitHub App installs / PRs generated / PRs merged
- Event ingestion rate
- API error rate
- Webhook processing time
- Database connection utilization

