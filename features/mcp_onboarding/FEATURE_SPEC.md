# Feature Spec: MCP-First Analytics Onboarding

## Overview

MCP-first analytics onboarding lets a developer add Tally analytics from inside an AI coding agent instead of starting from the Tally website or installing the GitHub App.

For v1, the primary client is Codex CLI/local Codex. The user connects the hosted Tally MCP server, authenticates with Tally through MCP OAuth, asks Codex to add analytics, and receives a Tally-generated SDK patch bundle that Codex applies to the local Next.js app. The user then deploys the app and uses a Tally dashboard URL to confirm events once real traffic arrives.

This feature is an activation-focused extension of the existing Tally product. It does not replace the current GitHub App flow in v1.

## Problem

The current onboarding model asks users to begin on the Tally website, authenticate, install a GitHub App, select repos, wait for remote analysis, and review a generated PR. That is useful for hosted PR workflows, but it adds friction for developers already working inside AI coding agents.

The new flow should let a developer say "add analytics" from their coding environment and get a working, reviewable local patch without installing the GitHub App first.

## Users

Primary users:
- Developers building Next.js apps with AI coding agents.
- Developers using Codex CLI/local Codex as their coding environment.
- Solo founders and early-stage builders who want low-configuration analytics setup.

Secondary users:
- Existing Tally users who want an agent-native way to install analytics into another app.
- Existing website-first users who may later use MCP for additional setup or analysis, though that is not part of v1.

## Goals

- Let a user start Tally setup from Codex rather than from the website.
- Require only one Tally OAuth login for the v1 MCP flow.
- Avoid requiring GitHub App installation for first value.
- Create or reuse a real Tally project owned by the authenticated user.
- Return a Tally-controlled SDK patch bundle using the v1 unified-diff contract.
- Let Codex apply the patch locally and run local verification where possible.
- Give the user a dashboard URL and clear deployment verification instructions.
- Preserve the existing GitHub App onboarding flow while introducing MCP as an additional path.

## Non-Goals

- No prompt-configured dashboard/report builder in this feature.
- No custom event or "track signups" instrumentation.
- No API key fallback for MCP clients that do not support OAuth.
- No anonymous projects.
- No placeholder project IDs.
- No GitHub App install requirement for the v1 MCP setup path.
- No hosted PR creation from Tally in v1.
- No arbitrary framework support beyond supported Next.js targets.
- No manual fallback instructions for unsupported repositories.
- No automatic proof of production telemetry before the user deploys.

## Core User Experience

### MCP Setup Flow

The Tally docs/setup page and dashboard empty state should show the hosted MCP server URL and the Codex command:

```bash
codex mcp add tally --url https://usetally.xyz/api/mcp
```

The first authenticated tool call should trigger MCP OAuth when the client is not already logged in. The OAuth browser flow should create a Tally account when the identity is new, or link to the existing Tally account when the identity matches an existing user. Project creation must happen only after OAuth succeeds.

If OAuth succeeds, Codex can call `prepare_nextjs_install_patch`. If OAuth fails, is cancelled, or the MCP client does not support OAuth, the MCP tool must not create a project and should return a structured authentication error or unsupported result.

### Happy Path

1. User has a Next.js app open in Codex.
2. User adds the Tally MCP server to Codex using the documented MCP URL.
3. User authenticates with Tally through MCP OAuth.
4. User asks Codex to add Tally analytics.
5. Codex inspects the local repo and sends repo context to Tally through the MCP tool.
6. Tally creates or reuses a project owned by the authenticated user.
7. Tally returns a Tally-generated SDK patch bundle in the v1 unified-diff format.
8. Codex applies the patch locally.
9. Codex runs local verification where it can, such as typecheck or build.
10. Codex reports that Tally analytics is installed and shows the Tally dashboard URL.
11. User deploys the app, visits one or two pages, opens the dashboard URL, and confirms events appear.

### User-Facing Done State

After patch application, Codex should communicate:

> Tally analytics is installed. Deploy your app, visit one or two pages, then open this dashboard URL to confirm pageview/session events.

