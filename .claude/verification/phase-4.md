# Phase 4 Checkpoint Verification

Timestamp: 2026-01-24T23:47:49Z
Branch: main
Commit: f0d3ca3

## Tool Availability

- ExecuteAutomation Playwright: ✗
- Browser MCP Extension: ✗
- Microsoft Playwright MCP: ✗ (Playwright browsers not installed for MCP)
- Chrome DevTools MCP: ✗ (MCP browser profile already in use)
- code-simplifier: ✗
- Trigger.dev MCP: ✓

## Local Verification

### Automated Checks

- Tests: PASS (`pnpm -C apps/web test`)
- Type Check: PASS (`pnpm typecheck`)
- Lint: PASS (`pnpm lint`) *(warnings: `@next/next/no-img-element`)*
- Build: PASS (`pnpm build`)
- Dev Server: PASS (`pnpm dev`, verified `http://localhost:3000/login`)
  - Evidence: `.claude/verification/devserver-phase4.log`
- Security: PASS (no critical/high); `pnpm audit --audit-level moderate` reports 2 moderates (`esbuild` via `drizzle-kit`, `lodash` via `recharts`)
  - Fix applied: `pnpm.overrides` forces `glob@10.3.10 → 10.5.0` to clear a prior high advisory
- Coverage: PASS (target: 80%)
  - Statements 86.78%, Branches 74.42%, Functions 84.93%
  - Evidence: `apps/web/coverage/coverage-final.json`
- E2E: PASS (`pnpm -C apps/web e2e`)
- Orphaned imports: PASS (no code/test imports of removed magic-link files)
- DB migrate: PASS (`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm -C apps/web db:push`)
- DB verify: PASS (`SELECT to_regclass('public.magic_links')` → `null` on local Docker Postgres)

### Code Quality Metrics

- Commits in phase: 7
- Files changed in phase: 37
- Lines added: 1055
- Lines removed: 1023
- New dependencies: None

### Optional Checks

- Code Simplification: SKIPPED (tool unavailable)
- Browser Verification (local): SKIPPED (no browser criteria in Phase 4)
- Tech Debt Check: SKIPPED

## Manual Verification (Attempted Automation)

Automated Successfully:
- [x] App builds successfully for production (`pnpm build`)
- [x] Run migration to drop magic_links table (`pnpm -C apps/web db:push` with local `DATABASE_URL`)
- [x] Verify database no longer has magic_links table (`SELECT to_regclass('public.magic_links')`)

Truly Manual:
- [ ] Full end-to-end test of new user signup via OAuth

## Production Verification

Pending (requires production deployment + human verification):
- [ ] Deploy to production
- [ ] Both existing users can log in
- [ ] New user can sign up via GitHub OAuth
- [ ] GitHub App installation works
- [ ] Analytics dashboard functions correctly

## Outcome

Local Verification: ✓ PASSED
Overall Checkpoint: ⚠ Manual/production verification required

═══════════════════════════════════════════════════════════════════════════════
MANUAL VERIFICATION: Full end-to-end test of new user signup via OAuth
═══════════════════════════════════════════════════════════════════════════════

## What We're Verifying
That a brand-new user (no existing `users` row) can sign in via GitHub OAuth, a user record is created/linked correctly, a session is established, and the app behaves correctly after login.

## Prerequisites

- [ ] Dev server running at `http://localhost:3000` (start with: `pnpm dev`)
- [ ] `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` set for the environment you’re testing
- [ ] GitHub OAuth App callback URL can reach the environment you’re testing
  - GitHub’s web application flow redirects back to your configured callback URL and validates `state` (see GitHub Docs: “Authorizing OAuth apps”)
  - If testing locally, the OAuth app must allow `http://localhost:3000/api/auth/github/callback` (or use a separate local OAuth app); otherwise GitHub may block with a redirect URI error
- [ ] A fresh GitHub account that has never logged into this app (best: create a dedicated test GitHub user)
- [ ] A private/incognito browser window (to avoid mixing existing GitHub/app sessions)

## Step-by-Step Verification

### Step 1: Start the app and open login
1. Start the dev server from repo root: `pnpm dev`
2. Open: `http://localhost:3000/login`
3. Confirm you see a “Sign in with GitHub” button.

### Step 2: Initiate OAuth
1. Click “Sign in with GitHub”.
2. You should be redirected to GitHub’s OAuth authorize screen (`https://github.com/login/oauth/authorize?...`).
3. Confirm the requested scopes include `read:user` and `user:email`.

### Step 3: Authorize as a new user
1. If prompted, sign into GitHub with your *fresh* GitHub test account.
2. Click “Authorize” for the OAuth app.

### Step 4: Verify callback + app session
1. After authorization, you should land back in the app (typically ending on `http://localhost:3000/projects`).
2. Confirm the header shows the GitHub avatar/username dropdown (i.e., you are logged in).
3. Visit `http://localhost:3000/settings` and confirm you see the user’s email + plan + logout form.

## Expected Results
✓ GitHub redirects back successfully (no redirect URI errors)  
✓ App creates a session and treats the user as authenticated  
✓ User lands on `/projects` (or appropriate post-login route)  
✓ Header shows GitHub identity (username/avatar)  

