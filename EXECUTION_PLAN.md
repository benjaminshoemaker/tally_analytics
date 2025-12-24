# Execution Plan: Analytics SaaS Platform

## Overview

| Metric | Value |
|--------|-------|
| Total Phases | 6 |
| Total Steps | 24 |
| Total Tasks | 68 |

## Phase Dependency Graph

```
Phase 1 (Foundation) ──► Phase 2 (Analysis Engine) ──► Phase 3 (SDK)
         │                        │                          │
         │                        └──────────┬───────────────┘
         │                                   ▼
         └─────────────────────► Phase 4 (Event Ingestion)
                                            │
                                            ▼
                                   Phase 5 (Dashboard)
                                            │
                                            ▼
                                   Phase 6 (Polish & Launch)
```

---

## Phase 1: Foundation

**Goal:** Set up project infrastructure, authentication, and GitHub App integration.  
**Depends On:** None

### Pre-Phase Setup

Human must complete before starting:
- [x] Create GitHub App in Developer Settings (Permissions: Contents R/W, Pull Requests R/W, Metadata R)
- [x] Create Neon database instance
- [x] Create Tinybird workspace
- [x] Create Resend account and verify domain
- [x] Create Vercel account and project
- [x] Prepare environment variables

### Step 1.1: Project Initialization

**Depends On:** None

---

#### Task 1.1.A: Monorepo Setup

**Description:**  
Initialize the pnpm workspace monorepo with root package.json, workspace configuration, and shared TypeScript/ESLint settings.

**Acceptance Criteria:**
- [x] Root `package.json` exists with workspace scripts
- [x] `pnpm-workspace.yaml` defines `apps/*` and `packages/*`
- [x] Root `tsconfig.base.json` provides shared config
- [x] `.gitignore` excludes node_modules, .env, .next, dist
- [x] `pnpm install` runs successfully from root

