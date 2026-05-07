# Execution Plan: MCP-First Analytics Onboarding

Commands in `Verify:` lines are run from this feature directory unless they explicitly `cd ../..` to the project root.

## Overview

| Metric | Value |
|--------|-------|
| Feature | MCP-first analytics onboarding |
| Target Project | fast_pr_analytics |
| Total Phases | 3 |
| Total Steps | 7 |
| Total Tasks | 19 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `apps/web/package.json` | modifies | Adds hosted MCP server dependencies for the web app only. |
| `apps/web/lib/db/schema.ts` | modifies | Extends `projects` and adds OAuth tables for MCP auth. |
| `apps/web/drizzle/migrations/*` | creates/modifies | Adds the MCP/OAuth migration and journal entry. |
| `apps/web/lib/db/queries/projects.ts` | modifies | Adds MCP project create/reuse and nullable GitHub-safe project logic. |
| `apps/web/lib/auth/*` | modifies | Reuses GitHub-backed Tally login and adds safe OAuth return path behavior. |
| `apps/web/app/api/oauth/*` | creates | Implements Tally OAuth authorization server endpoints for MCP clients. |
| `apps/web/app/.well-known/*` | creates | Exposes MCP OAuth discovery metadata with CORS handling. |
| `apps/web/app/api/mcp/route.ts` | creates | Hosts the authenticated Streamable HTTP MCP endpoint. |
| `apps/web/lib/mcp/**` | creates | Implements MCP auth, schemas, tool registration, project reuse, and patch generation. |
| `apps/web/lib/github/templates/insert-analytics.ts` | uses/modifies | Reuses insertion helpers without extending copied GitHub tracker templates. |
| `apps/web/app/api/projects/**` | modifies | Adds `displayName`, `source`, nullable GitHub fields, and GitHub-only action gating. |
| `apps/web/app/(dashboard)/**` | modifies | Adds MCP CTA, pending state, and display-name rendering. |
| `apps/web/app/(marketing)/docs/setup/page.tsx` | modifies | Adds Codex MCP setup path while preserving GitHub App path. |
| `apps/web/tests/**` | creates/modifies | Adds OAuth, MCP, patch fixture, project API, and regression tests. |

## Phase Dependency Graph

```text
Phase 1: Data and OAuth Foundation
  -> Phase 2: MCP Install Patch Tool
      -> Phase 3: Product Surface and Regression Hardening
```

---

## Phase 1: Data and OAuth Foundation

**Goal:** Add the persistent project/OAuth model and authenticated OAuth routes needed before any MCP tool can create projects.
**Depends On:** None

### Pre-Phase Setup

- [ ] (CODE) Current plan points to this feature directory.
  - Verify: `cd ../.. && grep -q 'Current plan: \`features/mcp_onboarding/\`' plans/PLAN_STATUS.md`
- [ ] (CODE) Feature specs exist.
  - Verify: `test -f FEATURE_SPEC.md && test -f FEATURE_TECHNICAL_SPEC.md`
- [ ] (CODE) Web Drizzle config exists before schema work starts.
  - Verify: `cd ../.. && test -f apps/web/drizzle.config.ts`

### Step 1.1: Dependencies and Schema

**Depends On:** None

---

#### Task 1.1.A: Add MCP Server Dependencies

**Description:**
Add the MCP server packages to the web app package and keep dependency scope limited to `apps/web`. This prepares the app to host the MCP route without changing the SDK package.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Dependencies"; FEATURE_SPEC.md "MCP Setup Flow"

**Acceptance Criteria:**
- [ ] (CODE) `apps/web/package.json` includes `@modelcontextprotocol/sdk` and `mcp-handler` in `dependencies`.
  - Verify: `cd ../.. && node -e "const p=require('./apps/web/package.json'); if(!p.dependencies['@modelcontextprotocol/sdk']||!p.dependencies['mcp-handler']) process.exit(1)"`
- [ ] (CODE) `packages/sdk/package.json` does not add MCP server dependencies.
  - Verify: `cd ../.. && node -e "const p=require('./packages/sdk/package.json'); if((p.dependencies&&p.dependencies['mcp-handler'])||(p.dependencies&&p.dependencies['@modelcontextprotocol/sdk'])) process.exit(1)"`
- [ ] (TYPE) Existing web TypeScript config still compiles after dependency installation.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (TEST) Existing package metadata tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- env app-url`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/package.json` - Add MCP server runtime dependencies.
- `pnpm-lock.yaml` - Update lockfile after dependency installation.

**Existing Code to Reference:**
- `apps/web/package.json` - Existing app dependency placement and scripts.
- `packages/sdk/package.json` - SDK package boundary that must not receive server dependencies.

**Dependencies:**
- None

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Dependencies"

**Browser Verification:**
- Criteria IDs: None
- Notes: No browser behavior in this task.

---

#### Task 1.1.B: Add Project and OAuth Schema Migration

**Description:**
Extend the database schema so projects can be created without GitHub installation fields and OAuth codes/tokens can be stored as hashes. Generate an additive Drizzle migration that backfills `display_name`, relaxes GitHub not-null constraints, adds MCP metadata columns, and adds OAuth tables.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Data Model"; FEATURE_SPEC.md "Data Persistence"

**Acceptance Criteria:**
- [ ] (CODE) `projects` schema contains `source`, `displayName`, `mcpNormalizedGitRemote`, `mcpRepoName`, `mcpAppRoot`, `mcpFramework`, `mcpPackageManager`, and `mcpFingerprint`.
  - Verify: `cd ../.. && rg -q 'mcpFingerprint|displayName|mcpNormalizedGitRemote' apps/web/lib/db/schema.ts`
- [ ] (CODE) `githubRepoId`, `githubRepoFullName`, and `githubInstallationId` are nullable in `projects`.
  - Verify: `cd ../.. && ! rg -q 'githubRepo(Id|FullName).*\\.notNull\\(\\)|githubInstallationId.*\\.notNull\\(\\)' apps/web/lib/db/schema.ts`
- [ ] (CODE) OAuth client, authorization-code, access-token, and refresh-token tables are defined with hash primary keys for codes/tokens.
  - Verify: `cd ../.. && rg -q 'oauthClients|oauthAuthorizationCodes|oauthAccessTokens|oauthRefreshTokens|codeHash|tokenHash' apps/web/lib/db/schema.ts`
- [ ] (TEST) Schema and migration tests cover the new tables, nullable GitHub fields, indexes, checks, and migration journal entry.
  - Verify: `cd ../.. && pnpm --filter web test -- schema migrations`
- [ ] (CODE) Migration SQL does not drop existing project or GitHub token tables.
  - Verify: `cd ../.. && ! rg -q 'DROP TABLE (projects|github_tokens)|DROP COLUMN (github_repo_id|github_repo_full_name|github_installation_id)' apps/web/drizzle/migrations`
