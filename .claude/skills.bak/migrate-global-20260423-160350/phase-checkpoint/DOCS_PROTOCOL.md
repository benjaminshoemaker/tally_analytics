# External Tool Documentation Protocol

**CRITICAL:** Before providing verification instructions for external integrations, you MUST read the latest official documentation first.

## When to Fetch Docs

Fetch documentation when ANY of these apply:
- Checkpoint criteria involve verifying external service integration
- Manual verification steps reference third-party dashboards or APIs
- You need to guide users through external service verification (webhooks, API responses, etc.)

## How to Fetch Docs

1. **Identify external services** from checkpoint criteria
2. **Fetch relevant docs** using WebFetch or WebSearch:
   - Focus on testing/verification sections
   - Look for troubleshooting guides for common issues
3. **Cache per session** — Don't re-fetch docs already fetched in this session
4. **Handle failures gracefully:**
   - Retry with exponential backoff (2-3 attempts)
   - If all retries fail: warn user and proceed with best available info

## Documentation URLs by Service

| Service | Verification/Testing Doc |
|---------|-------------------------|
| Supabase | https://supabase.com/docs/guides/getting-started |
| Firebase | https://firebase.google.com/docs/web/setup |
| Stripe | https://stripe.com/docs/testing |
| Auth0 | https://auth0.com/docs/troubleshoot |
| Vercel | https://vercel.com/docs/deployments/overview |
| Resend | https://resend.com/docs/dashboard/emails/logs |

For services not listed, use WebSearch: `{service name} testing verification documentation`

## Integration with Verification

When guiding manual verification of external integrations:
1. Fetch docs FIRST to understand current testing procedures
2. Provide accurate dashboard navigation (UI may have changed)
3. Include expected responses/behaviors from official docs
4. Reference troubleshooting steps for common failures
