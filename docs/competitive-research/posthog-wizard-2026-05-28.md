# PostHog Wizard Field Notes - 2026-05-28

## Context

Goal: compare PostHog's agentic installation path against Tally's MCP-first
installation flow.

Tally baseline:

1. Add the Tally MCP server.
2. Ask Tally to add analytics.
3. The agent applies a small SDK-based patch.
4. Deploy and verify production events.

User note from the PostHog wizard trial:

> I tried the wizard. I hated it. It took forever.

## Captured Screenshots

- [Authorization screen](./assets/posthog-wizard-auth.png)
- [Analyzing project](./assets/posthog-wizard-analyzing.png)
- [Generated event plan](./assets/posthog-wizard-event-plan.png)
- [Tips while running](./assets/posthog-wizard-tips.png)

## Observations

- The authorization flow requested broad access before first value: read users,
  projects, LLM Gateway, queries, health issues, plus write dashboards and
  insights.
- The wizard required choosing or creating a PostHog project during OAuth.
- The CLI framed itself as an agent and spent visible time analyzing the repo
  and generating setup.
- The wizard generated a broad checklist: plan event tracking, install PostHog
  and configure environment, capture route-handler events, identify users, add
  error tracking, and create a dashboard.
- The terminal UI showed generic product-analytics education while running,
  including funnels, people/groups, and event properties.
- The generated example funnel content in the UI was not specific to Tally
  during the captured run.

## Competitive Takeaways

- PostHog's wizard looks powerful, but the first-run experience feels heavier
  than Tally's "add MCP and ask the agent" path.
- The flow asks the user to trust a broad agentic installer and broad
  permissions before it proves value.
- The wizard's breadth makes PostHog feel like a full product-analytics suite
  trying to install many capabilities at once.
- The Tally opportunity remains a narrower, faster, implementation-first loop:
  create the project, patch the repo, deploy, and verify the exact production
  events the user cares about.

## Comparison Hypothesis

PostHog's simpler comparison path is likely its MCP server, not the wizard.
The MCP path should be tested separately as:

1. Add PostHog MCP.
2. Authenticate with PostHog.
3. Ask analytics questions against production data.
4. Ask what events should be added next.

That should be compared against Tally's MCP flow, with one important
distinction: PostHog MCP is primarily a broad product-control and analytics
querying layer, while Tally's wedge is a purpose-built analytics
implementation and verification loop.