- [ ] (TEST) Migration execution notes prove the migration was generated, reviewed, applied to the local database, and followed by schema/migration tests.
  - Verify: `cd ../.. && rg -q 'pnpm --filter web db:generate' features/mcp_onboarding/MIGRATION_NOTES.md && rg -q 'SQL review' features/mcp_onboarding/MIGRATION_NOTES.md && rg -q 'pnpm --filter web db:push' features/mcp_onboarding/MIGRATION_NOTES.md && rg -q 'pnpm --filter web test -- schema migrations' features/mcp_onboarding/MIGRATION_NOTES.md`

**Files to Create:**
- `apps/web/drizzle/migrations/0006_mcp_oauth.sql` - Additive migration for MCP projects and OAuth tables.
- `features/mcp_onboarding/MIGRATION_NOTES.md` - Records migration generation, SQL review, local application, and post-apply test results.

**Files to Modify:**
- `apps/web/lib/db/schema.ts` - Add columns, tables, indexes, checks, and nullable GitHub fields.
- `apps/web/drizzle/migrations/meta/_journal.json` - Register the new migration.
- `apps/web/tests/schema.test.ts` - Assert schema type/column changes.
- `apps/web/tests/migrations.test.ts` - Assert migration journal and non-destructive SQL.

**Existing Code to Reference:**
- `apps/web/drizzle/migrations/0003_github_oauth.sql` - Existing auth-related migration style.
- `apps/web/lib/db/schema.ts` - Existing Drizzle table/check/index patterns.
- `apps/web/tests/migrations.test.ts` - Migration journal test pattern.

**Dependencies:**
- Task 1.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Project Schema Changes" and "OAuth Tables"

**Browser Verification:**
- Criteria IDs: None
- Notes: Database-only task.

---

#### Task 1.1.C: Add MCP Project Query Helpers

**Description:**
Add project query helpers for MCP-created projects, reuse by fingerprint, and concurrent insert conflict reselect. Keep GitHub App query behavior intact and store framework/package-manager values as metadata only.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Project Reuse Implementation"; FEATURE_SPEC.md "Project Reuse"

**Acceptance Criteria:**
- [ ] (CODE) Project query module exports MCP create/reuse helpers and fingerprint generation helpers.
  - Verify: `cd ../.. && rg -q 'createOrReuseMcpProject|mcpFingerprint|normalizeGitRemote' apps/web/lib/db/queries/projects.ts`
- [ ] (TEST) MCP project query tests cover new project creation with `status = "active"` and null GitHub fields.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-project-queries`
- [ ] (TEST) MCP project query tests cover exact reuse, multiple-match unsupported behavior, and concurrent conflict reselect.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-project-queries`
- [ ] (TEST) Tests prove framework/package-manager changes do not change the reuse fingerprint.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-project-queries`
- [ ] (TEST) Existing GitHub project query tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- projects-queries github-webhook-installation-handler`

**Files to Create:**
- `apps/web/tests/mcp-project-queries.test.ts` - MCP project query and reuse coverage.

**Files to Modify:**
- `apps/web/lib/db/queries/projects.ts` - Add MCP project helpers and retain GitHub helpers.

**Existing Code to Reference:**
- `apps/web/lib/db/queries/projects.ts` - Existing `createProjectId` and GitHub upsert patterns.
- `apps/web/tests/projects-queries.test.ts` - Query test mocking style.

**Dependencies:**
- Task 1.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Project Reuse Implementation"

**Browser Verification:**
- Criteria IDs: None
- Notes: Query-layer task.

---

### Step 1.2: OAuth Authorization Server

**Depends On:** Step 1.1

---

#### Task 1.2.A: Implement OAuth Storage and Validation Modules

**Description:**
Create reusable OAuth modules for hashing secrets, validating clients/redirect URIs/scopes/resources, issuing authorization codes, and rotating refresh tokens. Store only SHA-256 hashes of codes and tokens.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "OAuth Tables" and "OAuth/Authorization Server"; FEATURE_SPEC.md "MCP Setup Flow"

**Acceptance Criteria:**
- [ ] (CODE) OAuth library modules exist under `apps/web/lib/oauth/`.
  - Verify: `cd ../.. && test -f apps/web/lib/oauth/crypto.ts && test -f apps/web/lib/oauth/clients.ts && test -f apps/web/lib/oauth/codes.ts && test -f apps/web/lib/oauth/tokens.ts && test -f apps/web/lib/oauth/validation.ts`
- [ ] (TEST) Client registration validation accepts HTTPS and localhost loopback redirect URIs and rejects invalid redirect URIs.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-register`
- [ ] (TEST) Authorization-code and token helpers store hashes and never persist raw token/code strings.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-token`
- [ ] (TEST) Token tests cover PKCE S256 verification, one-time code use, 1-hour access token expiry, 30-day refresh token expiry, and refresh rotation.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-token`
- [ ] (CODE) OAuth modules do not log raw authorization codes, access tokens, refresh tokens, or submitted file bodies.
  - Verify: `cd ../.. && ! rg -n 'console\\.(log|info|warn|error).*token|console\\.(log|info|warn|error).*code|console\\.(log|info|warn|error).*files' apps/web/lib/oauth apps/web/app/api/oauth`

**Files to Create:**
- `apps/web/lib/oauth/crypto.ts` - Hashing and random token/code generation.
- `apps/web/lib/oauth/clients.ts` - Dynamic client persistence and lookup.
- `apps/web/lib/oauth/codes.ts` - Authorization code creation, lookup, and use marking.
- `apps/web/lib/oauth/tokens.ts` - Access/refresh token creation, lookup, revocation, and rotation.
- `apps/web/lib/oauth/validation.ts` - Redirect URI, scope, resource, and PKCE validation.
- `apps/web/tests/mcp-oauth-register.test.ts` - Dynamic client registration helper/route coverage.
- `apps/web/tests/mcp-oauth-token.test.ts` - Token helper/route coverage.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/lib/auth/session.ts` - Existing secure random/session storage patterns.
- `apps/web/lib/db/queries/github-tokens.ts` - Existing token persistence style and tests.
- `apps/web/tests/github-tokens.test.ts` - Token query test style.

**Dependencies:**
- Task 1.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "OAuth/Authorization Server"

**Browser Verification:**
- Criteria IDs: None
- Notes: Route-level behavior is covered by Vitest route tests.

---

#### Task 1.2.B: Implement OAuth Metadata, Register, Authorize, and Token Routes

**Description:**
Expose Tally as an OAuth authorization server for MCP clients. Add protected-resource metadata, authorization-server metadata, dynamic client registration, authorize, and token routes with OAuth-compatible responses and CORS for metadata discovery.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Endpoint response contracts"; FEATURE_SPEC.md "MCP Setup Flow"

