# Feature Spec: GitHub OAuth Authentication

> Replace magic link authentication with GitHub OAuth to fix the broken onboarding flow and align authentication with Tally's GitHub-centric product model.

## Problem Statement

Tally's current authentication uses magic links (email-based), but the product is fundamentally GitHub-centric — users install a GitHub App to connect repositories. This mismatch causes a critical bug:

**The Bug:** When a user installs the GitHub App, GitHub redirects to a callback URL. The callback requires an authenticated session to link the installation to a user. If the user isn't logged in (common for new users), the callback fails silently, and webhooks can never create projects for that installation.

**Root Cause:** Magic link auth and GitHub App installation are independent flows with no guaranteed sequencing. Users can (and do) install the App before logging in.

**The Fix:** Use GitHub OAuth for authentication. Users authenticate with GitHub first, guaranteeing a session exists before they ever reach the App installation flow.

## User Stories

1. **As a new user**, I can sign in with my GitHub account so that I'm authenticated before installing the GitHub App.
2. **As a returning user**, I can sign in with GitHub to access my dashboard without waiting for an email.
3. **As a user**, I see my GitHub identity (avatar, username) in the app so I know which account I'm using.

## Core User Experience

### New User Flow

```
1. User lands on usetally.xyz
2. Clicks "Sign in with GitHub" (hero CTA or navbar)
3. Redirected to GitHub OAuth consent screen
   - Scopes requested: read:user, user:email
4. User authorizes Tally
5. Redirected back to /api/auth/github/callback
6. Tally creates user record (github_user_id, username, email, avatar_url)
7. Session created, cookie set
8. Redirected to /projects (empty state)
9. User clicks "Install GitHub App"
10. GitHub App installation flow (existing) — callback now succeeds because session exists
11. Webhooks fire, projects appear
```

### Returning User Flow

```
1. User visits usetally.xyz/login (or clicks "Sign in")
2. Clicks "Sign in with GitHub"
3. GitHub recognizes existing authorization, minimal consent (or auto-redirect)
4. Callback finds existing user by github_user_id
5. Session created, redirected to /projects
```

### Error Flows

| Scenario | Behavior |
|----------|----------|
| User cancels OAuth on GitHub | Redirect to `/login?error=oauth_cancelled` with message |
| GitHub API error | Redirect to `/login?error=github_error` with message |
| User is already logged in and visits /login | Redirect to /projects |

## Data Model Changes

### Users Table — Modifications

```sql
-- Add columns
ALTER TABLE users ADD COLUMN github_user_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN github_username VARCHAR(39); -- GitHub max is 39 chars
ALTER TABLE users ADD COLUMN github_avatar_url TEXT;

-- email column already exists, will be populated from GitHub
-- created_at, updated_at unchanged
```

### Migration: Link Existing Users

```sql
-- One-time migration to link existing users to GitHub accounts
UPDATE users SET github_user_id = 8659979, github_username = 'emriedel' 
  WHERE email = (SELECT email FROM users WHERE id = '<emriedel-user-uuid>');

UPDATE users SET github_user_id = 224462439, github_username = 'benjaminshoemaker' 
  WHERE email = (SELECT email FROM users WHERE id = '<benjaminshoemaker-user-uuid>');

-- After confirming both users can log in via GitHub:
DROP TABLE magic_links;
```

### Tables to Delete

- `magic_links` — no longer needed after migration

### Tables Unchanged

- `sessions` — still used (session-based auth continues)
- `github_tokens` — still used for GitHub App installation tokens
- `projects` — unchanged

## API Routes

### New Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/github` | GET | Redirect to GitHub OAuth |
| `/api/auth/github/callback` | GET | Handle OAuth callback, create/find user, create session |

### Routes to Delete

| Route | Reason |
|-------|--------|
| `/api/auth/magic-link` | Replaced by GitHub OAuth |
| `/api/auth/verify` | Replaced by GitHub OAuth callback |

### Routes Unchanged

| Route | Reason |
|-------|--------|
| `/api/auth/logout` | Still needed |
| `/api/github/callback` | Still needed for GitHub App installation |
| `/api/webhooks/github` | Still needed for webhooks |

## OAuth Implementation Details

### GitHub OAuth Configuration

```
Authorization URL: https://github.com/login/oauth/authorize
Token URL: https://github.com/login/oauth/access_token
Scopes: read:user, user:email
```

### Environment Variables (New)

```
GITHUB_OAUTH_CLIENT_ID=xxx
GITHUB_OAUTH_CLIENT_SECRET=xxx
```

Note: These are different from the GitHub App credentials (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, etc.) which remain unchanged.

### Callback Flow