## How to Confirm Success
The criterion PASSES if:
1. A fresh GitHub account can complete OAuth and reach `/projects` while authenticated
2. The user’s GitHub username/avatar are displayed in the UI
3. Refreshing `/projects` keeps the user logged in (session cookie persists)

## Common Issues & Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| GitHub shows “redirect_uri mismatch” / blocks redirect | OAuth app callback URL doesn’t match the environment being tested | Update OAuth app callback URL to `http://localhost:3000/api/auth/github/callback` (for local), or test against production URL |
| App redirects back to `/login?error=...` | Callback handler error or missing env vars | Check dev server logs; confirm `GITHUB_OAUTH_CLIENT_ID/SECRET` are set |
| “state” mismatch | Cookies not set/sent (SameSite/Domain mismatch) | Verify `NEXT_PUBLIC_APP_URL` and cookie settings; retry in a fresh incognito window |
| User logs in but email is missing/incorrect | GitHub email not verified / API email selection logic | Ensure the GitHub test account has a verified email; confirm `user:email` scope granted |

## If Verification Fails
1. Check the terminal running `pnpm dev` for errors (especially on `/api/auth/github/callback`)
2. Check browser console for client-side errors
3. Re-try in a fresh incognito window
4. If still failing, capture:
   - The final URL (including `?error=...` params)
   - Server error stack trace
   - Screenshot of the GitHub redirect error (if any)

═══════════════════════════════════════════════════════════════════════════════
MANUAL VERIFICATION: Phase 4 Production Verification (Post-Cleanup Deploy)
═══════════════════════════════════════════════════════════════════════════════

## What We're Verifying
After deploying the Phase 4 cleanup (magic link removal + `magic_links` drop migration), production auth and core flows still work: existing users can log in, new users can sign up via GitHub OAuth, GitHub App installation works, and the analytics dashboard functions.

## Prerequisites

- [ ] Production deploy completed (Vercel)
- [ ] Production base URL (expected): `https://usetally.xyz`
- [ ] Access to Vercel project dashboard + deployment logs
- [ ] Two existing GitHub accounts used in production (the previously verified users)
- [ ] One fresh GitHub account for new-user signup verification

## Step-by-Step Verification

### Step 1: Deploy Phase 4 to production (Vercel)
1. In Vercel, open the project dashboard.
2. Confirm the latest production deployment corresponds to the Phase 4 cleanup commit (Project Overview shows the latest production deployment, URL, commit details, and logs).
3. If the cleanup is currently a preview deployment, use the Deployments tab to “Promote to Production” (or redeploy the intended commit/config).
4. Wait for deployment to finish successfully.

### Step 2: Verify existing user login still works
1. Open `https://usetally.xyz/login` in an incognito window.
2. Log in via GitHub OAuth using existing GitHub account #1.
3. Confirm you land on `https://usetally.xyz/projects` and the header shows the GitHub avatar/username.
4. Repeat for existing GitHub account #2.

### Step 3: Verify new user signup works end-to-end
1. In a fresh incognito window (no cookies), open `https://usetally.xyz/login`.
2. Log in via GitHub OAuth with the *fresh* GitHub account.
3. Confirm:
   - You reach `https://usetally.xyz/projects` authenticated
   - The header shows the new user’s GitHub identity

### Step 4: Verify GitHub App installation flow still works
1. From the logged-in state (preferably the fresh account), navigate to `https://usetally.xyz/projects`.
2. If you see the empty state with “Install GitHub App”, click it and complete the installation.
3. Confirm the installation callback completes without error and you can see projects appear (or at least the install flow completes cleanly).

### Step 5: Verify analytics dashboard functions
1. Open any existing project page (e.g., from `https://usetally.xyz/projects`).
2. Confirm `Overview`, `Sessions`, and `Live` pages load without errors.
3. Confirm there are no unexpected 401s/500s and charts/tables render data as expected.

## Expected Results
✓ Production deploy succeeds (no build/runtime failures)  
✓ Existing users can log in via OAuth and reach `/projects`  
✓ A brand-new GitHub user can complete OAuth and is treated as authenticated  
✓ GitHub App installation completes while logged in (original onboarding bug stays fixed)  
✓ Project analytics pages load and render correctly  

## How to Confirm Success
The production verification PASSES if all items in “Final Verification” in `features/github_oauth/EXECUTION_PLAN.md` are true after deployment.

## Common Issues & Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| OAuth callback fails (500) | Missing/mismatched `GITHUB_OAUTH_CLIENT_ID/SECRET` in Vercel env | Fix env vars, redeploy, re-test |
| Users can log in but GitHub App install callback fails | Session not established or cookie misconfiguration | Inspect Vercel logs for `/api/github/callback` errors; verify cookie domain/secure flags |
| Post-deploy DB errors around `magic_links` | Migration not applied / drift between environments | Apply migrations to production DB, confirm `magic_links` is dropped |
| Analytics pages show errors | Unrelated regression | Check server logs for the failing API routes and fix before proceeding |

## If Verification Fails
1. Open Vercel deployment logs and locate the failing request (Project → Deployments → Inspect/Logs)
2. Capture:
   - Deployment URL + deployment ID
   - Exact failing route + timestamp
   - Relevant log lines / stack traces
3. Roll back or redeploy the last known good deployment if needed, then investigate the root cause