The Tally dashboard should support a pending state:

> Waiting for first event. Tally is installed, but no production events have been received yet.

## V1 Supported Targets

Supported:
- Next.js App Router.
- Next.js Pages Router.
- Root-level Next.js apps.
- Monorepos when Codex provides an explicit `appRoot` and dependency target.

Unsupported:
- Non-Next.js frameworks.
- Ambiguous monorepos with multiple possible apps and no selected target.
- Repos where the app package file cannot be identified.
- Repos where the Next.js entrypoint cannot be identified.
- Repos where the patch cannot be generated confidently.

Unsupported cases should fail closed with a short structured reason.

## MCP Tool Behavior

### Primary Tool

`prepare_nextjs_install_patch`

### Tool Responsibility

The Tally MCP tool is responsible for:
- Validating the authenticated Tally user.
- Creating or reusing a Tally project.
- Generating the Tally-controlled SDK patch bundle.
- Returning the dashboard URL.
- Returning a verification checklist.
- Returning structured unsupported or missing-context results when needed.

The local coding agent is responsible for:
- Inspecting the local repo.
- Supplying repo context to the MCP tool.
- Applying the returned patch bundle.
- Stopping and reporting the patch failure if `git apply --check` fails.
- Running local verification commands.
- Reporting deployment verification steps to the user.

### Required Input Shape

Codex should provide enough context for Tally to avoid reading the local filesystem itself:

```json
{
  "repo": {
    "name": "my-app",
    "gitRemote": "git@github.com:user/my-app.git",
    "workspaceRoot": ".",
    "appRoot": "apps/web",
    "packageManager": "pnpm",
    "dependencyTarget": "apps/web/package.json"
  },
  "framework": {
    "kind": "nextjs-app-router",
    "entrypoint": "apps/web/app/layout.tsx",
    "usesSrcDir": false,
    "hasAtAlias": true
  },
  "files": {
    "apps/web/package.json": "{...}",
    "apps/web/tsconfig.json": "{...}",
    "apps/web/app/layout.tsx": "..."
  }
}
```

### Successful Result Shape

```json
{
  "status": "ready",
  "projectId": "proj_123",
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "patchFormat": "unified_diff_v1",
  "unifiedDiff": "diff --git ...",
  "filesChanged": [
    "apps/web/package.json",
    "apps/web/components/tally-analytics.tsx",
    "apps/web/app/layout.tsx"
  ],
  "packageInstallCommand": "pnpm install",
  "verification": [
    "Apply the unified diff with git apply --check before git apply.",
    "Run the package install command.",
    "Run the app's typecheck/build command.",
    "Deploy the app.",
    "Visit one or two pages.",
    "Open the dashboard URL and confirm events appear."
  ]
}
```

### Unsupported Result Shape

```json
{
  "status": "unsupported",
  "reason": "ambiguous_app_root"
}
```

### Already Installed Result Shape

```json
{
  "status": "already_installed",
  "projectId": "proj_123",
  "dashboardUrl": "https://usetally.xyz/projects/proj_123",
  "unifiedDiff": ""
}
```

### Missing Context Result Shape

```json
{
  "status": "needs_context",
  "missingFiles": ["apps/web/app/layout.tsx"]
}
```

### Repo Context Boundary

Codex should send only the minimum files needed to generate the patch. For v1, allowed file paths are:
- The target app `package.json`.
- The nearest workspace root `package.json` only when needed to determine package manager or workspace layout.
- `tsconfig.json` or `jsconfig.json`.
- `next.config.js`, `next.config.mjs`, or `next.config.ts` when present.
- The selected Next.js entrypoint, either `app/layout.tsx`, `app/layout.jsx`, `pages/_app.tsx`, or `pages/_app.jsx`.

The MCP tool should reject requests that include `.env*`, secrets, private keys, credentials, arbitrary source trees, binary files, lockfiles, or unrelated files. The request should be capped at 64 KB per file and 256 KB total in v1.

Tally may process the submitted file contents in memory to generate the patch. It should not persist full file contents, log file bodies, log OAuth tokens, or store generated diffs in long-term logs unless a later debugging feature adds explicit redaction and retention controls.