```
1. Receive ?code= from GitHub
2. Exchange code for access_token (POST /login/oauth/access_token)
3. Fetch user info (GET /user with token)
4. Fetch user emails (GET /user/emails with token) — get primary verified email
5. Find or create user:
   - SELECT * FROM users WHERE github_user_id = {id}
   - If not found: INSERT new user
   - If found: UPDATE github_username, github_avatar_url, email (in case changed)
6. Create session (existing createSession function)
7. Set session cookie (existing buildSessionCookie function)
8. Redirect to /projects
```

### Token Storage

We do **not** store the GitHub OAuth access token long-term. It's only used during the callback to fetch user info. The GitHub App installation tokens (in `github_tokens` table) remain the mechanism for API access to repositories.

## UI Changes

### Login Page (`/app/login/page.tsx`)

**Before:**
- Email input field
- "Send magic link" button
- "Don't have an account? Install the GitHub App" link

**After:**
- "Sign in with GitHub" button (primary CTA)
- GitHub logo icon
- Error message display (for OAuth failures)
- No email input

### Dashboard Header (`/components/dashboard/header.tsx`)

**Before:**
- Logo (mobile)
- Logout button

**After:**
- Logo (mobile)
- User info: Avatar (32px circle) + dropdown
  - Dropdown shows: username, "Log out" option
- Avatar fetched from `github_avatar_url` on user record

### Marketing Pages — CTA Updates

Update all "Install GitHub App" CTAs to route through authentication first:

| Page | Current CTA | New CTA | New Href |
|------|-------------|---------|----------|
| Landing (`/`) | "Install GitHub App" | "Sign in with GitHub" | `/api/auth/github` |
| Pricing (`/pricing`) | "Get Started" | "Sign in with GitHub" | `/api/auth/github` |
| Docs (`/docs/setup`) | "Install GitHub App" | "Sign in with GitHub" | `/api/auth/github` |
| Navbar | "Get Started" | "Sign in with GitHub" | `/api/auth/github` |

The `/projects` empty state **keeps** its "Install GitHub App" CTA pointing to `github.com/apps/tally-analytics-agent` because at that point the user is already authenticated.

### Projects Empty State (Unchanged)

The empty state in `/projects` continues to show "Install GitHub App" linking to GitHub. This is correct — the user is authenticated, so the App callback will work.

## Security Considerations

### OAuth State Parameter

The `/api/auth/github` route must generate a random `state` parameter, store it in a short-lived cookie, and verify it in the callback. This prevents CSRF attacks.

```
1. GET /api/auth/github
   - Generate random state (e.g., 32-byte hex)
   - Set cookie: oauth_state={state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600
   - Redirect to GitHub with state={state}

2. GET /api/auth/github/callback?code=xxx&state=yyy
   - Read oauth_state cookie
   - Verify state param matches cookie
   - Delete oauth_state cookie
   - Continue with token exchange
```

### Scope Minimization

Only request scopes we need:
- `read:user` — get user profile (id, username, avatar)
- `user:email` — get verified email address

We do NOT request `repo` scope — repository access comes through the GitHub App installation, not OAuth.

## Out of Scope

The following are explicitly **not** part of this feature:

- Changes to GitHub App installation flow
- Changes to webhook handling
- Changes to PR generation
- In-app repository picker (future consideration)
- Multiple GitHub account support
- Team/organization features
- Magic link fallback (removing entirely)

## Test Scenarios

### Authentication

1. **New user OAuth flow** — User with no Tally account signs in, user record created
2. **Returning user OAuth flow** — Existing user signs in, session created
3. **OAuth cancellation** — User cancels on GitHub, redirected with error
4. **Invalid state parameter** — Reject callback, redirect with error
5. **GitHub API failure** — Handle gracefully, redirect with error

### Session Management

6. **Session persists** — User can navigate dashboard after login
7. **Logout clears session** — User redirected to login, can't access dashboard
8. **Expired session** — User redirected to login on next request

### UI

9. **Login page shows GitHub button** — No email input
10. **Header shows avatar and username** — Dropdown with logout
11. **Marketing CTAs link to auth** — Not directly to GitHub App

### Migration

12. **Existing users can log in** — After migration, both users authenticate successfully
13. **Magic links table dropped** — No orphaned data

## Rollout Plan

### Phase 1: Prepare

1. Create GitHub OAuth App in GitHub settings (separate from existing GitHub App)
2. Add environment variables to production
3. Write database migration (add columns, don't run yet)

### Phase 2: Deploy

4. Deploy new code with GitHub OAuth routes
5. Run migration to add columns and link existing users
6. Verify both existing users can log in via GitHub

### Phase 3: Cleanup

7. Run migration to drop `magic_links` table
8. Remove magic link code (routes, lib functions)
9. Update documentation if any references magic links

## Open Questions

None — ready for technical specification.

## Appendix: Existing User Data

| Email | GitHub Username | GitHub User ID |
|-------|-----------------|----------------|
| (emriedel's email) | emriedel | 8659979 |
| (benjaminshoemaker's email) | benjaminshoemaker | 224462439 |

UUIDs to be looked up from production database when running migration.
