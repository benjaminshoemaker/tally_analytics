# Execution Plan: GitHub OAuth Authentication

## Overview

| Metric | Value |
|--------|-------|
| Feature | Replace magic link auth with GitHub OAuth |
| Target Project | Tally Analytics |
| Total Phases | 4 |
| Total Steps | 10 |
| Total Tasks | 21 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `lib/db/schema.ts` | modifies | Add GitHub columns to users table |
| `lib/auth/session.ts` | uses | Reuse existing session creation |
| `lib/auth/cookies.ts` | uses | Reuse existing cookie builder |
| `lib/auth/get-user.ts` | uses | Reuse for session validation |
| `app/(dashboard)/layout.tsx` | modifies | Pass user info to header |
| `components/dashboard/header.tsx` | modifies | Add avatar dropdown |
| `app/login/page.tsx` | replaces | New GitHub OAuth UI |
| `app/(marketing)/*.tsx` | modifies | Update CTAs to auth flow |

## Phase Dependency Graph

```
┌─────────────────────────────────┐
│ Phase 1: Infrastructure         │
│ - Schema migration              │
│ - User linking                  │
│ - OAuth helpers                 │
│ - User queries                  │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Phase 2: OAuth Routes           │
│ - Auth redirect                 │
│ - Auth callback                 │
│ - E2E bypass                    │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Phase 3: UI Updates             │
│ - Login page                    │
│ - Header dropdown               │
│ - Dashboard layout              │
│ - Marketing CTAs                │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ Phase 4: Cleanup                │
│ - Delete magic link code        │
│ - Drop magic_links table        │
│ - Update/remove old tests       │
└─────────────────────────────────┘
```

---

## Phase 1: Infrastructure

**Goal:** Establish database schema, link existing users, and create OAuth helper functions without breaking existing functionality.

**Depends On:** None

### Pre-Phase Setup

Human must complete before starting:

- [ ] Create GitHub OAuth App at https://github.com/settings/developers
  - Application name: `Tally Analytics`
  - Homepage URL: `https://usetally.xyz`
  - Authorization callback URL: `https://usetally.xyz/api/auth/github/callback`
- [ ] Add environment variables to `.env` and production:
  - `GITHUB_OAUTH_CLIENT_ID` — from OAuth App settings
  - `GITHUB_OAUTH_CLIENT_SECRET` — from OAuth App settings
- [ ] Look up existing user UUIDs from production database for the linking script

### Step 1.1: Database Schema

**Depends On:** None

---

#### Task 1.1.A: Create GitHub OAuth Migration

**Description:**  
Create a Drizzle migration that adds GitHub OAuth columns to the users table. This is additive and non-breaking — existing magic link auth continues to work.

**Acceptance Criteria:**
- [ ] Migration file `0003_github_oauth.sql` exists in `drizzle/migrations/`
- [ ] Migration adds `github_user_id BIGINT UNIQUE` column
- [ ] Migration adds `github_username VARCHAR(39)` column
- [ ] Migration adds `github_avatar_url TEXT` column
- [ ] Migration creates index on `github_user_id`
- [ ] Migration runs successfully (`pnpm drizzle-kit push` or generate)
- [ ] Existing tests continue to pass

**Files to Create:**
- `apps/web/drizzle/migrations/0003_github_oauth.sql` — migration file

**Files to Modify:**
- `apps/web/lib/db/schema.ts` — add new columns to users table definition
- `apps/web/drizzle/migrations/meta/_journal.json` — will be auto-updated by drizzle-kit

**Existing Code to Reference:**
- `apps/web/drizzle/migrations/0002_stripe_billing.sql` — follow migration patterns
- `apps/web/lib/db/schema.ts` — follow column definition patterns

**Dependencies:** None

**Spec Reference:** FEATURE_SPEC.md > Data Model Changes

**Requires Browser Verification:** No

---

#### Task 1.1.B: Create User Linking Script

**Description:**  
Create a one-time script to link the two existing users to their GitHub accounts. This script will be run manually after the migration.