**Acceptance Criteria:**
- [ ] (CODE) OAuth metadata and API route files exist at the specified App Router paths.
  - Verify: `cd ../.. && test -f apps/web/app/.well-known/oauth-protected-resource/route.ts && test -f apps/web/app/.well-known/oauth-authorization-server/route.ts && test -f apps/web/app/api/oauth/register/route.ts && test -f apps/web/app/api/oauth/authorize/route.ts && test -f apps/web/app/api/oauth/token/route.ts`
- [ ] (TEST) Metadata routes return issuer/resource/endpoints/scopes and CORS `OPTIONS` responses.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-metadata`
- [ ] (TEST) Register route returns `201` JSON with `client_id`, `client_id_issued_at`, redirect URIs, grant types, response types, and `scope: "mcp:install"`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-register`
- [ ] (TEST) Authorize route redirects unauthenticated users to GitHub login with a safe `return_to`, creates codes for authenticated users, and rejects invalid client/redirect/resource/scope inputs.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-authorize`
- [ ] (TEST) Token route supports `authorization_code` and `refresh_token` grants with OAuth-compatible success/error JSON.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-token`
- [ ] (TEST) Completed MCP OAuth flow creates a Tally user for a new GitHub identity, reuses or links an existing matching identity, and maps issued tokens to the authenticated user for MCP project ownership.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-oauth-authorize mcp-auth users-queries`

**Files to Create:**
- `apps/web/lib/oauth/metadata.ts` - Shared metadata payload builders.
- `apps/web/app/.well-known/oauth-protected-resource/route.ts` - Protected resource metadata route.
- `apps/web/app/.well-known/oauth-authorization-server/route.ts` - Authorization server metadata route.
- `apps/web/app/api/oauth/register/route.ts` - Dynamic client registration route.
- `apps/web/app/api/oauth/authorize/route.ts` - Authorization endpoint.
- `apps/web/app/api/oauth/token/route.ts` - Token endpoint.
- `apps/web/tests/mcp-oauth-metadata.test.ts` - Metadata route coverage.
- `apps/web/tests/mcp-oauth-authorize.test.ts` - Authorize route coverage.

**Files to Modify:**
- `apps/web/tests/mcp-oauth-register.test.ts` - Add route-level registration coverage if created in Task 1.2.A.
- `apps/web/tests/mcp-oauth-token.test.ts` - Add route-level token coverage if created in Task 1.2.A.
- `apps/web/lib/db/queries/users.ts` - Add or adjust user lookup/upsert helpers if OAuth create/link behavior requires it.
- `apps/web/tests/users-queries.test.ts` - Add user create/reuse/link coverage if user query helpers change.

**Existing Code to Reference:**
- `apps/web/app/api/auth/github/route.ts` - Existing route handler response style.
- `apps/web/app/api/auth/github/callback/route.ts` - Existing auth callback/session creation pattern.
- `apps/web/tests/github-oauth-redirect.test.ts` - Redirect test style.

**Dependencies:**
- Task 1.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "OAuth/Authorization Server"

**Browser Verification:**
- Criteria IDs: None
- Notes: OAuth browser redirect behavior is route-tested; full MCP client browser OAuth is outside local automated coverage.

---

#### Task 1.2.C: Add Safe GitHub Login Return Path

**Description:**
Extend existing GitHub login and callback routes so an MCP OAuth authorization request can resume after GitHub-backed Tally login. Restrict `return_to` to same-origin relative paths and preserve the existing default `/projects` redirect.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Extend existing GitHub OAuth routes"; FEATURE_SPEC.md "Require only one Tally OAuth login"

**Acceptance Criteria:**
- [ ] (CODE) GitHub login route accepts and stores a safe `return_to` cookie only for relative same-origin paths.
  - Verify: `cd ../.. && rg -q 'return_to' apps/web/app/api/auth/github/route.ts apps/web/lib/auth/cookies.ts`
- [ ] (TEST) GitHub OAuth redirect tests reject absolute URLs, protocol-relative URLs, and traversal-style return paths.
  - Verify: `cd ../.. && pnpm --filter web test -- github-oauth-redirect github-oauth-callback`
- [ ] (TEST) GitHub callback redirects to stored `return_to` after session creation and clears the cookie.
  - Verify: `cd ../.. && pnpm --filter web test -- github-oauth-callback`
- [ ] (TEST) Existing GitHub login without `return_to` still redirects to `/projects`.
  - Verify: `cd ../.. && pnpm --filter web test -- github-oauth github-oauth-redirect`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/api/auth/github/route.ts` - Accept and validate `return_to`.
- `apps/web/app/api/auth/github/callback/route.ts` - Redirect to and clear stored return path.
- `apps/web/lib/auth/cookies.ts` - Add return-path cookie helpers.
- `apps/web/tests/github-oauth-redirect.test.ts` - Safe return path coverage.
- `apps/web/tests/github-oauth-callback.test.ts` - Callback redirect/clear coverage.

**Existing Code to Reference:**
- `apps/web/lib/auth/cookies.ts` - Existing cookie naming/options.
- `apps/web/lib/auth/github-oauth.ts` - Existing GitHub OAuth URL generation.

**Dependencies:**
- Task 1.2.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Extend existing GitHub OAuth routes"

**Browser Verification:**
- Criteria IDs: None
- Notes: Redirect behavior is route-tested.

---

### Phase 1 Checkpoint

**Automated Checks:**
- [ ] (TEST) OAuth, schema, migration, project query, and GitHub OAuth regression tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- schema migrations mcp-project-queries mcp-oauth github-oauth`
- [ ] (TYPE) Web type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (LINT) Web linting passes.
  - Verify: `cd ../.. && pnpm --filter web lint`

**Regression Verification:**
- [ ] (TEST) Existing GitHub installation and callback behavior still passes.
  - Verify: `cd ../.. && pnpm --filter web test -- github-callback-api github-webhook-installation-handler github-oauth`
- [ ] (CODE) No OAuth module logs raw tokens, codes, or submitted repo file content.
  - Verify: `cd ../.. && ! rg -n 'console\\.(log|info|warn|error).*token|console\\.(log|info|warn|error).*code|console\\.(log|info|warn|error).*files' apps/web/lib/oauth apps/web/app/api/oauth`

---

## Phase 2: MCP Install Patch Tool

**Goal:** Add the authenticated MCP endpoint and implement `prepare_nextjs_install_patch` with secure repo context validation, project reuse, and unified-diff SDK patch generation.
**Depends On:** Phase 1

### Pre-Phase Setup

- [ ] (CODE) OAuth token verification and MCP project helpers exist before MCP route work starts.
  - Verify: `cd ../.. && test -f apps/web/lib/oauth/tokens.ts && rg -q 'createOrReuseMcpProject' apps/web/lib/db/queries/projects.ts`
- [ ] (CODE) MCP dependencies are installed in the web package.
  - Verify: `cd ../.. && node -e "const p=require('./apps/web/package.json'); if(!p.dependencies['@modelcontextprotocol/sdk']||!p.dependencies['mcp-handler']) process.exit(1)"`

### Step 2.1: MCP Endpoint and Request Boundary

**Depends On:** Phase 1

---

#### Task 2.1.A: Add Authenticated MCP Route

**Description:**
Create the web app MCP route using `mcp-handler`, validate bearer tokens through the OAuth token store, and require the `mcp:install` scope before any tool can run. The route returns OAuth-required behavior for missing or invalid credentials.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "MCP Route"; FEATURE_SPEC.md "MCP Tool Behavior"

**Acceptance Criteria:**
- [ ] (CODE) MCP route and server/auth modules exist.
  - Verify: `cd ../.. && test -f apps/web/app/api/mcp/route.ts && test -f apps/web/lib/mcp/server.ts && test -f apps/web/lib/mcp/auth.ts`
- [ ] (CODE) MCP route uses Node runtime and creates an MCP handler with auth wrapping.
  - Verify: `cd ../.. && rg -q 'runtime.*nodejs|mcpHandler|withMcpAuth|mcp:install' apps/web/app/api/mcp/route.ts apps/web/lib/mcp`
- [ ] (TEST) Missing and invalid bearer tokens are rejected and do not create projects.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-auth`
- [ ] (TEST) Valid bearer tokens map to user ID, client ID, resource, and `mcp:install` scope.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-auth`
- [ ] (TEST) MCP route exposes a minimal authenticated tool-list or smoke path without invoking patch generation.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route`

