# User Flows

This document describes the canonical product flows for Tally Analytics. It is product guidance, not an execution plan. Workstream status is tracked in `plans/PLAN_STATUS.md`.

## 1. First-Time MCP Install

Goal: a developer adds Tally Analytics to an app from inside their coding agent.

1. Developer opens a supported app locally in Codex, Claude Code, Cursor, or another MCP-capable coding agent.
2. Developer adds the Tally Analytics MCP server.
3. First use triggers Tally OAuth.
4. Developer asks the agent to add Tally Analytics.
5. Agent detects the app and sends minimal repo context to Tally MCP.
6. Tally creates or reuses a project owned by the authenticated user.
7. Tally returns a safe SDK-based patch bundle, package install command, dashboard URL, and verification checklist.
8. Agent applies the patch locally and runs local verification where possible.
9. Developer deploys the app.
10. Developer visits one or two pages in the deployed app.
11. Dashboard moves from waiting-for-first-event to live analytics.

Expected dashboard pending copy:

> Waiting for first event. Tally is installed, but no production events have been received yet.

## 2. Dashboard Analytics Review

Goal: a user understands app usage after events are flowing.

1. User logs into Tally.
2. User opens a project.
3. Dashboard shows project status, event volume, live events, sessions, pages, referrers, and other available analytics.
4. If events have not arrived yet, dashboard explains the waiting state and points back to deployment/verification steps.
5. If quota or billing state matters, dashboard shows plan and upgrade/management actions.

The dashboard is the primary control plane for understanding usage. It is not the primary place where code changes happen.

## 3. Dashboard-Created Pending Tracking Task

Goal: a user requests new tracking from the dashboard, and their coding agent implements it.

1. User is viewing analytics and realizes they want to track something new.
2. User creates a pending analytics task in the dashboard, such as:
   - track signup completion
   - track onboarding completion
   - track pricing CTA clicks
   - track usage of a specific feature
3. Tally stores the task against the project.
4. Dashboard shows that the task is ready for the coding agent.
5. User opens the local repo in their coding agent and says:

   ```text
   Pull down any pending tasks from the Tally Analytics MCP and implement them.
   ```

6. Agent calls Tally MCP, retrieves pending tasks, inspects the local codebase, applies the change, and runs verification.
7. Agent reports status back to Tally.
8. Dashboard shows the task as implemented locally, awaiting deploy, verified, or failed.
9. Tally verifies the task when the expected event appears after deployment.

This flow does not require GitHub App access because the local coding agent edits the repo.

## 4. MCP Analytics Querying

Goal: a developer asks usage questions from inside the coding agent.

Example prompts:

```text
Use Tally Analytics to summarize usage from the last 7 days.
```

```text
Which pages are users visiting before signup?
```

```text
Look at Tally Analytics and suggest events we should add next.
```

Flow:

1. User has the Tally MCP configured and authenticated.
2. User asks the coding agent an analytics question.
3. Agent calls Tally MCP read tools.
4. Tally returns scoped project analytics and dashboard URLs.
5. Agent summarizes the answer or proposes follow-up tracking tasks.

The first version should be read-only unless the user explicitly creates or approves a pending task.

## 5. Optional GitHub App Upgrade

Goal: a user allows Tally to make hosted repo changes without returning to their local coding agent.

This is not required for the core product flow.

Possible future flow:

1. User has already seen value from MCP-first install or dashboard analytics.
2. User chooses "Connect GitHub for managed PR automation."
3. User installs the GitHub App on selected repos.
4. Tally can inspect repos remotely, open PRs, respond to webhooks, and handle dashboard-triggered implementation tasks asynchronously.

GitHub App should be positioned as optional hosted automation, not first-run setup.

## 6. Billing Flow

Goal: a user upgrades, manages, or cancels billing without breaking project access.

1. Free user views pricing or an in-app quota prompt.
2. User starts Stripe Checkout.
3. User completes checkout in Stripe.
4. Stripe returns to `/settings?success=true`.
5. Tally reconciles the checkout session and persists subscription state.
6. Stripe webhooks update plan, subscription status, period end, cancellation, and payment-failure state.
7. Paid users see billing management instead of upgrade CTAs.
8. Billing Portal handles plan management and cancellation.

Billing verification guidance lives in `docs/billing-verification.md`.

## 7. Agent Verification Flow

Goal: an AI coding agent can prove the app works without using a human private account.

1. Agent starts from repo docs and current plan status.
2. Agent uses seeded scenarios, local auth, local fixtures, and sandbox external resources where needed.
3. Agent runs the relevant verification command.
4. Agent observes browser/API/DB/provider evidence.
5. Agent can decide pass or fail without manual interpretation.
6. Agent tears down disposable state or keeps artifacts only for debugging.

Current local testing guidance lives in `docs/agent-testing.md`.