**Acceptance Criteria:**
- [ ] Script exists at `apps/web/scripts/link-github-users.ts`
- [ ] Script updates user with GitHub username `emriedel` to have `github_user_id = 8659979`
- [ ] Script updates user with GitHub username `benjaminshoemaker` to have `github_user_id = 224462439`
- [ ] Script logs success/failure for each user
- [ ] Script can be run with `npx tsx apps/web/scripts/link-github-users.ts`
- [ ] Script handles case where user email is not found (logs error, continues)

**Files to Create:**
- `apps/web/scripts/link-github-users.ts` — one-time migration script

**Existing Code to Reference:**
- `apps/web/lib/db/client.ts` — database client import
- `apps/web/lib/db/schema.ts` — users table reference

**Dependencies:** Task 1.1.A (schema must have new columns)

**Spec Reference:** FEATURE_SPEC.md > Migration: Link Existing Users

**Requires Browser Verification:** No

---

### Step 1.2: OAuth Helper Library

**Depends On:** Step 1.1

---

#### Task 1.2.A: Create GitHub OAuth Client Library

**Description:**  
Create a library with helper functions for GitHub OAuth: state generation, URL building, token exchange, and user fetching. This follows existing patterns in `lib/github/app.ts`.

**Acceptance Criteria:**
- [ ] `generateOAuthState()` returns a 64-character hex string
- [ ] `generateOAuthState()` generates unique values on each call
- [ ] `buildGitHubAuthUrl(state)` returns correct GitHub authorization URL with client_id, redirect_uri, scope, and state
- [ ] `exchangeCodeForToken(code)` exchanges authorization code for access token
- [ ] `exchangeCodeForToken(code)` throws on GitHub error response
- [ ] `fetchGitHubUser(token)` returns user object with id, login, avatar_url
- [ ] `fetchGitHubUserEmail(token)` returns primary verified email
- [ ] `fetchGitHubUserEmail(token)` falls back to any verified email if no primary
- [ ] All functions have TypeScript types
- [ ] Unit tests cover all functions with mocked fetch

**Files to Create:**
- `apps/web/lib/auth/github-oauth.ts` — OAuth helper functions
- `apps/web/tests/github-oauth.test.ts` — unit tests

**Existing Code to Reference:**
- `apps/web/lib/github/app.ts` — follow fetch patterns for GitHub API
- `apps/web/lib/env.ts` — follow environment variable access patterns

**Dependencies:** None (can be developed in parallel with 1.1.B)

**Spec Reference:** TECHNICAL_SPEC.md > GitHub OAuth Helper Functions

**Requires Browser Verification:** No

---

#### Task 1.2.B: Create User Database Queries

**Description:**  
Create query functions for finding and creating users by GitHub ID. This separates user queries from the existing auth code.

**Acceptance Criteria:**
- [ ] `findOrCreateUserByGitHub()` finds existing user by `github_user_id`
- [ ] `findOrCreateUserByGitHub()` updates username/avatar/email if user exists
- [ ] `findOrCreateUserByGitHub()` creates new user if not found
- [ ] `findOrCreateUserByGitHub()` returns user id
- [ ] `getUserById()` returns user with id, email, githubUsername, githubAvatarUrl
- [ ] `getUserById()` returns null if user not found
- [ ] Unit tests cover find, create, and update scenarios

**Files to Create:**
- `apps/web/lib/db/queries/users.ts` — user query functions
- `apps/web/tests/users-queries.test.ts` — unit tests

**Existing Code to Reference:**
- `apps/web/lib/db/queries/github-tokens.ts` — follow query patterns
- `apps/web/lib/db/queries/projects.ts` — follow query patterns

**Dependencies:** Task 1.1.A (schema must have new columns)

**Spec Reference:** TECHNICAL_SPEC.md > User Database Query

**Requires Browser Verification:** No

---

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] All existing tests pass (`pnpm test`)
- [ ] New tests pass
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Migration applies cleanly

**Manual Verification:**
- [ ] Run migration on a test database
- [ ] Run linking script (with test data or real emails)
- [ ] Verify user records have GitHub columns populated
- [ ] Confirm existing magic link login still works (non-breaking)

**Regression Verification:**
- [ ] Existing authentication flow unchanged
- [ ] Dashboard accessible with existing session
- [ ] No errors in existing functionality

---

## Phase 2: OAuth Routes