**Files to Create:**
- `apps/web/app/api/mcp/route.ts` - Streamable HTTP MCP route.
- `apps/web/lib/mcp/auth.ts` - Bearer token validation and scope checks.
- `apps/web/lib/mcp/server.ts` - MCP server/tool registration.
- `apps/web/tests/mcp-auth.test.ts` - MCP auth coverage.
- `apps/web/tests/mcp-route.test.ts` - MCP route smoke coverage.

**Files to Modify:**
- None

**Existing Code to Reference:**
- `apps/web/app/api/projects/route.ts` - Existing authenticated route pattern.
- `apps/web/lib/auth/get-user.ts` - Existing user lookup boundary.
- `apps/web/tests/get-user.test.ts` - Auth test style.

**Dependencies:**
- Phase 1

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "MCP Route"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP route is API/protocol-level and covered by route tests.

---

#### Task 2.1.B: Validate MCP Repo Context Boundary

**Description:**
Add Zod schemas and context parsing for `prepare_nextjs_install_patch` input. Reject disallowed paths, `.env*`, lockfiles, private keys, credentials, binary content, unrelated files, per-file content over 64 KB, and total content over 256 KB before project creation or patch generation.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "MCP Tool Input Schema"; FEATURE_SPEC.md "Repo Context Boundary"

**Acceptance Criteria:**
- [ ] (CODE) MCP tool input schemas exist and include repo, framework, and files fields.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/tools/schemas.ts && rg -q 'repo|framework|files|appRoot|dependencyTarget' apps/web/lib/mcp/tools/schemas.ts`
- [ ] (TEST) Allowed minimal App Router and Pages Router file sets pass validation.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-repo-context`
- [ ] (TEST) `.env*`, lockfiles, private keys, absolute paths, traversal paths, URL schemes, Windows drive prefixes, unrelated files, binary content, and size-limit violations fail validation.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-repo-context`
- [ ] (TEST) `.tsx` and `.jsx` selected entrypoints are accepted while unsupported entrypoint extensions are rejected.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-repo-context`
- [ ] (CODE) Validation runs before MCP project creation or patch generation.
  - Verify: `cd ../.. && rg -n 'parse|safeParse|validateRepoContext' apps/web/lib/mcp/tools apps/web/lib/mcp/next-install`

**Files to Create:**
- `apps/web/lib/mcp/tools/schemas.ts` - Zod request/response schemas.
- `apps/web/lib/mcp/next-install/context.ts` - Request boundary normalization and validation.
- `apps/web/tests/mcp-repo-context.test.ts` - Context boundary tests.

**Files to Modify:**
- `apps/web/lib/mcp/server.ts` - Wire schema into tool registration if created in Task 2.1.A.

**Existing Code to Reference:**
- `apps/web/lib/github/detection.ts` - Existing file analysis assumptions to avoid.
- `apps/web/tests/github-detection.test.ts` - Fixture-heavy validation test style.

**Dependencies:**
- Task 2.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "MCP Tool Input Schema"

**Browser Verification:**
- Criteria IDs: None
- Notes: Input validation is covered by unit tests.

---

### Step 2.2: Next.js Install Service

**Depends On:** Step 2.1

---

#### Task 2.2.A: Build Next.js Detection and Project Reuse Service

**Description:**
Implement the install service skeleton that selects the target package JSON and entrypoint from the supplied context, detects supported Next.js App Router/Pages Router targets, normalizes remotes, and creates or reuses an active MCP project for the authenticated user.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Next.js Install Service" and "Project Reuse Implementation"; FEATURE_SPEC.md "V1 Supported Targets"

