# Discovery Notes

Generated: 2026-05-06
Source: /discover conversation

## Idea Summary

Tally is pivoting from a GitHub-App-first analytics installer toward an MCP-first onboarding path for agent-native developers. The core insight is that a user already working inside an AI coding agent should be able to connect Tally, authenticate once, ask for analytics, and receive a canonical SDK patch that the local agent applies to the current Next.js app.

The first product proof is not custom event design or dynamic dashboards. It is a fast, reliable activation loop: Codex connects to a hosted Tally MCP server using OAuth, Tally creates or reuses an authenticated project, Tally returns a canonical Next.js SDK patch bundle, Codex applies it locally, and the user deploys. Tally then shows a pending dashboard state until real events arrive.

## Key Decisions

- **Problem:** Existing onboarding asks users to start from a website and install a GitHub App. The new flow should let users start where they already are: inside an AI coding agent.
- **Audience:** Developers building web apps with AI coding agents, starting with Codex CLI/local Codex users.
- **Platform:** Hosted Tally web app plus hosted remote MCP server; local code changes are applied by the user's coding agent.
- **Stack preferences:** V1 targets Codex CLI/local Codex, remote Streamable HTTP MCP, MCP OAuth, Next.js App Router, Next.js Pages Router, and the existing `@tally-analytics/sdk`.
- **MVP scope:** From Codex, connect Tally MCP, OAuth into Tally, create or reuse a Tally project, return a canonical SDK patch bundle, apply it to a supported Next.js app, and show a dashboard URL with "waiting for first event" guidance.
- **Exciting part:** The onboarding path feels like a natural extension of agent-assisted development: "add analytics" becomes a coding-agent workflow instead of a separate website-first setup funnel.

## V1 Flow

```text
User adds/connects Tally MCP in Codex
→ first tool use triggers Tally OAuth
→ Tally creates/uses authenticated user account
→ user asks "add Tally analytics"
→ Codex gathers repo context
→ Codex calls prepare_nextjs_install_patch
→ Tally detects/reuses project or creates one
→ Tally returns canonical SDK patch bundle
→ Codex applies patch locally
→ Codex runs local verification where possible
→ user deploys
→ dashboard waits for first event, then shows data
```

## V1 Product Rules

- Support only MCP clients where OAuth works. No API key fallback initially.
- Primary target is Codex CLI/local Codex.
- Do not require GitHub App installation for first value.
- Use the existing `@tally-analytics/sdk`, not a copied generated tracker.
- Return a concrete patch bundle, not broad instructions only.
- Local Codex applies the patch. Tally does not mutate the local filesystem directly.
- Support Next.js only at first: App Router and Pages Router.
- Support root apps and monorepos only when `appRoot` and dependency target are explicit.
- Fail closed for unsupported or ambiguous repos. No manual fallback instructions.
- Add the SDK dependency to the target app package, not only the workspace root.
- Inline `projectId`; do not require env var setup in v1.
- Add `components/tally-analytics.tsx` or `src/components/tally-analytics.tsx` depending on the app root convention.
- Use product naming: `TallyAnalytics` for App Router and `useTallyAnalytics` for Pages Router.
- Verification is user-guided after deployment because Tally cannot prove production telemetry until the user deploys and generates traffic.

## Proposed MCP Tool

Primary tool:

```text
prepare_nextjs_install_patch
```

Expected input:

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

Expected output:

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

Unsupported output:

```json
{
  "status": "unsupported",
  "reason": "ambiguous_app_root"
}
```

Context request output:

```json
{
  "status": "needs_context",
  "missingFiles": ["apps/web/app/layout.tsx"]
}
```

## Open Questions

- Exact OAuth implementation path for the hosted Tally MCP server.
- Whether to build OAuth directly or use an OAuth gateway/proxy.
- Exact Codex command/docs surface for the first demo.
- Whether `eventsUrl` should be SDK-defaulted or patch-provided.
- Whether the SDK currently supports the desired tiny wrapper API cleanly enough.
- How to fingerprint projects for reuse across repeated MCP installs.
- What dashboard pending state should say before first event arrives.
- What local verification command detection should be included in v1.
- Whether GitHub App install becomes a later optional upgrade path for hosted PR creation and webhook lifecycle tracking.

Resolved in `FEATURE_SPEC.md`:
- Patch output is `unified_diff_v1` for v1.
- The Codex docs command is `codex mcp add tally --url https://usetally.xyz/api/mcp`.
- Project reuse uses an authenticated-user plus app-fingerprint invariant with explicit multiple-match failure.
- The pending dashboard state has exact user-facing copy.

## Existing Solutions & Tools

### Use Directly

None found that solve the full problem. No researched product replaces the whole desired workflow: MCP-first onboarding from a coding agent, repo analysis, authenticated analytics project creation, canonical SDK patch generation, local patch application, and Tally dashboard activation.

### Leverage

- [PostHog MCP Server](https://mcp.posthog.com/) — PostHog exposes product analytics operations over MCP, including tools for insights, dashboards, SQL, alerts, and project context. Useful as the closest analytics-domain MCP precedent, but it does not install instrumentation into a repo.
- [GitHub MCP Server](https://github.com/github/github-mcp-server) — GitHub's official MCP server can provide repository and PR-oriented capabilities. Useful later if Tally wants to combine local patch flow with GitHub operations, though v1 intentionally avoids requiring GitHub App install.
- [OpenAI Codex MCP](https://developers.openai.com/codex/mcp) — Codex supports remote Streamable HTTP MCP servers and OAuth-oriented server configuration. This makes Codex a reasonable primary v1 client.
- [MCP Auth](https://mcp-auth.cloud/) — OAuth gateway/reverse proxy for MCP servers. Potentially useful if Tally wants to avoid hand-rolling all hosted MCP OAuth behavior.
- [Tambo](https://github.com/tambo-ai/tambo) — Open-source generative UI SDK for React. Relevant to the separate prompt-configured dashboard feature, not v1 onboarding.
- [json-render](https://github.com/vercel-labs/json-render) — Generative UI framework where AI emits constrained specs against a component catalog. Relevant to a future stable dashboard/report spec renderer.
- [MetricUI](https://www.metricui.com/) — React dashboard component library with analytics-oriented components. Potential leverage for future prompt-configured dashboard rendering.

### Take Inspiration From

- [Tally Forms MCP Server](https://developers.tally.so/api-reference/mcp) — Strong reference for SaaS MCP onboarding: hosted MCP URL, OAuth-first setup, AI assistant examples, and API-key fallback for unsupported clients. This validates the product shape even though it serves form creation/submission workflows rather than analytics instrumentation.

## Deferred / Next Features

- Prompt-configured analytics dashboards are a separate P0 next feature, tracked in `NEXT_FEATURES.md`.
- Agent-configured analytics alerts are deferred.
- Cross-project analytics comparison is deferred and low priority.
- Custom events and "track signups" should wait until the basic install-to-real-dashboard loop is working.

## Raw Context

- "I think it just seems like a logical extension, and an easy way to onboard new users and get value quickly."
- "I think (1) is the first one" — the first proof is MCP-first install that gets an analytics PR/patch, not dynamic reporting.
- "I think the reason I didn't want to force the user to log in before is that I didn't want them to have to log in and then also install a GitHub app."
- "Let's do OAuth for now - I only want to support cases where MCP OAuth works, for now."
- "We may actually want to control exactly how the code works... Maybe we should actually have it send a patch."