**Goal:** Create the OAuth redirect and callback routes. Routes are additive — existing auth continues to work.

**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] Verify environment variables are accessible in development
- [ ] Confirm Phase 1 migration and linking script have been run

### Step 2.1: OAuth Endpoints

**Depends On:** None (Phase 1 complete)

---

#### Task 2.1.A: Create OAuth Redirect Route

**Description:**  
Create the route that initiates OAuth by generating state, setting a cookie, and redirecting to GitHub.

**Acceptance Criteria:**
- [ ] `GET /api/auth/github` generates random state
- [ ] `GET /api/auth/github` sets `oauth_state` cookie (HttpOnly, Secure in prod, SameSite=Lax, 10min expiry)
- [ ] `GET /api/auth/github` returns 302 redirect to GitHub authorization URL
- [ ] Redirect URL includes correct client_id, redirect_uri, scope, and state
- [ ] Unit tests verify state generation and redirect

**Files to Create:**
- `apps/web/app/api/auth/github/route.ts` — OAuth initiation route
- `apps/web/tests/github-oauth-redirect.test.ts` — unit tests

**Existing Code to Reference:**
- `apps/web/app/api/auth/magic-link/route.ts` — follow route patterns
- `apps/web/lib/auth/cookies.ts` — follow cookie patterns

**Dependencies:** Task 1.2.A (OAuth helper library)

**Spec Reference:** TECHNICAL_SPEC.md > GET /api/auth/github

**Requires Browser Verification:** No

---

#### Task 2.1.B: Create OAuth Callback Route

**Description:**  
Create the route that handles GitHub's callback: verify state, exchange code for token, fetch user, create/find Tally user, establish session.

**Acceptance Criteria:**
- [ ] `GET /api/auth/github/callback` with `error=access_denied` redirects to `/login?error=oauth_cancelled`
- [ ] Missing code or state redirects to `/login?error=invalid_state`
- [ ] State mismatch (cookie vs param) redirects to `/login?error=invalid_state`
- [ ] Successful flow exchanges code for token
- [ ] Successful flow fetches GitHub user and email
- [ ] Successful flow calls `findOrCreateUserByGitHub`
- [ ] Successful flow creates session using existing `createSession`
- [ ] Successful flow sets session cookie using existing `buildSessionCookie`
- [ ] Successful flow clears `oauth_state` cookie
- [ ] Successful flow redirects to `/projects`
- [ ] GitHub API errors redirect to `/login?error=github_error`
- [ ] Unit tests cover success and all error paths

**Files to Create:**
- `apps/web/app/api/auth/github/callback/route.ts` — OAuth callback route
- `apps/web/tests/github-oauth-callback.test.ts` — unit tests

**Existing Code to Reference:**
- `apps/web/app/api/auth/verify/route.ts` — follow session creation pattern
- `apps/web/lib/auth/session.ts` — use createSession
- `apps/web/lib/auth/cookies.ts` — use buildSessionCookie

**Dependencies:** Task 1.2.A (OAuth helpers), Task 1.2.B (user queries), Task 2.1.A (state cookie pattern)

**Spec Reference:** TECHNICAL_SPEC.md > GET /api/auth/github/callback

**Requires Browser Verification:** No

---

### Step 2.2: E2E Test Support

**Depends On:** Step 2.1

---

#### Task 2.2.A: Create E2E Login Bypass Route

**Description:**  
Create a test-only route that creates a session directly, bypassing OAuth. This enables E2E tests to authenticate without hitting GitHub.

**Acceptance Criteria:**
- [ ] `POST /api/auth/e2e-login` creates session for provided userId
- [ ] Route returns 404 if `E2E_TEST_MODE !== "1"`
- [ ] Route returns 404 in production (`NODE_ENV === "production"`)
- [ ] Route sets session cookie on success
- [ ] Route returns `{ success: true }` on success
- [ ] Unit tests verify guard conditions

**Files to Create:**
- `apps/web/app/api/auth/e2e-login/route.ts` — test-only login route
- `apps/web/tests/e2e-login.test.ts` — unit tests

**Existing Code to Reference:**
- `apps/web/app/api/auth/magic-link/route.ts` lines 37-39 — follow E2E_TEST_MODE pattern
- `apps/web/lib/auth/session.ts` — use createSession