**Acceptance Criteria:**
- [ ] (CODE) Next install detection and project reuse modules exist.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/next-install/detect.ts && test -f apps/web/lib/mcp/next-install/project-reuse.ts && test -f apps/web/lib/mcp/next-install/prepare-nextjs-install-patch.ts`
- [ ] (TEST) App Router, Pages Router, root app, `src` app, and explicit monorepo app roots are detected from supplied files.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) Non-Next, missing package, missing entrypoint, ambiguous monorepo, unsupported framework, and app-router/pages-router ambiguity produce structured unsupported results.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) Remote and no-remote project reuse paths return existing project IDs and dashboard URLs when exactly one match exists.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install mcp-project-queries`
- [ ] (TEST) Multiple project matches return `unsupported` with reason `multiple_matching_projects`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install mcp-project-queries`

**Files to Create:**
- `apps/web/lib/mcp/next-install/detect.ts` - Supported Next.js target detection from supplied context.
- `apps/web/lib/mcp/next-install/project-reuse.ts` - MCP project reuse adapter for install flow.
- `apps/web/lib/mcp/next-install/prepare-nextjs-install-patch.ts` - Install service orchestration.
- `apps/web/tests/mcp-next-install.test.ts` - Install service tests.

**Files to Modify:**
- `apps/web/lib/db/queries/projects.ts` - Adjust MCP helper shape if install service requires a narrower adapter.

**Existing Code to Reference:**
- `apps/web/lib/github/detect-framework.ts` - Existing Next.js detection concepts.
- `apps/web/lib/github/detection.ts` - Existing dependency/analytics detection concepts.
- `apps/web/tests/detect-framework.test.ts` - Detection test style.

**Dependencies:**
- Task 1.1.C
- Task 2.1.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Next.js Install Service"

**Browser Verification:**
- Criteria IDs: None
- Notes: Install service is unit/fixture tested.

---

#### Task 2.2.B: Generate SDK Wrapper Templates and Entrypoint Edits

**Description:**
Generate SDK-based wrapper files for App Router and Pages Router, infer `.tsx` vs `.jsx` from the selected entrypoint, update only the target app package, and insert the wrapper import/mount into the selected entrypoint while preserving existing content.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Patch Templates"; FEATURE_SPEC.md "Patch Requirements"

**Acceptance Criteria:**
- [ ] (CODE) Template and package JSON helpers exist.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/next-install/templates.ts && test -f apps/web/lib/mcp/next-install/package-json.ts`
- [ ] (TEST) App Router output creates `TallyAnalytics`, imports `AnalyticsAppRouter` and `init` from `@tally-analytics/sdk`, and inserts `<TallyAnalytics />` before `</body>`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) Pages Router output creates `useTallyAnalytics`, imports `useAnalyticsPagesRouter` and `init` from `@tally-analytics/sdk`, and calls `useTallyAnalytics();` inside the default App function.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) `.tsx` fixtures emit `tally-analytics.tsx` and `.jsx` fixtures emit `tally-analytics.jsx` with no TypeScript-only syntax.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) Package JSON edits add `@tally-analytics/sdk` only to the target app `dependencies`, preserve other version ranges, and do not create lockfile edits in returned diffs.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`

**Files to Create:**
- `apps/web/lib/mcp/next-install/templates.ts` - Wrapper rendering and entrypoint edit helpers.
- `apps/web/lib/mcp/next-install/package-json.ts` - Dependency update helper.

**Files to Modify:**
- `apps/web/lib/github/templates/insert-analytics.ts` - Generalize only if needed for MCP insertion helpers.
- `apps/web/lib/github/templates/paths.ts` - Generalize basename only if reuse is safer than MCP-specific path helper.
- `apps/web/tests/github-insertion.test.ts` - Add regression coverage if shared insertion helpers change.
- `apps/web/tests/mcp-next-install.test.ts` - Add wrapper/package edit coverage.

**Existing Code to Reference:**
- `packages/sdk/src/react/app-router.tsx` - App Router SDK component.
- `packages/sdk/src/react/pages-router.tsx` - Pages Router SDK hook.
- `apps/web/lib/github/templates/insert-analytics.ts` - Existing import/mount insertion helpers.

**Dependencies:**
- Task 2.2.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Patch Templates"

**Browser Verification:**
- Criteria IDs: None
- Notes: Generated app fixtures are verified by tests and `git apply --check`.

---

#### Task 2.2.C: Add Unified Diff Builder and Fixture Matrix

**Description:**
Implement a narrow internal unified diff builder for full-file replacements and new files. Add fixture directories covering root/src App Router, root/src Pages Router, `.jsx`, non-Next, ambiguous monorepo, already-installed, and existing-conflict cases.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Patch Generation"; FEATURE_SPEC.md "Patch Contract"

**Acceptance Criteria:**
- [ ] (CODE) Unified diff builder exists and is used by the install service.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/next-install/unified-diff.ts && rg -q 'unifiedDiff|unified_diff_v1' apps/web/lib/mcp/next-install`
- [ ] (CODE) Required fixture directories exist under `apps/web/tests/fixtures/mcp-nextjs/`.
  - Verify: `cd ../.. && for d in app-router-root pages-router-root app-router-src pages-router-src app-router-jsx pages-router-jsx non-next ambiguous-monorepo already-installed existing-conflict; do test -d apps/web/tests/fixtures/mcp-nextjs/$d || exit 1; done`
- [ ] (TEST) Ready fixture diffs pass `git apply --check` in a temporary git repo.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) `already_installed`, `existing_integration_conflict`, `needs_context`, and unsupported reason responses match the API contract.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) Generated diffs contain only the target package JSON, wrapper file, and selected entrypoint for supported fixtures.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`

**Files to Create:**
- `apps/web/lib/mcp/next-install/unified-diff.ts` - Internal unified diff builder.
- `apps/web/tests/fixtures/mcp-nextjs/app-router-root/` - Root App Router fixture.
- `apps/web/tests/fixtures/mcp-nextjs/pages-router-root/` - Root Pages Router fixture.
- `apps/web/tests/fixtures/mcp-nextjs/app-router-src/` - `src/app` fixture.
- `apps/web/tests/fixtures/mcp-nextjs/pages-router-src/` - `src/pages` fixture.
- `apps/web/tests/fixtures/mcp-nextjs/app-router-jsx/` - App Router `.jsx` fixture.
- `apps/web/tests/fixtures/mcp-nextjs/pages-router-jsx/` - Pages Router `.jsx` fixture.
- `apps/web/tests/fixtures/mcp-nextjs/non-next/` - Unsupported framework fixture.
- `apps/web/tests/fixtures/mcp-nextjs/ambiguous-monorepo/` - Ambiguous monorepo fixture.
- `apps/web/tests/fixtures/mcp-nextjs/already-installed/` - Already installed fixture.
- `apps/web/tests/fixtures/mcp-nextjs/existing-conflict/` - Existing conflict fixture.

**Files to Modify:**
- `apps/web/tests/mcp-next-install.test.ts` - Add diff and fixture matrix coverage.
- `apps/web/lib/mcp/next-install/prepare-nextjs-install-patch.ts` - Use unified diff builder.

**Existing Code to Reference:**
- `apps/web/tests/github-generate.test.ts` - Generated-output test patterns.
- `apps/web/tests/github-templates.test.ts` - Template test patterns.

**Dependencies:**
- Task 2.2.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Patch Generation" and "Integration/E2E Fixtures"

**Browser Verification:**
- Criteria IDs: None
- Notes: Diff application is verified with `git apply --check`.

---

#### Task 2.2.D: Wire `prepare_nextjs_install_patch` MCP Tool

**Description:**
Register `prepare_nextjs_install_patch` as the primary MCP tool and return structured JSON plus concise text content for ready, unsupported, needs-context, and already-installed states. Ensure no project is created until OAuth succeeds and repo context validation passes.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "API Contracts"; FEATURE_SPEC.md "MCP Tool Behavior"

**Acceptance Criteria:**
- [ ] (CODE) MCP tool module exists and is registered by the MCP server.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts && rg -q 'prepare_nextjs_install_patch' apps/web/lib/mcp`
- [ ] (TEST) Unauthenticated MCP requests cannot create projects and return OAuth-required behavior.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route mcp-auth`
- [ ] (TEST) Authenticated ready responses include `status`, `projectId`, `dashboardUrl`, `patchFormat`, `unifiedDiff`, `filesChanged`, `packageInstallCommand`, and verification checklist.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install mcp-route`
- [ ] (TEST) Unsupported, needs-context, and already-installed responses match the documented JSON shapes.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install mcp-route`
- [ ] (CODE) MCP modules do not log submitted file contents, generated diffs, auth codes, access tokens, or refresh tokens.
  - Verify: `cd ../.. && ! rg -n 'console\\.(log|info|warn|error).*(files|unifiedDiff|access_token|refresh_token|auth code|code)' apps/web/lib/mcp apps/web/app/api/mcp`

**Files to Create:**
- `apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts` - MCP tool registration and response shaping.

**Files to Modify:**
- `apps/web/lib/mcp/server.ts` - Register the tool.
- `apps/web/tests/mcp-route.test.ts` - Add tool registration and auth boundary coverage.
- `apps/web/tests/mcp-next-install.test.ts` - Add full response shape coverage if not already included.

**Existing Code to Reference:**
- `apps/web/lib/mcp/server.ts` - MCP server created in Task 2.1.A.
- `apps/web/lib/mcp/next-install/prepare-nextjs-install-patch.ts` - Install service output.

**Dependencies:**
- Task 2.1.A
- Task 2.1.B
- Task 2.2.C

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "prepare_nextjs_install_patch"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP protocol behavior is route-tested.

---

### Phase 2 Checkpoint

**Automated Checks:**
- [ ] (TEST) MCP route, auth, repo context, project reuse, install service, and diff fixture tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-auth mcp-route mcp-repo-context mcp-project-queries mcp-next-install`
- [ ] (TYPE) Web type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (LINT) Web linting passes.
  - Verify: `cd ../.. && pnpm --filter web lint`

