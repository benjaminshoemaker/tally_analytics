# External Service Documentation Reference

Quick reference for external service documentation URLs and setup patterns.

## Documentation URLs by Service

| Service | Primary Doc URL |
|---------|----------------|
| Supabase | https://supabase.com/docs/guides/getting-started |
| Firebase | https://firebase.google.com/docs/web/setup |
| Stripe | https://stripe.com/docs/development/quickstart |
| Auth0 | https://auth0.com/docs/quickstart |
| Vercel | https://vercel.com/docs/getting-started |
| Netlify | https://docs.netlify.com/get-started/ |
| Clerk | https://clerk.com/docs/quickstarts |
| Resend | https://resend.com/docs/introduction |
| Neon | https://neon.tech/docs/get-started-with-neon |
| PlanetScale | https://planetscale.com/docs |
| Turso | https://docs.turso.tech/quickstart |

For services not listed, use WebSearch: `{service name} official documentation quickstart`

## Common Service Setup Patterns

### Supabase
1. Create project at https://supabase.com/dashboard
2. Get Project URL and anon key from Settings → API
3. Add to `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### Firebase
1. Create project at https://console.firebase.google.com
2. Add web app, get config object
3. Add to `.env`: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc.

### Stripe
1. Sign in at https://dashboard.stripe.com
2. Get test API keys from Developers → API keys
3. Add to `.env`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

### Auth0
1. Create tenant at https://manage.auth0.com
2. Create application (SPA, Regular Web, etc.)
3. Add to `.env`: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`

### Vercel/Netlify
1. Link project via CLI or dashboard
2. Add environment variables in project settings
3. Deploy to get preview URLs

## Auto-Generated Verify Commands

| Item Pattern | Auto-Generated Verify Command |
|--------------|-------------------------------|
| Environment variable `VAR_NAME` | `test -n "$VAR_NAME" && echo "VAR_NAME is set"` |
| Service at `localhost:PORT` | `curl -sf http://localhost:PORT/health || curl -sf http://localhost:PORT` |
| Service at URL | `curl -sf {URL}/health || curl -sf {URL}` |
| File exists `path/to/file` | `test -f path/to/file && echo "File exists"` |
| Directory exists `path/to/dir` | `test -d path/to/dir && echo "Directory exists"` |
| Command available `cmd` | `command -v cmd >/dev/null && echo "cmd available"` |
| Database connection | `{db-cli} -c "SELECT 1" || echo "DB connection failed"` |