**Dependencies:** Step 2.1 (OAuth routes for pattern reference)

**Spec Reference:** TECHNICAL_SPEC.md > E2E Test Bypass

**Requires Browser Verification:** No

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] All tests pass (existing + new)
- [ ] Type checking passes
- [ ] Linting passes

**Manual Verification:**
- [ ] Visit `/api/auth/github` — redirects to GitHub
- [ ] Complete OAuth flow — redirected to `/projects` with session
- [ ] Check database — user record has GitHub fields populated
- [ ] Log out, log back in via OAuth — works
- [ ] Cancel on GitHub — redirected to `/login?error=oauth_cancelled`

**Regression Verification:**
- [ ] Magic link login still works
- [ ] Existing sessions still valid
- [ ] GitHub App installation callback still works

---

## Phase 3: UI Updates

**Goal:** Replace magic link UI with GitHub OAuth UI. This is the breaking change — after this phase, magic links are no longer the primary auth.

**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] Verify OAuth flow works end-to-end (Phase 2 checkpoint passed)
- [ ] Notify existing users (if needed) about login change

### Step 3.1: Login Page

**Depends On:** None (Phase 2 complete)

---

#### Task 3.1.A: Rebuild Login Page for GitHub OAuth

**Description:**  
Replace the magic link login form with a "Sign in with GitHub" button. Handle OAuth error states from query params.

**Acceptance Criteria:**
- [ ] Login page displays "Sign in with GitHub" button
- [ ] Button links to `/api/auth/github`
- [ ] GitHub logo icon displayed on button
- [ ] Error message displayed for `?error=oauth_cancelled`
- [ ] Error message displayed for `?error=invalid_state`
- [ ] Error message displayed for `?error=github_error`
- [ ] Page includes links to Terms and Privacy Policy
- [ ] No email input field
- [ ] No magic link references
- [ ] Visual design matches existing warm/brand color scheme
- [ ] Unit tests verify error message display

**Files to Modify:**
- `apps/web/app/login/page.tsx` — complete rewrite

**Files to Create:**
- `apps/web/tests/login-page-oauth.test.ts` — new tests for OAuth login page

**Existing Code to Reference:**
- `apps/web/app/login/page.tsx` — reuse LogoMark component, styling patterns
- `apps/web/app/(dashboard)/projects/page.tsx` lines 70-73 — GitHub icon SVG

**Dependencies:** Phase 2 complete (OAuth routes exist)

**Spec Reference:** TECHNICAL_SPEC.md > Login Page

**Requires Browser Verification:** Yes
- Verify "Sign in with GitHub" button appears
- Verify button triggers OAuth flow
- Verify error messages display correctly

---

### Step 3.2: Dashboard Header

**Depends On:** Step 3.1

---

#### Task 3.2.A: Create User Dropdown Component

**Description:**  
Create a dropdown component that shows the user's GitHub avatar and username, with a logout option. Includes click-outside-to-close behavior.

**Acceptance Criteria:**
- [ ] Dropdown shows avatar (32px circle) or initial if no avatar
- [ ] Clicking avatar/button toggles dropdown open/closed
- [ ] Dropdown shows username
- [ ] Dropdown shows "Log out" option that submits to `/api/auth/logout`
- [ ] Clicking outside dropdown closes it
- [ ] Pressing Escape closes dropdown
- [ ] Chevron icon rotates when open
- [ ] Unit tests verify open/close behavior

**Files to Create:**
- `apps/web/components/dashboard/user-dropdown.tsx` — dropdown component
- `apps/web/tests/user-dropdown.test.ts` — unit tests

**Existing Code to Reference:**
- `apps/web/components/dashboard/header.tsx` — styling patterns
- `apps/web/app/login/page.tsx` — button styling patterns

**Dependencies:** None (component is standalone)

**Spec Reference:** TECHNICAL_SPEC.md > Dashboard Header with Dropdown

**Requires Browser Verification:** Yes
- Verify avatar displays correctly
- Verify dropdown opens/closes
- Verify logout works

---

#### Task 3.2.B: Update Dashboard Header