**Regression Verification:**
- [ ] (TEST) Existing GitHub detection, insertion, template, and generation tests still pass.
  - Verify: `cd ../.. && pnpm --filter web test -- detect-framework github-detection github-insertion github-templates github-generate`
- [ ] (TEST) SDK tests still pass without SDK source changes.
  - Verify: `cd ../.. && pnpm --filter sdk test`

---

## Phase 3: Product Surface and Regression Hardening

**Goal:** Make MCP-created projects visible and usable in the dashboard, expose the MCP onboarding path, add account-free scenario coverage, and run the full regression set.
**Depends On:** Phase 2

### Pre-Phase Setup

- [ ] (CODE) MCP install tool and fixture tests exist before UI/API work starts.
  - Verify: `cd ../.. && test -f apps/web/lib/mcp/tools/prepare-nextjs-install-patch.ts && test -f apps/web/tests/mcp-next-install.test.ts`
- [ ] (CODE) Project schema includes `displayName` and `source`.
  - Verify: `cd ../.. && rg -q 'displayName|source' apps/web/lib/db/schema.ts`

### Step 3.1: Project API and Dashboard Data

**Depends On:** Phase 2

---

#### Task 3.1.A: Update Project List and Detail API Contracts

**Description:**
Make MCP projects first-class in project list/detail APIs by returning `displayName`, `source`, nullable `githubRepoFullName`, and `actions.canRegenerate`. Keep GitHub App projects backward-compatible where existing tests rely on GitHub data.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Project List and Detail APIs"; FEATURE_SPEC.md "Product Surface"

**Acceptance Criteria:**
- [ ] (CODE) Project list and detail responses include `displayName`, `source`, nullable `githubRepoFullName`, and `actions.canRegenerate`.
  - Verify: `cd ../.. && rg -q 'displayName|canRegenerate|githubRepoFullName|source' apps/web/app/api/projects/route.ts 'apps/web/app/api/projects/[id]/route.ts'`
- [ ] (TEST) Project list API tests cover GitHub App and MCP project rows.
  - Verify: `cd ../.. && pnpm --filter web test -- projects-list-api`
- [ ] (TEST) Project detail API tests cover GitHub App and MCP project rows.
  - Verify: `cd ../.. && pnpm --filter web test -- project-detail-api`
- [ ] (TEST) Regenerate route rejects MCP projects or projects with null GitHub fields with a `400` JSON response.
  - Verify: `cd ../.. && pnpm --filter web test -- regenerate-api`
- [ ] (TEST) Existing analytics API routes still resolve MCP-created active project IDs with local fixtures.
  - Verify: `cd ../.. && pnpm --filter web test -- analytics-live-feed-api analytics-overview-api analytics-sessions-api`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/api/projects/route.ts` - Add display/source/action response fields.
- `apps/web/app/api/projects/[id]/route.ts` - Add display/source/action response fields.
- `apps/web/app/api/projects/[id]/regenerate/route.ts` - Gate GitHub-only regeneration.
- `apps/web/tests/projects-list-api.test.ts` - Add MCP row coverage.
- `apps/web/tests/project-detail-api.test.ts` - Add MCP row coverage.
- `apps/web/tests/regenerate-api.test.ts` - Add MCP rejection coverage.

**Existing Code to Reference:**
- `apps/web/app/api/projects/route.ts` - Existing list response shape.
- `apps/web/app/api/projects/[id]/route.ts` - Existing detail response shape.
- `apps/web/app/api/projects/[id]/regenerate/route.ts` - Existing GitHub reanalysis path.

**Dependencies:**
- Task 1.1.B
- Task 1.1.C

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Project List and Detail APIs"

**Browser Verification:**
- Criteria IDs: None
- Notes: API behavior is route-tested; visible rendering is covered in Task 3.1.B.

---

#### Task 3.1.B: Update Dashboard Rendering for MCP Projects

**Description:**
Update project hooks, cards, layouts, detail pages, and action visibility to use `displayName` as the primary title and tolerate nullable GitHub fields. Hide or disable GitHub-only regeneration UI for MCP-created projects.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Project Cards, Headers, and Actions"; FEATURE_SPEC.md "Product Surface"

**Acceptance Criteria:**
- [ ] (CODE) Project hooks/types expose `displayName`, `source`, nullable `githubRepoFullName`, and `actions.canRegenerate`.
  - Verify: `cd ../.. && rg -q 'displayName|source|canRegenerate|githubRepoFullName: string \\| null' apps/web/lib/hooks/use-projects.ts apps/web/lib/hooks/use-project.ts`
- [ ] (TEST) Project list page/card tests render `displayName` for MCP projects with null GitHub repo names.
  - Verify: `cd ../.. && pnpm --filter web test -- projects-list-page`
- [ ] (TEST) Project layout and detail page tests render MCP `displayName` in headers/breadcrumbs and do not render empty titles.
  - Verify: `cd ../.. && pnpm --filter web test -- project-layout project-detail-page`
- [ ] (TEST) MCP projects do not render regenerate/reanalyze controls.
  - Verify: `cd ../.. && pnpm --filter web test -- project-detail-page project-layout`
- [ ] (TEST) Existing GitHub App project rendering still shows GitHub repo context and eligible actions.
  - Verify: `cd ../.. && pnpm --filter web test -- projects-list-page project-detail-page project-layout`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/lib/hooks/use-projects.ts` - Update list item type.