### Patch Contract

V1 patch output should use a single standard unified diff:
- `patchFormat` must be `unified_diff_v1`.
- `unifiedDiff` must include every file creation and modification needed for the install.
- File creation should use normal unified diff semantics for new files.
- The diff must be generated against the exact file contents supplied in the request.
- Codex should run `git apply --check` before applying the diff.
- If `git apply --check` fails, Codex should stop and report the patch failure rather than inventing a different integration.
- If Tally detects that the same project is already installed with the expected wrapper and dependency, it should return `status: "already_installed"` with the dashboard URL and no diff.
- If a different or partial Tally integration already exists, it should return `unsupported` with reason `existing_integration_conflict`.

## Patch Requirements

The patch bundle must:
- Add `@tally-analytics/sdk` to the target app `package.json`.
- Add a wrapper file named `components/tally-analytics.<ext>` or `src/components/tally-analytics.<ext>`, where `<ext>` mirrors the selected Next.js entrypoint extension: `.tsx` for `.tsx` entrypoints and `.jsx` for `.jsx` entrypoints.
- Use `TallyAnalytics` as the App Router component export.
- Use `useTallyAnalytics` as the Pages Router hook export.
- Inline the `projectId` in the wrapper.
- Avoid requiring an environment variable for v1.
- Use the SDK's default event endpoint unless the technical spec decides an explicit `eventsUrl` is necessary.
- Edit only the selected Next.js entrypoint file, preserving existing code except for the import and component/hook insertion needed to mount Tally.
- Respect `src/app` and `src/pages` by placing the wrapper under `src/components`.
- Add the dependency only to the target app package in workspaces/monorepos.
- Avoid lockfile edits in v1; Codex should run the package manager install command after applying the diff.

## Project Reuse

Tally should attempt to reuse an existing project before creating a new one.

The product invariant is one active Tally project per authenticated user and app fingerprint.

For v1, the required matching rule is:
1. Normalize the git remote URL when present.
2. Match projects owned by the authenticated Tally user.
3. Prefer an exact match on normalized git remote URL plus `appRoot`.
4. If no git remote is available, match only MCP-created projects for the same authenticated user, repo/package name, and `appRoot`.
5. Reuse the project only when exactly one match exists.
6. Create a new project when no match exists.
7. Return `unsupported` with reason `multiple_matching_projects` when more than one match exists.

The fingerprint should store only the fields used for the match: project source `mcp_codex`, normalized git remote when available, repo/package name fallback, and app root. Framework kind and package manager should be stored as project metadata for debugging and display, but they must not create a second Tally project for the same app.

## Product Surface

V1 should expose the MCP install flow in:
- Developer docs/setup docs.
- A dashboard or projects empty-state CTA for agent-first users.

V1 should not remove or replace the existing GitHub App onboarding flow.

Recommended copy direction:
- Website/GitHub App path: "Connect GitHub and get a PR."
- MCP path: "Using Codex? Add Tally from your coding agent."

## Data Persistence

This feature needs to persist:
- MCP-authenticated Tally user/account mapping.
- Tally project metadata created through MCP.
- Project fingerprint fields used for reuse/deduplication.
- SDK install source or project creation source, e.g. `mcp_codex`.
- Existing analytics events in Tinybird after deployment.

The feature should not persist:
- Full repo source files sent in the MCP request beyond what is needed for request processing/log safety.
- OAuth access tokens in logs.
- Generated patch contents in long-term logs unless intentionally stored for debugging with appropriate redaction.

## Integration With Existing Product

This feature extends:
- Existing Tally authentication/account model.
- Existing projects model.
- Existing SDK package.
- Existing dashboard and project detail views.
- Existing setup/docs pages.
- Existing event ingestion and Tinybird storage.

This feature does not require:
- Existing GitHub App installation.
- Existing remote PR generation.
- Existing GitHub webhooks.