**Description:**  
Integrate the user dropdown into the dashboard header, accepting user info as a prop.

**Acceptance Criteria:**
- [ ] Header accepts optional `user` prop with `username` and `avatarUrl`
- [ ] When user prop provided, displays UserDropdown instead of plain logout button
- [ ] When user prop not provided, falls back to simple logout button
- [ ] Existing header layout preserved (logo, spacing)
- [ ] Unit tests verify conditional rendering

**Files to Modify:**
- `apps/web/components/dashboard/header.tsx` — add user prop and dropdown

**Existing Code to Reference:**
- `apps/web/components/dashboard/header.tsx` — current implementation

**Dependencies:** Task 3.2.A (UserDropdown component)

**Spec Reference:** TECHNICAL_SPEC.md > Dashboard Header with Dropdown

**Requires Browser Verification:** Yes
- Verify header displays user info in dashboard

---

#### Task 3.2.C: Update Dashboard Layout to Pass User Info

**Description:**  
Modify the dashboard layout to fetch the current user's GitHub info and pass it to the header component.

**Acceptance Criteria:**
- [ ] Layout fetches user from session using existing `getUserFromSession`
- [ ] Layout fetches full user record using `getUserById`
- [ ] Layout passes `{ username, avatarUrl }` to DashboardHeader
- [ ] Username falls back to email if githubUsername is null
- [ ] Layout handles missing user gracefully (redirect to login)
- [ ] Existing layout structure preserved
- [ ] Unit tests verify user info passing

**Files to Modify:**
- `apps/web/app/(dashboard)/layout.tsx` — fetch and pass user info

**Existing Code to Reference:**
- `apps/web/lib/auth/get-user.ts` — getUserFromSession
- `apps/web/lib/db/queries/users.ts` — getUserById (created in Phase 1)

**Dependencies:** Task 3.2.B (header accepts user prop), Task 1.2.B (getUserById exists)

**Spec Reference:** TECHNICAL_SPEC.md > Dashboard Layout Update

**Requires Browser Verification:** Yes
- Verify avatar and username display in dashboard header

---

### Step 3.3: Marketing CTAs

**Depends On:** Step 3.1

---

#### Task 3.3.A: Update Marketing Page CTAs

**Description:**  
Change all "Install GitHub App" CTAs on marketing pages to "Sign in with GitHub" linking to the OAuth flow. The `/projects` empty state keeps its current CTA.

**Acceptance Criteria:**
- [ ] Landing page (`/`) CTA links to `/api/auth/github`
- [ ] Landing page CTA text is "Sign in with GitHub"
- [ ] Pricing page (`/pricing`) CTA links to `/api/auth/github`
- [ ] Docs setup page (`/docs/setup`) CTA links to `/api/auth/github`
- [ ] Marketing layout navbar CTA links to `/api/auth/github`
- [ ] Projects empty state (`/projects`) KEEPS link to GitHub App install
- [ ] Login page "Install GitHub App" link removed (already handled in 3.1.A)
- [ ] Unit tests verify CTA hrefs

**Files to Modify:**
- `apps/web/app/(marketing)/page.tsx` — update INSTALL_URL and CTA text
- `apps/web/app/(marketing)/pricing/page.tsx` — update INSTALL_URL and CTA text
- `apps/web/app/(marketing)/docs/setup/page.tsx` — update INSTALL_URL and CTA text
- `apps/web/app/(marketing)/layout.tsx` — update INSTALL_URL and CTA text

**Existing Code to Reference:**
- Each file's current INSTALL_URL constant — understand usage patterns

**Dependencies:** Step 3.1 (login page complete)

**Spec Reference:** FEATURE_SPEC.md > Marketing Pages — CTA Updates

**Requires Browser Verification:** Yes
- Verify all CTAs link to `/api/auth/github`
- Verify CTA text updated
- Verify projects empty state still links to GitHub App

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes

**Manual Verification:**
- [ ] Visit login page — shows "Sign in with GitHub" button
- [ ] Complete OAuth flow from login page — lands on projects
- [ ] Dashboard header shows avatar and username
- [ ] Dropdown logout works
- [ ] All marketing CTAs trigger OAuth flow
- [ ] Projects empty state still shows "Install GitHub App"