- `apps/web/lib/hooks/use-project.ts` - Update detail type if present.
- `apps/web/components/dashboard/project-card.tsx` - Render `displayName`.
- `apps/web/app/(dashboard)/projects/[id]/layout.tsx` - Render display name in layout.
- `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Gate GitHub-only actions.
- `apps/web/tests/projects-list-page.test.ts` - MCP display coverage.
- `apps/web/tests/project-layout.test.ts` - MCP layout coverage.
- `apps/web/tests/project-detail-page.test.ts` - MCP action gating coverage.

**Existing Code to Reference:**
- `apps/web/components/dashboard/project-card.tsx` - Existing project card structure.
- `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Existing status/action rendering.
- `apps/web/tests/project-layout.test.ts` - Existing null `githubRepoFullName` test patterns.

**Dependencies:**
- Task 3.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Project Cards, Headers, and Actions"

**Browser Verification:**
- Criteria IDs: None
- Notes: Browser verification for MCP project rendering is deferred to the Phase 3 checkpoint after Task 3.2.C creates seeded MCP scenarios.

---

### Step 3.2: Onboarding Surface and Pending State

**Depends On:** Step 3.1

---

#### Task 3.2.A: Add MCP Setup Path to Docs and Empty State

**Description:**
Expose the hosted MCP server URL and Codex command on docs/setup and the projects empty state. Preserve the existing GitHub App path and use the exact MCP copy from the specs.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Docs Setup" and "Projects Empty State"; FEATURE_SPEC.md "Product Surface"

**Acceptance Criteria:**
- [ ] (CODE) Docs setup page contains `codex mcp add tally --url https://usetally.xyz/api/mcp`.
  - Verify: `cd ../.. && rg -q 'codex mcp add tally --url https://usetally.xyz/api/mcp' 'apps/web/app/(marketing)/docs/setup/page.tsx'`
- [ ] (CODE) Docs setup page keeps the GitHub App setup path.
  - Verify: `cd ../.. && rg -q 'Connect GitHub|get a PR|GitHub App' 'apps/web/app/(marketing)/docs/setup/page.tsx'`
- [ ] (TEST) Marketing docs tests cover the MCP command and existing GitHub App path.
  - Verify: `cd ../.. && pnpm --filter web test -- marketing-docs-pages`
- [ ] (CODE) Projects empty state contains `Using Codex? Add Tally from your coding agent.` and the MCP command.
  - Verify: `cd ../.. && rg -q 'Using Codex\\? Add Tally from your coding agent\\.|codex mcp add tally --url https://usetally.xyz/api/mcp' 'apps/web/app/(dashboard)/projects/page.tsx'`