**Files to Create:**
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.eslintrc.js`
- `.gitignore`
- `.prettierrc`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 9 (File Structure), Section 5.1 (Dependencies)

---

#### Task 1.1.B: Web App Scaffolding

**Description:**  
Create the Next.js 14 app in `apps/web/` with App Router, TypeScript, and Tailwind CSS.

**Acceptance Criteria:**
- [x] Next.js 14+ app exists in `apps/web/`
- [x] TypeScript configured with path aliases (`@/*`)
- [x] Tailwind CSS configured
- [x] Root layout renders
- [x] `pnpm dev` starts server; `pnpm build` succeeds

**Files to Create:**
- `apps/web/package.json`
- `apps/web/next.config.js`
- `apps/web/tsconfig.json`
- `apps/web/tailwind.config.js`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/globals.css`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 1.2 (Key Components), Section 9 (File Structure)

---

### Step 1.2: Database Layer

**Depends On:** Step 1.1

---

#### Task 1.2.A: Drizzle Schema

**Description:**  
Define Drizzle ORM schema for all tables: users, sessions, magic_links, projects, github_tokens, waitlist.

**Acceptance Criteria:**
- [x] All 6 tables defined with correct types and constraints
- [x] Foreign keys with CASCADE delete
- [x] All indexes from spec defined
- [x] TypeScript types exported

**Files to Create:**
- `apps/web/lib/db/schema.ts`
- `apps/web/types/database.ts`

**Files to Modify:**
- `apps/web/package.json` — Add drizzle-orm, @neondatabase/serverless

**Dependencies:** Task 1.1.B

**Spec Reference:** Section 2.1 (Neon Schema), Section 2.3 (TypeScript Types)

---

#### Task 1.2.B: Database Client

**Description:**  
Configure Neon serverless client with Drizzle ORM integration.

**Acceptance Criteria:**
- [x] Neon client configured with DATABASE_URL
- [x] Drizzle instance exported
- [x] Environment validation with clear error messages

**Files to Create:**
- `apps/web/lib/db/client.ts`
- `apps/web/lib/env.ts`

**Files to Modify:**
- `apps/web/.env.example`

**Dependencies:** Task 1.2.A

**Spec Reference:** Section 5.3 (Environment Variables)

---

#### Task 1.2.C: Migrations

**Description:**  
Set up Drizzle Kit and create initial migration with triggers.

**Acceptance Criteria:**
- [x] drizzle.config.ts configured
- [x] Initial migration generated
- [x] `pnpm db:push` applies migrations
- [x] `update_updated_at_column()` trigger included

**Files to Create:**
- `apps/web/drizzle.config.ts`
- `apps/web/drizzle/migrations/0000_initial.sql`

**Files to Modify:**
- `apps/web/package.json` — Add drizzle-kit, db scripts

**Dependencies:** Task 1.2.A

**Spec Reference:** Section 2.1 (Functions)

---

### Step 1.3: Authentication

**Depends On:** Step 1.2

---

#### Task 1.3.A: Magic Link Generation

**Description:**  
Implement magic link creation with secure tokens, database storage, and 15-minute expiry.

**Acceptance Criteria:**
- [x] `createMagicLink(email)` generates 64-char random token
- [x] Token stored with 15-minute expiry
- [x] Returns full verification URL
- [x] Email normalized to lowercase

**Files to Create:**
- `apps/web/lib/auth/magic-link.ts`

**Files to Modify:** None

**Dependencies:** Step 1.2

**Spec Reference:** Section 3.1 (POST /api/auth/magic-link), Section 10.1 (Authentication)

---

#### Task 1.3.B: Magic Link API

**Description:**  
Create POST /api/auth/magic-link endpoint that generates link and sends email via Resend.

**Acceptance Criteria:**
- [x] Accepts `{ email: string }`, validates with Zod
- [x] Generates and stores magic link
- [x] Sends email via Resend
- [x] Returns success response
- [x] Rate limits: 3 per email per 15 minutes

**Files to Create:**
- `apps/web/app/api/auth/magic-link/route.ts`
- `apps/web/lib/email/send.ts`

**Files to Modify:**
- `apps/web/package.json` — Add resend, zod

**Dependencies:** Task 1.3.A

**Spec Reference:** Section 3.1 (Authentication APIs)

---

#### Task 1.3.C: Email Template

**Description:**  
Create magic link email template with React Email.

**Acceptance Criteria:**
- [x] MagicLinkEmail component renders HTML
- [x] Includes login button and expiry notice
- [x] Includes disclaimer text

**Files to Create:**
- `apps/web/lib/email/templates.tsx`

**Files to Modify:**
- `apps/web/package.json` — Add @react-email/components

**Dependencies:** None

**Spec Reference:** Appendix B (Email Templates)

---

#### Task 1.3.D: Session Management

**Description:**  
Implement session creation, validation, and destruction with HTTP-only cookies.

**Acceptance Criteria:**
- [x] `createSession(userId)` creates session and sets cookie
- [x] `validateSession(request)` validates and returns session
- [x] `destroySession(sessionId)` removes session and clears cookie
- [x] Cookie: HTTP-only, Secure, SameSite=Lax, 30-day expiry

**Files to Create:**
- `apps/web/lib/auth/session.ts`
- `apps/web/lib/auth/cookies.ts`

**Files to Modify:** None

**Dependencies:** Step 1.2

**Spec Reference:** Section 10.1 (Authentication), Section 4.1 (Server-Side State)

---

### Step 1.4: Auth Completion

**Depends On:** Step 1.3

---

#### Task 1.4.A: Token Verification

**Description:**  
Implement GET /api/auth/verify that validates token, creates user/session, and redirects.

**Acceptance Criteria:**
- [x] Validates token from database
- [x] Invalid/expired redirects to /login?error=...
- [x] Creates user if not exists
- [x] Marks token as used
- [x] Creates session and redirects to /dashboard

**Files to Create:**
- `apps/web/app/api/auth/verify/route.ts`

**Files to Modify:** None

**Dependencies:** Tasks 1.3.A, 1.3.D

**Spec Reference:** Section 3.1 (GET /api/auth/verify)

---

#### Task 1.4.B: Auth Middleware

**Description:**  
Create middleware to protect dashboard routes.

**Acceptance Criteria:**
- [x] Runs on `/dashboard/*` and `/api/projects/*`
- [x] Valid session allows request
- [x] Invalid session redirects (pages) or returns 401 (API)
- [x] Marketing routes unprotected

**Files to Create:**
- `apps/web/middleware.ts`
- `apps/web/lib/auth/get-user.ts`

**Files to Modify:** None

**Dependencies:** Task 1.3.D

**Spec Reference:** Section 1.3 (Domain Structure)

---

#### Task 1.4.C: Login Page & Logout

**Description:**  
Create login page UI and logout endpoint.

**Acceptance Criteria:**
- [x] Login page with email form at /login
- [x] Form submits to magic link endpoint
- [x] Success/error states displayed
- [x] POST /api/auth/logout destroys session

**Files to Create:**
- `apps/web/app/login/page.tsx`
- `apps/web/app/api/auth/logout/route.ts`

**Files to Modify:** None

**Dependencies:** Tasks 1.3.B, 1.3.D

**Spec Reference:** Section 3.1 (POST /api/auth/logout)

---

### Step 1.5: GitHub App

**Depends On:** Step 1.2

---

#### Task 1.5.A: GitHub Client

**Description:**  
Configure GitHub App client with JWT auth and installation token management.

**Acceptance Criteria:**
- [x] GitHub App client with app ID and private key
- [x] JWT generation works
- [x] `getInstallationOctokit(installationId)` returns client
- [x] Tokens refresh before expiry

**Files to Create:**
- `apps/web/lib/github/app.ts`
- `apps/web/types/github.ts`

**Files to Modify:**
- `apps/web/package.json` — Add @octokit/app, @octokit/rest

**Dependencies:** Step 1.2

**Spec Reference:** Section 5.1 (Dependencies), Section 2.3 (GitHub Types)

---

#### Task 1.5.B: Token Storage

**Description:**  
Implement database operations for GitHub tokens.

**Acceptance Criteria:**
- [x] Store installation tokens with expiry
- [x] Retrieve tokens, checking expiry
- [x] Refresh expired tokens

**Files to Create:**
- `apps/web/lib/db/queries/github-tokens.ts`

**Files to Modify:** None

**Dependencies:** Task 1.5.A

**Spec Reference:** Section 2.1 (github_tokens table)

---

#### Task 1.5.C: Installation Callback

**Description:**  
Handle GitHub App installation callback.

**Acceptance Criteria:**
- [x] GET /api/github/callback handles redirect
- [x] Links installation to authenticated user
- [x] Creates github_tokens record
- [x] Redirects to /dashboard

**Files to Create:**
- `apps/web/app/api/github/callback/route.ts`

**Files to Modify:** None

**Dependencies:** Tasks 1.5.A, 1.5.B, Step 1.4

**Spec Reference:** Section 1.1 (System Diagram)

---

### Step 1.6: Webhooks

**Depends On:** Step 1.5

---

#### Task 1.6.A: Webhook Verification

**Description:**  
Create webhook endpoint with HMAC-SHA256 signature verification.

**Acceptance Criteria:**
- [x] POST /api/webhooks/github receives webhooks
- [x] Signature verified with GITHUB_WEBHOOK_SECRET
- [x] Invalid signatures return 401
- [x] Events routed to handlers

**Files to Create:**
- `apps/web/app/api/webhooks/github/route.ts`
- `apps/web/lib/github/webhook-verify.ts`

**Files to Modify:**
- `apps/web/package.json` — Add @octokit/webhooks

**Dependencies:** Step 1.5

**Spec Reference:** Section 3.1 (GitHub Webhook Handler), Section 10.2

---

#### Task 1.6.B: Event Handlers

**Description:**  
Implement handlers for installation and PR webhook events.

**Acceptance Criteria:**
- [x] `installation.created`: Create project records
- [x] `installation.deleted`: Remove projects
- [x] `installation_repositories.added/removed`: Update projects
- [x] `pull_request.closed`: Update status (merged → active)

**Files to Create:**
- `apps/web/lib/github/handlers/installation.ts`
- `apps/web/lib/github/handlers/pull-request.ts`
- `apps/web/lib/db/queries/projects.ts`

**Files to Modify:**
- `apps/web/app/api/webhooks/github/route.ts`

**Dependencies:** Task 1.6.A

**Spec Reference:** Section 3.1 (Events to handle)

---

### Phase 1 Checkpoint

**Automated Checks:**
- [x] All tests pass
- [x] TypeScript compiles
- [x] Linting passes

**Manual Verification:**
- [x] Magic link login flow works end-to-end
- [x] Session persists across reloads
- [x] GitHub App installs and creates project record
- [x] Webhooks update project status

---

## Phase 2: Analysis Engine

**Goal:** Build framework detection and PR generation pipeline.  
**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] GitHub App installed on test repos (App Router, Pages Router, non-Next.js)
- [x] Webhook endpoint receiving events

### Step 2.1: Framework Detection

**Depends On:** Phase 1

---

#### Task 2.1.A: Package.json Analysis

**Description:**  
Fetch and parse package.json to detect Next.js and existing analytics.

**Acceptance Criteria:**
- [x] Fetches package.json via GitHub API
- [x] Returns null if not found
- [x] Detects Next.js presence and version
- [x] Identifies existing analytics packages

**Files to Create:**
- `apps/web/lib/github/detection.ts`

**Files to Modify:** None

**Dependencies:** Phase 1 GitHub client

**Spec Reference:** Section 6.1 (Steps 1, 4)

---

#### Task 2.1.B: Router Detection

**Description:**  
Detect App Router vs Pages Router by checking entry point files.

**Acceptance Criteria:**
- [x] Checks app/layout.tsx, src/app/layout.tsx variants
- [x] Checks pages/_app.tsx, src/pages/_app.tsx variants
- [x] Returns framework type and entry point path
- [x] App Router takes precedence if both exist

**Files to Modify:**
- `apps/web/lib/github/detection.ts`

**Dependencies:** Task 2.1.A

**Spec Reference:** Section 6.1 (Step 5)

---

#### Task 2.1.C: Monorepo Detection

**Description:**  
Detect monorepos (not supported in MVP).

**Acceptance Criteria:**
- [x] Check for `workspaces` in package.json
- [x] Check for pnpm-workspace.yaml
- [x] Check for lerna.json
- [x] Returns `isMonorepo: true` if found

**Files to Modify:**
- `apps/web/lib/github/detection.ts`

**Dependencies:** Task 2.1.A

**Spec Reference:** Section 6.1 (Step 3)

---

### Step 2.2: Detection Orchestration

**Depends On:** Step 2.1

---

#### Task 2.2.A: Detection Orchestrator

**Description:**  
Main function that runs all detection checks and returns FrameworkDetectionResult.

**Acceptance Criteria:**
- [x] Orchestrates checks in correct order
- [x] Returns appropriate error for each failure mode
- [x] Successful detection returns framework, entryPoint, existingAnalytics

**Files to Create:**
- `apps/web/lib/github/detect-framework.ts`

**Files to Modify:** None

**Dependencies:** Step 2.1

**Spec Reference:** Section 6.1, Section 2.3 (FrameworkDetectionResult)

---

#### Task 2.2.B: Analysis Workflow

**Description:**  
Background workflow that runs detection and updates project status.

**Acceptance Criteria:**
- [x] Sets status to 'analyzing' at start
- [x] Stores detection results on success
- [x] Sets status to 'unsupported' or 'analysis_failed' on error
- [x] Triggered from webhook handler

**Files to Create:**
- `apps/web/lib/github/analyze.ts`

**Files to Modify:**
- `apps/web/lib/github/handlers/installation.ts`

**Dependencies:** Task 2.2.A

**Spec Reference:** Section 6.2 (Error States)

---

### Step 2.3: Code Generation

**Depends On:** Step 2.2

---

#### Task 2.3.A: App Router Template

**Description:**  
Generate analytics component for Next.js App Router.

**Acceptance Criteria:**
- [x] Generates complete component with 'use client'
- [x] Tracks session_start and page_view
- [x] Uses usePathname/useSearchParams
- [x] Respects Do Not Track
- [x] Substitutes PROJECT_ID

**Files to Create:**
- `apps/web/lib/github/templates/app-router.ts`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 7.1 (App Router Template)

---

#### Task 2.3.B: Pages Router Template

**Description:**  
Generate analytics hook for Next.js Pages Router.

**Acceptance Criteria:**
- [x] Generates hook using useRouter
- [x] Tracks session_start and page_view
- [x] Listens to routeChangeComplete
- [x] Cleans up on unmount

**Files to Create:**
- `apps/web/lib/github/templates/pages-router.ts`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 7.2 (Pages Router Template)

---

### Step 2.4: Layout Modification

**Depends On:** Step 2.3

---

#### Task 2.4.A: Code Insertion

**Description:**  
Modify layout files to import and use analytics component.

**Acceptance Criteria:**
- [x] Inserts import at top of file
- [x] App Router: adds component before </body>
- [x] Pages Router: adds hook call in component
- [x] Preserves existing code structure

**Files to Create:**
- `apps/web/lib/github/templates/insert-analytics.ts`

**Files to Modify:** None

**Dependencies:** Step 2.3

**Spec Reference:** Section 7.1, 7.2 (Modified file examples)

---

#### Task 2.4.B: Path Resolution

**Description:**  
Resolve component paths based on repo structure.

**Acceptance Criteria:**
- [x] Detects src/ vs root structure
- [x] Returns component file path and import path
- [x] Handles path aliases if present

**Files to Create:**
- `apps/web/lib/github/templates/paths.ts`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 7.1 (Component paths)

---

### Step 2.5: PR Generation

**Depends On:** Step 2.4

---

#### Task 2.5.A: Branch Creation

**Description:**  
Create feature branch for analytics integration.

**Acceptance Criteria:**
- [x] Creates branch from default branch HEAD
- [x] If exists, appends incrementing suffix
- [x] Returns final branch name

**Files to Create:**
- `apps/web/lib/github/pr-generator.ts`

**Files to Modify:** None

**Dependencies:** Phase 1 GitHub client

**Spec Reference:** Section 7.3 (Steps 1-3), Section 6.2 (Branch already exists)

---

#### Task 2.5.B: File Commits

**Description:**  
Commit generated files to feature branch.

**Acceptance Criteria:**
- [x] Creates new component file
- [x] Modifies existing layout file (with SHA)
- [x] Content base64 encoded
- [x] Proper commit messages

**Files to Modify:**
- `apps/web/lib/github/pr-generator.ts`

**Dependencies:** Tasks 2.5.A, Step 2.4

**Spec Reference:** Section 7.3 (Steps 4-6)

---

#### Task 2.5.C: PR Creation

**Description:**  
Create pull request with description.

**Acceptance Criteria:**
- [x] Creates PR with template description
- [x] Handles existing PR (link to it)
- [x] Updates project with pr_number, pr_url, status='pr_pending'

**Files to Modify:**
- `apps/web/lib/github/pr-generator.ts`

**Dependencies:** Task 2.5.B

**Spec Reference:** Section 7.3 (generatePRDescription)

---

### Step 2.6: Generation Orchestration

**Depends On:** Step 2.5

---

#### Task 2.6.A: Generation Pipeline

**Description:**  
Orchestrate complete PR generation after detection.

**Acceptance Criteria:**
- [x] Runs branch → files → PR sequence
- [x] Updates project status on success/failure
- [x] On pull_request.closed, update status only when projects.github_repo_id matches
    and projects.pr_number === payload.pull_request.number (otherwise ignore).
- [x] If projects.pr_number is null, pull_request.closed must not transition the project to active.
- [x] Logs operations for debugging

**Files to Create:**
- `apps/web/lib/github/generate.ts`

**Files to Modify:** None

**Dependencies:** Step 2.5

**Spec Reference:** Section 7.3

---

#### Task 2.6.B: Regenerate Endpoint

**Description:**  
API endpoint to manually trigger regeneration.

**Acceptance Criteria:**
- [x] POST /api/projects/[id]/regenerate
- [x] Only if status is 'analysis_failed' or 'pr_closed'
- [x] Requires authentication
- [x] Rate limited: 1 per 5 minutes

**Files to Create:**
- `apps/web/app/api/projects/[id]/regenerate/route.ts`

**Files to Modify:** None

**Dependencies:** Task 2.6.A

**Spec Reference:** Section 3.1 (POST /api/projects/[projectId]/regenerate)

---

### Phase 2 Checkpoint

**Automated Checks:**
- [x] All tests pass
- [x] TypeScript compiles
- [x] Linting passes

**Manual Verification:**
- [x] App Router repo → correct PR created
- [x] Pages Router repo → correct PR created
- [x] Non-Next.js repo → shows unsupported
- [x] Monorepo → shows unsupported
- [x] Regenerate works for failed projects

---

## Phase 3: SDK Development

**Goal:** Build the NPM package for client-side tracking.  
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] npm organization created
- [ ] npm publishing credentials configured

### Step 3.1: SDK Setup

**Depends On:** Phase 2

---

#### Task 3.1.A: Package Init

**Description:**  
Create SDK package with TypeScript and tsup bundling.

**Acceptance Criteria:**
- [ ] packages/sdk/package.json with main, module, types
- [ ] React/Next.js as peerDependencies
- [ ] tsup configured for ESM and CJS
- [ ] `pnpm build` produces dist/

**Files to Create:**
- `packages/sdk/package.json`
- `packages/sdk/tsconfig.json`
- `packages/sdk/tsup.config.ts`
- `packages/sdk/src/index.ts`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 5.2, Section 9

---

#### Task 3.1.B: Type Definitions

**Description:**  
Define TypeScript types for SDK public API.

**Acceptance Criteria:**
- [ ] InitOptions interface
- [ ] EventType union
- [ ] AnalyticsEvent interface
- [ ] Types exported

**Files to Create:**
- `packages/sdk/src/types.ts`

**Files to Modify:**
- `packages/sdk/src/index.ts`

**Dependencies:** Task 3.1.A

**Spec Reference:** Section 3.3, Section 2.3 (EventType)

---

### Step 3.2: Core Implementation

**Depends On:** Step 3.1

---

#### Task 3.2.A: Session Management

**Description:**  
Implement session ID generation and cookie storage with 30-minute inactivity expiry.

**Acceptance Criteria:**
- [ ] Generates UUID session ID
- [ ] Stores in first-party cookie
- [ ] Expires after 30 min inactivity
- [ ] Creates new session on expiry

**Files to Create:**
- `packages/sdk/src/session.ts`

**Files to Modify:** None

**Dependencies:** Step 3.1

**Spec Reference:** Section 6.4, Section 4.2

---

#### Task 3.2.B: Event Tracking

**Description:**  
Implement core event tracking with fetch and error handling.

**Acceptance Criteria:**
- [ ] Sends events to ingestion endpoint
- [ ] Uses keepalive: true
- [ ] Includes session_id, timestamp, url, path, referrer
- [ ] Errors caught silently
- [ ] Respects Do Not Track

**Files to Create:**
- `packages/sdk/src/tracker.ts`

**Files to Modify:** None

**Dependencies:** Task 3.2.A

**Spec Reference:** Section 3.2, Section 7.1

---

#### Task 3.2.C: Public API

**Description:**  
Implement init(), trackPageView(), identify(), isEnabled().

**Acceptance Criteria:**
- [ ] init(options) stores configuration
- [ ] trackPageView(path?) tracks page view
- [ ] identify(userId) associates events with user
- [ ] isEnabled() respects DNT setting
- [ ] Guards for SSR

**Files to Modify:**
- `packages/sdk/src/index.ts`

**Dependencies:** Tasks 3.2.A, 3.2.B

**Spec Reference:** Section 3.3

---

### Step 3.3: React Integration

**Depends On:** Step 3.2

---

#### Task 3.3.A: App Router Component

**Description:**  
React component for Next.js App Router.

**Acceptance Criteria:**
- [ ] Tracks on route changes
- [ ] Uses usePathname/useSearchParams
- [ ] Wrapped in Suspense
- [ ] Tracks session_start on mount

**Files to Create:**
- `packages/sdk/src/react/app-router.tsx`

**Files to Modify:**
- `packages/sdk/src/index.ts`

**Dependencies:** Step 3.2

**Spec Reference:** Section 7.1

---

#### Task 3.3.B: Pages Router Hook

**Description:**  
React hook for Next.js Pages Router.

**Acceptance Criteria:**
- [ ] Tracks on routeChangeComplete
- [ ] Uses useRouter
- [ ] Cleans up listener on unmount

**Files to Create:**
- `packages/sdk/src/react/pages-router.tsx`

**Files to Modify:**
- `packages/sdk/src/index.ts`

**Dependencies:** Step 3.2

**Spec Reference:** Section 7.2

---

### Step 3.4: Documentation

**Depends On:** Step 3.3

---

#### Task 3.4.A: README

**Description:**  
Write SDK documentation.

**Acceptance Criteria:**
- [ ] Installation instructions
- [ ] Quick start for both router types
- [ ] API reference
- [ ] DNT behavior documented

**Files to Create:**
- `packages/sdk/README.md`

**Files to Modify:** None

**Dependencies:** Step 3.3

**Spec Reference:** Section 3.3

---

#### Task 3.4.B: Publish Config

**Description:**  
Configure for npm publishing.

**Acceptance Criteria:**
- [ ] .npmignore configured
- [ ] publishConfig in package.json
- [ ] Version 0.1.0
- [ ] CHANGELOG created

**Files to Create:**
- `packages/sdk/.npmignore`
- `packages/sdk/CHANGELOG.md`

**Files to Modify:**
- `packages/sdk/package.json`

**Dependencies:** All SDK tasks

**Spec Reference:** Section 5.2

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] SDK builds
- [ ] All tests pass
- [ ] Package exports resolve

**Manual Verification:**
- [ ] Install in App Router test project
- [ ] Install in Pages Router test project
- [ ] Page views tracked
- [ ] DNT respected

---

## Phase 4: Event Ingestion

**Goal:** Build event ingestion endpoint and Tinybird pipeline.  
**Depends On:** Phase 3

### Pre-Phase Setup

- [ ] events.[productname].com subdomain in Vercel
- [ ] Tinybird workspace with tokens

### Step 4.1: Events App

**Depends On:** Phase 3

---

#### Task 4.1.A: App Scaffolding

**Description:**  
Create minimal Next.js app for event ingestion.

**Acceptance Criteria:**
- [x] apps/events/ with minimal Next.js
- [x] Only v1/track route
- [x] Configured for Vercel

**Files to Create:**
- `apps/events/package.json`
- `apps/events/next.config.js`
- `apps/events/tsconfig.json`
- `apps/events/app/layout.tsx`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 1.1, Section 9

---

#### Task 4.1.B: Tinybird Client

**Description:**  
Create client for sending events to Tinybird.

**Acceptance Criteria:**
- [x] Configured with API URL and token
- [x] Sends events as NDJSON
- [x] Error handling and retry

**Files to Create:**
- `apps/events/lib/tinybird.ts`

**Files to Modify:** None

**Dependencies:** Task 4.1.A

**Spec Reference:** Section 5.1

---

### Step 4.2: Track Endpoint

**Depends On:** Step 4.1

---

#### Task 4.2.A: Route Handler

**Description:**  
POST /v1/track endpoint for receiving events.

**Acceptance Criteria:**
- [x] Accepts `{ events: AnalyticsEvent[] }`
- [x] Validates with Zod
- [x] Accepts 1-10 events per batch
- [x] Returns `{ success: true, received: N }`
- [x] Forwards to Tinybird

**Files to Create:**
- `apps/events/app/v1/track/route.ts`

**Files to Modify:** None

**Dependencies:** Task 4.1.B

**Spec Reference:** Section 3.2

---

#### Task 4.2.B: CORS

**Description:**  
Configure CORS for all origins.

**Acceptance Criteria:**
- [x] OPTIONS returns CORS headers
- [x] Access-Control-Allow-Origin: *
- [x] Allow POST, OPTIONS
- [x] Allow Content-Type header

**Files to Modify:**
- `apps/events/app/v1/track/route.ts`

**Dependencies:** Task 4.2.A

**Spec Reference:** Section 3.2 (CORS Configuration)

---

### Step 4.3: Validation

**Depends On:** Step 4.2

---

#### Task 4.3.A: Project Validation

**Description:**  
Validate project_id against database.

**Acceptance Criteria:**
- [x] Validates against projects table
- [x] Only 'active' projects accept events
- [x] Invalid IDs silently dropped
- [x] Project lookup cached (30s)

**Files to Modify:**
- `apps/events/app/v1/track/route.ts`

**Files to Create:**
- `apps/events/lib/project-cache.ts`

**Dependencies:** Task 4.2.A

**Spec Reference:** Section 10.3

---

### Step 4.4: Tinybird Data Sources

**Depends On:** Step 4.3

---

#### Task 4.4.A: Events Source

**Description:**  
Create Tinybird events data source.

**Acceptance Criteria:**
- [x] Schema matches spec
- [x] Partitioned by month
- [x] Sorted by project_id, timestamp
- [x] 90-day TTL

**Files to Create:**
- `tinybird/datasources/events.datasource`

**Files to Modify:** None

**Dependencies:** Tinybird workspace

**Spec Reference:** Section 2.2

---

#### Task 4.4.B: Daily Aggregates

**Description:**  
Create materialized view for daily stats.

**Acceptance Criteria:**
- [x] Computes page_views, sessions, unique_visitors
- [x] Per project per day
- [x] Uses SummingMergeTree

**Files to Create:**
- `tinybird/datasources/daily_aggregates.datasource`
- `tinybird/pipes/daily_aggregates_pipe.pipe`

**Files to Modify:** None

**Dependencies:** Task 4.4.A

**Spec Reference:** Section 2.2

---

### Step 4.5: Query Endpoints

**Depends On:** Step 4.4

---

#### Task 4.5.A: Live Feed

**Description:**  
Tinybird pipe for recent events.

**Acceptance Criteria:**
- [x] Returns recent events
- [x] Accepts project_id, limit, since
- [x] Formats relative_time

**Files to Create:**
- `tinybird/pipes/live_feed.pipe`

**Files to Modify:** None

**Dependencies:** Task 4.4.A

**Spec Reference:** Appendix A

---

#### Task 4.5.B: Page Views

**Description:**  
Tinybird pipe for page views over time.

**Acceptance Criteria:**
- [x] Returns daily counts
- [x] Accepts date range
- [x] Ordered by date

**Files to Create:**
- `tinybird/pipes/page_views_timeseries.pipe`

**Files to Modify:** None

**Dependencies:** Task 4.4.A

**Spec Reference:** Appendix A

---

#### Task 4.5.C: Top Pages

**Description:**  
Tinybird pipe for top pages.

**Acceptance Criteria:**
- [x] Returns top 10 pages
- [x] Includes percentage

**Files to Create:**
- `tinybird/pipes/top_pages.pipe`

**Files to Modify:** None

**Dependencies:** Task 4.4.A

**Spec Reference:** Appendix A

---

#### Task 4.5.D: Top Referrers

**Description:**  
Tinybird pipe for top referrers.

**Acceptance Criteria:**
- [x] Extracts host from URL
- [x] Empty = "Direct"
- [x] Top 10 with percentage

**Files to Create:**
- `tinybird/pipes/top_referrers.pipe`

**Files to Modify:** None

**Dependencies:** Task 4.4.A

**Spec Reference:** Appendix A

---

### Phase 4 Checkpoint

**Automated Checks:**
- [ ] Events app builds
- [ ] Tinybird sources validate

**Manual Verification:**
- [ ] POST to /v1/track succeeds
- [ ] Events appear in Tinybird
- [ ] Query endpoints return data
- [ ] CORS works from browser

---

## Phase 5: Dashboard

**Goal:** Build user-facing analytics dashboard.  
**Depends On:** Phase 4

### Pre-Phase Setup

- [ ] Tinybird endpoints working
- [ ] Test project with events

### Step 5.1: Layout

**Depends On:** Phase 4

---

#### Task 5.1.A: Dashboard Shell

**Description:**  
Create dashboard layout with navigation.

**Acceptance Criteria:**
- [ ] Layout in app/(dashboard)/layout.tsx
- [ ] Sidebar with navigation
- [ ] Header with user menu
- [ ] Responsive

**Files to Create:**
- `apps/web/app/(dashboard)/layout.tsx`
- `apps/web/components/dashboard/sidebar.tsx`
- `apps/web/components/dashboard/header.tsx`

**Files to Modify:** None

**Dependencies:** Phase 1 auth

**Spec Reference:** Section 9

---

#### Task 5.1.B: Data Fetching

**Description:**  
Set up React Query for dashboard data.

**Acceptance Criteria:**
- [ ] React Query provider configured
- [ ] `useProject(id)` hook
- [ ] Loading and error states

**Files to Create:**
- `apps/web/lib/providers.tsx`
- `apps/web/lib/hooks/use-project.ts`

**Files to Modify:**
- `apps/web/app/(dashboard)/layout.tsx`

**Dependencies:** Task 5.1.A

**Spec Reference:** Section 5.1

---

### Step 5.2: Project Pages

**Depends On:** Step 5.1

---

#### Task 5.2.A: Projects List

**Description:**  
Page showing all user's projects.

**Acceptance Criteria:**
- [ ] Lists all projects
- [ ] Shows status, last event
- [ ] Links to detail
- [ ] Empty state
- [ ] Polls every 10s

**Files to Create:**
- `apps/web/app/(dashboard)/projects/page.tsx`
- `apps/web/components/dashboard/project-card.tsx`

**Files to Modify:** None

**Dependencies:** Step 5.1

**Spec Reference:** Section 3.1, Section 4.4

---

#### Task 5.2.B: Project Detail

**Description:**  
Project detail page with status and navigation.

**Acceptance Criteria:**
- [ ] Shows project details
- [ ] PR status and link
- [ ] Onboarding checklist for new projects
- [ ] Regenerate button for failed
- [ ] Polls during analysis (2s)

**Files to Create:**
- `apps/web/app/(dashboard)/projects/[id]/page.tsx`
- `apps/web/components/dashboard/onboarding-checklist.tsx`

**Files to Modify:** None

**Dependencies:** Task 5.2.A

**Spec Reference:** Section 3.1, Section 4.4

---

### Step 5.3: Analytics APIs

**Depends On:** Step 5.2

---

#### Task 5.3.A: Live Feed API

**Description:**  
API route proxying to Tinybird live feed.

**Acceptance Criteria:**
- [ ] GET /api/projects/[id]/analytics/live
- [ ] Verifies ownership
- [ ] Proxies to Tinybird

**Files to Create:**
- `apps/web/app/api/projects/[id]/analytics/live/route.ts`

**Files to Modify:** None

**Dependencies:** Phase 4 Tinybird

**Spec Reference:** Section 3.1

---

#### Task 5.3.B: Overview API

**Description:**  
API route for analytics overview.

**Acceptance Criteria:**
- [ ] GET /api/projects/[id]/analytics/overview
- [ ] Accepts period param
- [ ] Aggregates multiple Tinybird queries
- [ ] Calculates change percentages

**Files to Create:**
- `apps/web/app/api/projects/[id]/analytics/overview/route.ts`
- `apps/web/lib/tinybird/client.ts`

**Files to Modify:** None

**Dependencies:** Phase 4 Tinybird

**Spec Reference:** Section 3.1

---

#### Task 5.3.C: Sessions API

**Description:**  
API route for session analytics.

**Acceptance Criteria:**
- [ ] GET /api/projects/[id]/analytics/sessions
- [ ] Returns total, new, returning
- [ ] Time series data

**Files to Create:**
- `apps/web/app/api/projects/[id]/analytics/sessions/route.ts`

**Files to Modify:** None

**Dependencies:** Phase 4 Tinybird

**Spec Reference:** Section 3.1

---

### Step 5.4: Analytics Views

**Depends On:** Step 5.3

---

#### Task 5.4.A: Live Feed Page

**Description:**  
Real-time event feed page.

**Acceptance Criteria:**
- [ ] Shows recent events
- [ ] Polls every 5s
- [ ] New events animate in
- [ ] Empty state

**Files to Create:**
- `apps/web/app/(dashboard)/projects/[id]/live/page.tsx`
- `apps/web/components/dashboard/live-event.tsx`

**Files to Modify:** None

**Dependencies:** Task 5.3.A

**Spec Reference:** Section 4.4

---

#### Task 5.4.B: Overview Page

**Description:**  
Main analytics overview with charts.

**Acceptance Criteria:**
- [ ] Page views chart (Recharts)
- [ ] Period selector (24h, 7d, 30d)
- [ ] Summary cards with change %
- [ ] Top pages and referrers
- [ ] Responsive

**Files to Create:**
- `apps/web/app/(dashboard)/projects/[id]/overview/page.tsx`
- `apps/web/components/dashboard/page-views-chart.tsx`
- `apps/web/components/dashboard/stat-card.tsx`
- `apps/web/components/dashboard/top-list.tsx`

**Files to Modify:** None

**Dependencies:** Task 5.3.B

**Spec Reference:** Section 3.1, Section 5.1

---

#### Task 5.4.C: Sessions Page

**Description:**  
Session analytics page.

**Acceptance Criteria:**
- [ ] Sessions over time chart
- [ ] New vs returning breakdown
- [ ] Summary stats

**Files to Create:**
- `apps/web/app/(dashboard)/projects/[id]/sessions/page.tsx`
- `apps/web/components/dashboard/sessions-chart.tsx`

**Files to Modify:** None

**Dependencies:** Task 5.3.C

**Spec Reference:** Section 3.1

---

### Step 5.5: Settings

**Depends On:** Step 5.4

---

#### Task 5.5.A: Quota Display

**Description:**  
Show quota usage with warnings.

**Acceptance Criteria:**
- [ ] Progress bar: used / limit
- [ ] Warning at 80%
- [ ] Over quota banner

**Files to Create:**
- `apps/web/components/dashboard/quota-display.tsx`

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/page.tsx`

**Dependencies:** Step 5.2

**Spec Reference:** Section 6.3, Section 3.1

---

#### Task 5.5.B: Account Settings

**Description:**  
Basic account settings page.

**Acceptance Criteria:**
- [ ] Shows email and plan
- [ ] Logout button

**Files to Create:**
- `apps/web/app/(dashboard)/settings/page.tsx`

**Files to Modify:** None

**Dependencies:** Phase 1 auth

**Spec Reference:** General

---

### Phase 5 Checkpoint

**Automated Checks:**
- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] Build succeeds

**Manual Verification:**
- [ ] Projects list loads
- [ ] Live feed updates
- [ ] Charts render with data
- [ ] Period selector works
- [ ] Mobile responsive

---

## Phase 6: Polish & Launch

**Goal:** Marketing site, testing, and production deployment.  
**Depends On:** Phase 5

### Pre-Phase Setup

- [ ] Branding finalized
- [ ] Production domains configured
- [ ] Environment variables ready

### Step 6.1: Marketing

**Depends On:** Phase 5

---

#### Task 6.1.A: Landing Page

**Description:**  
Main landing page with hero and features.

**Acceptance Criteria:**
- [ ] Hero with value proposition
- [ ] Features section
- [ ] "Add to GitHub" CTA
- [ ] SSG for fast loading

**Files to Create:**
- `apps/web/app/(marketing)/page.tsx`
- `apps/web/components/marketing/hero.tsx`
- `apps/web/components/marketing/features.tsx`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 1.3

---

#### Task 6.1.B: Pricing Page

**Description:**  
Pricing page with plan tiers.

**Acceptance Criteria:**
- [ ] Shows Free, Pro, Team tiers
- [ ] Event limits displayed
- [ ] Feature comparison

**Files to Create:**
- `apps/web/app/(marketing)/pricing/page.tsx`
- `apps/web/components/marketing/pricing-card.tsx`

**Files to Modify:** None

**Dependencies:** None

**Spec Reference:** Section 6.3

---

#### Task 6.1.C: Documentation

**Description:**  
Basic setup and SDK documentation.

**Acceptance Criteria:**
- [ ] /docs/setup with getting started
- [ ] /docs/sdk with API reference
- [ ] Code examples

**Files to Create:**
- `apps/web/app/(marketing)/docs/page.tsx`
- `apps/web/app/(marketing)/docs/setup/page.tsx`
- `apps/web/app/(marketing)/docs/sdk/page.tsx`

**Files to Modify:** None

**Dependencies:** Phase 3 SDK

**Spec Reference:** Section 3.3

---

### Step 6.2: Testing

**Depends On:** Step 6.1

---

#### Task 6.2.A: E2E Tests

**Description:**  
End-to-end test suite.

**Acceptance Criteria:**
- [ ] Login flow test
- [ ] Dashboard navigation test
- [ ] Runs in CI

**Files to Create:**
- `apps/web/e2e/auth.spec.ts`
- `apps/web/e2e/dashboard.spec.ts`
- `apps/web/playwright.config.ts`

**Files to Modify:**
- `apps/web/package.json`

**Dependencies:** All features

**Spec Reference:** General

---

#### Task 6.2.B: Security Review

**Description:**  
Review and harden security.

**Acceptance Criteria:**
- [ ] All API routes check auth
- [ ] Webhook signatures verified
- [ ] No SQL injection possible
- [ ] Secrets not exposed

**Files to Create:**
- `SECURITY.md` (if issues found)

**Files to Modify:** Various (if issues found)

**Dependencies:** All features

**Spec Reference:** Section 10

---

### Step 6.3: Deployment

**Depends On:** Step 6.2

---

#### Task 6.3.A: Production Config

**Description:**  
Configure production environment.

**Acceptance Criteria:**
- [ ] All env vars in Vercel
- [ ] Domains configured
- [ ] SSL active
- [ ] Webhook URL updated

**Files to Modify:** Vercel config (not code)

**Dependencies:** Vercel access

**Spec Reference:** Section 5.3

---

#### Task 6.3.B: Monitoring

**Description:**  
Set up monitoring and alerting.

**Acceptance Criteria:**
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured
- [ ] Alerts for high error rates

**Files to Create:**
- `MONITORING.md`

**Files to Modify:** None

**Dependencies:** Production deployed

**Spec Reference:** Section 11

---

### Phase 6 Checkpoint

**Automated Checks:**
- [ ] All tests pass
- [ ] E2E tests pass
- [ ] Build succeeds

**Manual Verification:**
- [ ] Full flow: landing → install → PR → merge → analytics
- [ ] Fast page loads
- [ ] No console errors
- [ ] Monitoring working

---

*End of Execution Plan*