**Browser Verification:**
- [ ] No console errors on login page
- [ ] No console errors on dashboard
- [ ] Responsive design works on mobile

**Regression Verification:**
- [ ] GitHub App installation still works after OAuth login
- [ ] Webhooks still process correctly
- [ ] Project analytics still load

---

## Phase 4: Cleanup

**Goal:** Remove magic link code and the magic_links table. Final cleanup after confirming OAuth works in production.

**Depends On:** Phase 3 + production verification

### Pre-Phase Setup

- [ ] Both existing users have successfully logged in via GitHub OAuth
- [ ] No errors in production logs related to auth
- [ ] At least 24-48 hours of stable OAuth usage

### Step 4.1: Remove Magic Link Code

**Depends On:** None (Phase 3 complete + production verified)

---

#### Task 4.1.A: Delete Magic Link Routes

**Description:**  
Remove the magic link API routes that are no longer used.

**Acceptance Criteria:**
- [ ] `app/api/auth/magic-link/route.ts` deleted
- [ ] `app/api/auth/verify/route.ts` deleted
- [ ] No imports reference these files
- [ ] App builds successfully
- [ ] Existing tests that reference these routes are removed or updated

**Files to Delete:**
- `apps/web/app/api/auth/magic-link/route.ts`
- `apps/web/app/api/auth/verify/route.ts`

**Tests to Delete:**
- `apps/web/tests/magic-link-api.test.ts`
- `apps/web/tests/verify-api.test.ts`

**Dependencies:** Phase 3 complete, production verified

**Spec Reference:** FEATURE_SPEC.md > Routes to Delete

**Requires Browser Verification:** No

---

#### Task 4.1.B: Delete Magic Link Library Code

**Description:**  
Remove the magic link helper library and email infrastructure.

**Acceptance Criteria:**
- [ ] `lib/auth/magic-link.ts` deleted
- [ ] `lib/email/send.ts` deleted
- [ ] `lib/email/templates.tsx` deleted
- [ ] No imports reference these files
- [ ] App builds successfully

**Files to Delete:**
- `apps/web/lib/auth/magic-link.ts`
- `apps/web/lib/email/send.ts`
- `apps/web/lib/email/templates.tsx`

**Tests to Delete:**
- `apps/web/tests/magic-link.test.ts`
- `apps/web/tests/magic-link-count.test.ts`
- `apps/web/tests/email-send.test.ts`
- `apps/web/tests/email-template.test.ts`

**Dependencies:** Task 4.1.A (routes deleted first)

**Spec Reference:** FEATURE_SPEC.md > Tables to Delete

**Requires Browser Verification:** No

---

#### Task 4.1.C: Remove Old Login Page Test

**Description:**  
Delete the old login page test that tested magic link functionality.

**Acceptance Criteria:**
- [ ] `tests/login-page.test.ts` deleted (replaced by `login-page-oauth.test.ts`)
- [ ] All remaining tests pass

**Files to Delete:**
- `apps/web/tests/login-page.test.ts`

**Dependencies:** Task 3.1.A (new login page tests created)

**Spec Reference:** FEATURE_SPEC.md > Files to Delete

**Requires Browser Verification:** No

---

### Step 4.2: Database Cleanup

**Depends On:** Step 4.1

---

#### Task 4.2.A: Create Magic Links Drop Migration

**Description:**  
Create a migration to drop the magic_links table that is no longer used.

**Acceptance Criteria:**
- [ ] Migration file `0004_drop_magic_links.sql` exists
- [ ] Migration drops `magic_links` table
- [ ] Migration runs successfully

**Files to Create:**
- `apps/web/drizzle/migrations/0004_drop_magic_links.sql`

**Files to Modify:**
- `apps/web/lib/db/schema.ts` — remove magicLinks table definition

**Existing Code to Reference:**
- `apps/web/drizzle/migrations/` — follow migration patterns

**Dependencies:** Step 4.1 (all code references removed)

**Spec Reference:** FEATURE_SPEC.md > Tables to Delete

**Requires Browser Verification:** No

---

### Step 4.3: Update E2E Tests

**Depends On:** Step 4.1

---

#### Task 4.3.A: Update E2E Auth Flow