- [ ] (TEST) Projects list page tests cover both GitHub App and MCP onboarding paths in the empty state.
  - Verify: `cd ../.. && pnpm --filter web test -- projects-list-page`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/(marketing)/docs/setup/page.tsx` - Add MCP setup command/path.
- `apps/web/app/(dashboard)/projects/page.tsx` - Add MCP empty-state CTA/command.
- `apps/web/tests/marketing-docs-pages.test.ts` - Docs setup coverage.
- `apps/web/tests/projects-list-page.test.ts` - Empty-state coverage.

**Existing Code to Reference:**
- `apps/web/app/(marketing)/docs/sdk/page.tsx` - Existing docs presentation style.
- `apps/web/app/(dashboard)/projects/page.tsx` - Existing empty-state rendering.

**Dependencies:**
- Task 3.1.B

**Spec Reference:** FEATURE_SPEC.md "MCP Setup Flow" and "Product Surface"

**Browser Verification:**
- Criteria IDs:
  - `BV-3.2.A-docs-command`
  - `BV-3.2.A-empty-state-command`
- Notes: Verify visible copy on `/docs/setup` and `/projects` with an empty seeded account.

---

#### Task 3.2.B: Add Waiting-for-First-Event State

**Description:**
Show the exact pending copy for active projects with no received production events on the project detail surface and live feed. Keep generic "No events yet" behavior only for contexts outside the MCP-created active/no-event state.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Project Pending State"; FEATURE_SPEC.md "User-Facing Done State"

**Acceptance Criteria:**
- [ ] (CODE) Project detail and live feed surfaces include the exact pending copy.
  - Verify: `cd ../.. && rg -q 'Waiting for first event\\. Tally is installed, but no production events have been received yet\\.' 'apps/web/app/(dashboard)/projects/[id]/page.tsx' 'apps/web/app/(dashboard)/projects/[id]/live/page.tsx'`
- [ ] (TEST) Project detail page tests cover active project with null `lastEventAt`.
  - Verify: `cd ../.. && pnpm --filter web test -- project-detail-page`
- [ ] (TEST) Live feed page tests cover active project with null `lastEventAt`.
  - Verify: `cd ../.. && pnpm --filter web test -- live-feed-page`
- [ ] (TEST) Existing live feed behavior with fixture events still renders event rows.
  - Verify: `cd ../.. && pnpm --filter web test -- live-feed-page live-event`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Add project detail pending state.
- `apps/web/app/(dashboard)/projects/[id]/live/page.tsx` - Add live feed pending state.
- `apps/web/tests/project-detail-page.test.ts` - Pending state coverage.
- `apps/web/tests/live-feed-page.test.ts` - Pending state coverage.

**Existing Code to Reference:**
- `apps/web/app/(dashboard)/projects/[id]/live/page.tsx` - Existing empty feed rendering.
- `apps/web/tests/live-feed-page.test.ts` - Existing live-feed test style.

**Dependencies:**
- Task 3.1.A

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Project Pending State"

**Browser Verification:**
- Criteria IDs: None
- Notes: Browser verification for the pending state is deferred to the Phase 3 checkpoint after Task 3.2.C creates seeded MCP scenarios.

---

#### Task 3.2.C: Add Local MCP Scenario Fixtures

**Description:**
Extend the agent testing harness with MCP-created active project scenarios: one with no events and one with replayable fixture events. This makes dashboard and API behavior testable without a human GitHub account.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Integration/E2E Fixtures"; root AGENTS.md "Agent Testing Harness"

**Acceptance Criteria:**
- [ ] (CODE) E2E scenario files exist for MCP active no-event and MCP active with fixture events states.
  - Verify: `cd ../.. && ls apps/web/e2e/scenarios | rg -q 'mcp.*(no-events|with-events)|mcp.*active'`
- [ ] (TEST) Scenario listing includes the new MCP scenarios.
  - Verify: `cd ../.. && pnpm --filter web e2e:scenarios | rg -q 'mcp'`
- [ ] (TEST) E2E scenario unit tests validate MCP project fields, nullable GitHub fields, and local analytics fixture wiring.
  - Verify: `cd ../.. && pnpm --filter web test -- e2e-scenarios e2e-analytics-fixtures`
- [ ] (TEST) Seed and replay commands work for the MCP with-events scenario against a local database URL.
  - Verify: `cd ../.. && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres pnpm --filter web e2e:seed mcp-active-with-events`
- [ ] (TEST) Browser scenario grep coverage can target MCP project pages.
  - Verify: `cd ../.. && E2E_TEST_MODE=1 pnpm --filter web e2e --grep @scenario`

**Files to Create:**
- `apps/web/e2e/scenarios/mcp-active-no-events.json` - MCP-created project with no events.
- `apps/web/e2e/scenarios/mcp-active-with-events.json` - MCP-created project with local analytics fixtures.

**Files to Modify:**
- `apps/web/scripts/seed-e2e-scenario.mjs` - Support MCP project source/null GitHub fields if needed.
- `apps/web/tests/e2e-scenarios.test.ts` - Validate MCP scenario shape.
- `apps/web/tests/e2e-analytics-fixtures.test.ts` - Validate MCP event fixture behavior if needed.

**Existing Code to Reference:**
- `docs/agent-testing.md` - Account-free local testing instructions.
- `apps/web/e2e/scenarios/*.json` - Existing scenario schema.
- `apps/web/scripts/seed-e2e-scenario.mjs` - Existing seeding behavior.

**Dependencies:**
- Task 3.1.A
- Task 3.2.B

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Integration/E2E Fixtures"

**Browser Verification:**
- Criteria IDs:
  - `BV-3.2.C-seeded-projects`
- Notes: Use seeded scenarios to drive browser checks from Tasks 3.1.B, 3.2.A, and 3.2.B.

---

### Step 3.3: Full Feature Verification

**Depends On:** Step 3.2

---

#### Task 3.3.A: Run Full Regression and Bundle Verification

**Description:**
Run the complete verification matrix required by the technical spec and confirm the feature did not regress the GitHub App flow, dashboard analytics, events ingestion, or SDK package. Measure SDK bundle size only if SDK source changed.

**Requirement:** FEATURE_TECHNICAL_SPEC.md "Verification Commands"; root AGENTS.md "SDK Constraints"

**Acceptance Criteria:**
- [ ] (TEST) Full web Vitest suite passes.
  - Verify: `cd ../.. && pnpm --filter web test`
- [ ] (TYPE) Web type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (BUILD) Web build passes.
  - Verify: `cd ../.. && pnpm --filter web build`
- [ ] (TEST) SDK tests pass.
  - Verify: `cd ../.. && pnpm --filter sdk test`
- [ ] (BUILD) SDK build passes, and SDK gzip size is checked if files under `packages/sdk/src` changed.
  - Verify: `cd ../.. && pnpm --filter sdk build && (git diff --name-only -- packages/sdk/src | grep -q . && gzip -c packages/sdk/dist/index.js | wc -c || true)`

**Files to Create:**
- None

**Files to Modify:**
- `features/mcp_onboarding/EXECUTION_PLAN.md` - Mark completed task checkboxes after verification.

**Existing Code to Reference:**
- Root `AGENTS.md` - SDK bundle-size rule.
- `apps/web/package.json` - Verification commands.
- `packages/sdk/package.json` - SDK verification commands.

**Dependencies:**
- Task 3.2.C

**Spec Reference:** FEATURE_TECHNICAL_SPEC.md "Verification Commands"

**Browser Verification:**
- Criteria IDs: None
- Notes: Browser checks are covered by scenario-backed task criteria and `pnpm --filter web e2e --grep @scenario`.

---

#### Task 3.3.B: Verify End-to-End MCP Install Contract

**Description:**
Exercise the feature as close to the intended Codex flow as local automation allows: authenticated MCP tool call, generated patch response, `git apply --check` against fixtures, dashboard URL response, and deployment verification instructions. Do not claim production telemetry is proven locally.

**Requirement:** FEATURE_SPEC.md "Happy Path"; FEATURE_TECHNICAL_SPEC.md "Requirement Coverage"

**Acceptance Criteria:**
- [ ] (TEST) Authenticated tool-call tests cover ready responses for supported App Router and Pages Router fixtures.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-route mcp-next-install`
- [ ] (TEST) Local fixture tests prove `git apply --check` succeeds for every ready response.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (TEST) Tool response tests include dashboard URL and the deployment verification checklist.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install mcp-route`
- [ ] (TEST) Rerunning against an already-installed fixture returns `already_installed`, existing project ID, existing dashboard URL, and empty `unifiedDiff`.
  - Verify: `cd ../.. && pnpm --filter web test -- mcp-next-install`
- [ ] (CODE) Completion copy does not claim local automation proves production events before deployment.
  - Verify: `cd ../.. && ! rg -n 'production events (verified|confirmed|proven)|telemetry (verified|confirmed|proven)' apps/web/lib/mcp apps/web/app`

**Files to Create:**
- None

**Files to Modify:**
- `apps/web/tests/mcp-route.test.ts` - End-to-end authenticated tool-call coverage if not already complete.
- `apps/web/tests/mcp-next-install.test.ts` - End-to-end fixture coverage if not already complete.

**Existing Code to Reference:**
- `features/mcp_onboarding/FEATURE_SPEC.md` - Happy path and done-state language.
- `features/mcp_onboarding/FEATURE_TECHNICAL_SPEC.md` - API contract and verification checklist.

**Dependencies:**
- Task 2.2.D
- Task 3.2.C

**Spec Reference:** FEATURE_SPEC.md "Happy Path" and "Acceptance Criteria"

**Browser Verification:**
- Criteria IDs: None
- Notes: MCP install contract is verified by route and fixture tests.

---

### Phase 3 Checkpoint

**Automated Checks:**
- [ ] (TEST) Full web test suite passes.
  - Verify: `cd ../.. && pnpm --filter web test`
- [ ] (TYPE) Web type checking passes.
  - Verify: `cd ../.. && pnpm --filter web typecheck`
- [ ] (BUILD) Web build passes.
  - Verify: `cd ../.. && pnpm --filter web build`
- [ ] (TEST) SDK tests pass.
  - Verify: `cd ../.. && pnpm --filter sdk test`
- [ ] (BUILD) SDK build passes.
  - Verify: `cd ../.. && pnpm --filter sdk build`

**Regression Verification:**
- [ ] (TEST) GitHub App OAuth, installation, webhook, detection, generation, regenerate, and dashboard tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- github oauth installation webhook detection generate regenerate project`
- [ ] (TEST) Events ingestion and analytics fixture tests pass.
  - Verify: `cd ../.. && pnpm --filter web test -- events analytics tinybird e2e-analytics-fixtures`
- [ ] (BROWSER:DOM) Docs setup page displays the MCP command and the GitHub App path.
  - Verify: route=`/docs/setup`, selector=`body`, expect=`codex mcp add tally --url https://usetally.xyz/api/mcp`
- [ ] (BROWSER:DOM) Seeded MCP no-event project displays the exact waiting-for-first-event copy.
  - Verify: route=`/projects/{mcpProjectId}`, selector=`body`, expect=`Waiting for first event. Tally is installed, but no production events have been received yet.`
