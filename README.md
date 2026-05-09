# Tally Analytics

MCP-first analytics for apps built with AI coding agents.

Tally lets developers add analytics from Codex, Claude Code, Cursor, or another MCP-capable coding agent. The coding agent installs the SDK in the local repo; the Tally dashboard shows usage, first-event status, billing, and later analytics tasks.

## Current Direction

The core product flow is:

1. Add the Tally MCP server to a coding agent.
2. Authenticate with Tally through MCP OAuth.
3. Ask the agent to add Tally Analytics to a supported app.
4. The agent applies the Tally SDK patch locally and runs verification.
5. Deploy the app and confirm the first event in the Tally dashboard.

The GitHub App is optional future/advanced automation for hosted PR workflows. It is not required for first value.

## Documentation

- [Product vision](docs/product/vision.md)
- [Canonical user flows](docs/product/user-flows.md)
- [Architecture overview](docs/architecture.md)
- [Agent testing harness](docs/agent-testing.md)
- [Billing verification](docs/billing-verification.md)
- [GitHub sandbox guidance](docs/github-sandbox.md)
- [Workstream status](plans/PLAN_STATUS.md)

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm --filter web test
```

Useful local verification commands:

```bash
pnpm --filter web e2e:scenarios
pnpm --filter web e2e:mcp-self-test
```

## Project Structure

This is a pnpm monorepo:

```
apps/
  web/        → Dashboard, auth, billing, MCP server
  events/     → Event ingestion service
packages/
  sdk/        → Client SDK (@tally-analytics/sdk)
tinybird/     → Analytics data pipeline
docs/         → Product, architecture, and verification docs
features/     → Active and future feature plans/briefs
plans/        → Workstream status and archived plans
```

## License

Private — all rights reserved.