**Description:**  
Update E2E tests to use the new E2E login bypass instead of magic links.

**Acceptance Criteria:**
- [ ] E2E tests use `POST /api/auth/e2e-login` to authenticate
- [ ] E2E tests no longer reference magic link flow
- [ ] E2E tests pass with new auth method
- [ ] Auth spec tests OAuth login page UI elements

**Files to Modify:**
- `apps/web/e2e/auth.spec.ts` — update to use E2E login bypass
- `apps/web/e2e/dashboard.spec.ts` — update auth setup if needed

**Existing Code to Reference:**
- `apps/web/app/api/auth/e2e-login/route.ts` — E2E bypass route (created in Phase 2)

**Dependencies:** Task 2.2.A (E2E login route exists), Step 4.1 (old routes deleted)

**Spec Reference:** TECHNICAL_SPEC.md > E2E Test Bypass

**Requires Browser Verification:** No

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] E2E tests pass
- [ ] No orphaned imports or references to deleted files

**Manual Verification:**
- [ ] App builds successfully for production
- [ ] Run migration to drop magic_links table
- [ ] Verify database no longer has magic_links table
- [ ] Full end-to-end test of new user signup via OAuth

**Final Verification:**
- [ ] Deploy to production
- [ ] Both existing users can log in
- [ ] New user can sign up via GitHub OAuth
- [ ] GitHub App installation works
- [ ] Analytics dashboard functions correctly

---

## Appendix: File Change Summary

### Files to Create (11)

| Path | Phase |
|------|-------|
| `apps/web/drizzle/migrations/0003_github_oauth.sql` | 1 |
| `apps/web/scripts/link-github-users.ts` | 1 |
| `apps/web/lib/auth/github-oauth.ts` | 1 |
| `apps/web/lib/db/queries/users.ts` | 1 |
| `apps/web/app/api/auth/github/route.ts` | 2 |
| `apps/web/app/api/auth/github/callback/route.ts` | 2 |
| `apps/web/app/api/auth/e2e-login/route.ts` | 2 |
| `apps/web/components/dashboard/user-dropdown.tsx` | 3 |
| `apps/web/drizzle/migrations/0004_drop_magic_links.sql` | 4 |
| `apps/web/tests/*.test.ts` (multiple new test files) | 1-3 |

### Files to Modify (8)

| Path | Phase |
|------|-------|
| `apps/web/lib/db/schema.ts` | 1, 4 |
| `apps/web/app/login/page.tsx` | 3 |
| `apps/web/components/dashboard/header.tsx` | 3 |
| `apps/web/app/(dashboard)/layout.tsx` | 3 |
| `apps/web/app/(marketing)/page.tsx` | 3 |
| `apps/web/app/(marketing)/pricing/page.tsx` | 3 |
| `apps/web/app/(marketing)/docs/setup/page.tsx` | 3 |
| `apps/web/app/(marketing)/layout.tsx` | 3 |

### Files to Delete (12)

| Path | Phase |
|------|-------|
| `apps/web/app/api/auth/magic-link/route.ts` | 4 |
| `apps/web/app/api/auth/verify/route.ts` | 4 |
| `apps/web/lib/auth/magic-link.ts` | 4 |
| `apps/web/lib/email/send.ts` | 4 |
| `apps/web/lib/email/templates.tsx` | 4 |
| `apps/web/tests/magic-link-api.test.ts` | 4 |
| `apps/web/tests/magic-link-count.test.ts` | 4 |
| `apps/web/tests/magic-link.test.ts` | 4 |
| `apps/web/tests/verify-api.test.ts` | 4 |
| `apps/web/tests/email-send.test.ts` | 4 |
| `apps/web/tests/email-template.test.ts` | 4 |
| `apps/web/tests/login-page.test.ts` | 4 |

---

## Appendix: Environment Variables

### New Variables Required

```bash
# GitHub OAuth App (separate from GitHub App)
GITHUB_OAUTH_CLIENT_ID=Ov23li...
GITHUB_OAUTH_CLIENT_SECRET=...
```

### Existing Variables (Unchanged)

```bash
# GitHub App (for repo access, webhooks)
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...

# Database, etc.
DATABASE_URL=...
```