The technical implementation may reuse existing Next.js detection and template logic from the GitHub PR generator, but the product behavior is different: Tally returns a patch bundle to the local agent instead of opening a GitHub PR.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User has not authenticated through MCP OAuth | MCP client prompts for OAuth before project creation |
| OAuth fails or is cancelled | No project is created; tool returns an authentication error |
| MCP client does not support OAuth | Tool returns unsupported for v1 |
| Existing matching project found | Reuse project and return its dashboard URL |
| Multiple possible matching projects | Return `unsupported: multiple_matching_projects` |
| Multiple Next.js apps found and no app root selected | Return `unsupported: ambiguous_app_root` |
| Next.js app root explicit in monorepo | Generate patch for that app only |
| App package file missing | Return unsupported |
| App Router and Pages Router both detected | Prefer explicit user/Codex-provided framework kind; otherwise fail unsupported |
| Patch cannot apply cleanly | Codex reports local patch failure and does not invent a new Tally integration |
| User deploys but no events arrive | Dashboard remains in waiting state and provides deployment/traffic checklist |
| User reruns MCP install for the same installed project | Return `already_installed` with the existing project ID and dashboard URL |

## Acceptance Criteria

- `/docs/setup` shows the command `codex mcp add tally --url https://usetally.xyz/api/mcp`.
- The projects empty state shows both the GitHub App path and the MCP path, including the copy "Using Codex? Add Tally from your coding agent."
- An unauthenticated MCP request cannot create a project and returns an OAuth-required error or triggers the MCP OAuth flow.
- A completed MCP OAuth flow creates or links a Tally user account and allows `prepare_nextjs_install_patch` to run.
- Given a supported Next.js App Router fixture, `prepare_nextjs_install_patch` returns `status: "ready"`, a `projectId`, a `/projects/{projectId}` dashboard URL, `patchFormat: "unified_diff_v1"`, a non-empty `unifiedDiff`, and a package install command.
- Given a supported Next.js Pages Router fixture, `prepare_nextjs_install_patch` returns `status: "ready"`, a `projectId`, a `/projects/{projectId}` dashboard URL, `patchFormat: "unified_diff_v1"`, a non-empty `unifiedDiff`, and a package install command.
- For App Router output, `filesChanged` includes the target app `package.json`, a `components/tally-analytics.<ext>` or `src/components/tally-analytics.<ext>` wrapper, and the selected `app/layout` entrypoint.
- For Pages Router output, `filesChanged` includes the target app `package.json`, a `components/tally-analytics.<ext>` or `src/components/tally-analytics.<ext>` wrapper, and the selected `pages/_app` entrypoint.
- The unified diff applies cleanly to the fixture with `git apply --check`.
- The dependency edit adds `@tally-analytics/sdk` to the target app package and does not edit unrelated workspace packages.
- The wrapper source contains the returned `projectId`, exports `TallyAnalytics` for App Router or `useTallyAnalytics` for Pages Router, and imports from `@tally-analytics/sdk`.
- Re-running the tool for the same authenticated user and exact installed project fingerprint returns `status: "already_installed"`, the existing `projectId`, the existing dashboard URL, an empty `unifiedDiff`, and does not create a duplicate project.
- Multiple project matches return `unsupported` with reason `multiple_matching_projects`.
- Non-Next.js fixtures return `unsupported`.
- Ambiguous monorepo fixtures without explicit `appRoot` return `unsupported` with reason `ambiguous_app_root`.
- Requests containing disallowed files such as `.env`, private keys, binary files, lockfiles, or total file content above the v1 cap are rejected before patch generation.
- After local patch application, Codex reports the dashboard URL plus the deployment verification steps: run install, run build/typecheck where available, deploy, visit one or two pages, and check the dashboard.
- A project with no received events renders the exact pending-state copy "Waiting for first event. Tally is installed, but no production events have been received yet."

## Future Enhancements

- Prompt-configured analytics dashboards and reports.
- Custom event instrumentation such as "track signups."
- Agent-configured analytics alerts.
- Cross-project analytics comparison.
- GitHub App upgrade path for hosted PR creation and webhook lifecycle tracking.
- API key fallback for MCP clients without OAuth.
- Non-Next.js framework support.
