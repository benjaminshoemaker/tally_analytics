# Discovery Notes

Generated: 2026-05-13
Source: /discover conversation in `features/public_demo/`

## Idea Summary

Create a public, no-login demo for Tally Analytics so a prospective user can
click from the landing page and immediately understand what the dashboard feels
like after Tally is installed.

The demo should be a native `/demo` route, not an embedded BI tool or a real
anonymous account. It should reuse the real dashboard presentation where
practical, load believable fixture data for a fictional SaaS app, and simulate
Ask Tally plus MCP/agent task output with deterministic local responses.

The goal is comprehension in about 60 seconds: a visitor should see the
dashboard, click through meaningful views, type a question, and understand how
Tally turns missing analytics into an agent task.

## Key Decisions

- **Problem:** Prospective users cannot currently experience the product before
  signing up, configuring MCP, or installing analytics.
- **Audience:** Prospective users evaluating whether Tally is worth trying.
- **Platform:** Public web route inside the existing Next.js app.
- **Stack preferences:** Reuse the repo's existing React, Next.js, Tailwind, and
  dashboard components. Do not add a BI embedding stack for the demo.
- **MVP scope:** Public `/demo`, landing-page CTA, fake analytics fixture data,
  dashboard-like Overview/Live/Sessions/Ask Tally surfaces, deterministic mocked
  question responses, and a clearly simulated MCP/task preview.
- **Exciting part:** Letting someone understand the dashboard and agent loop
  without setup friction: "I can see what Tally does before I install it."

## Open Questions

- Should the public CTA copy say "Try demo" or "View demo dashboard"?
- What should the fictional SaaS app be named? Working default: "Acme Forms".
- Should Ask Tally mock responses include code snippets, or stay focused on
  product-level task descriptions?
- How much dashboard chrome should the public demo reuse from the authenticated
  app: full sidebar/header, or a lighter demo-specific frame?
- Should the demo include a direct "Start with MCP" CTA on every tab, or only in
  the header/banner?

## Existing Solutions & Tools

### Use Directly

- **Tremor Dashboard Template** — https://www.tremor.so/docs/getting-started/dashboard-template

  Free open-source Next.js, TypeScript, and Tailwind dashboard template with a
  polished data-dashboard structure. It is relevant as a UI reference because
  Tally already uses a Next.js app and needs native dashboard presentation, not a
  separate BI product. Use as inspiration or selective component reference, not
  as a required dependency unless it clearly fits the existing design system.

- **DataMock** — https://datamock.dev/

  Fake-data generator/API for realistic JSON, CSV, SQL, and Excel datasets,
  including reproducible scenarios. It is relevant because the demo needs
  believable analytics without real accounts. Final demo data should likely be
  checked into the repo as fixtures, but a generator can help shape realistic
  data.

### Leverage

- **Drizby** — https://www.drizby.com/

  Open-source AI analytics platform with dashboards, agentic notebooks,
  semantic layer, and MCP server with OAuth. It is too broad to embed for this
  small public demo, but it is a useful reference for the long-term blend of
  dashboard analytics plus agent/MCP querying.

- **Metabase Interactive Embedding Demo** — https://github.com/metabase/edumation-embedding-demo

  Sample app showing embedded, multi-tenant, self-service analytics. It is
  relevant for the "ask a question, get a result" interaction model, but Tally
  should not adopt Metabase just to power this route.

- **Story Analytics** — https://storyanalytics.ai/

  Open-source dashboard builder with a sample-data showcase. Relevant because
  the public demo should be instantly explorable and sample-data-driven. The
  useful idea is packaging a polished sample dashboard, not adopting the product.

### Take Inspiration From

- **Plausible public demo/dashboard pattern** — https://plausible.io/docs/

  Plausible emphasizes a simple, readable analytics dashboard and links users to
  a live demo. This is a strong model for keeping Tally's demo focused and
  low-friction.

- **ClickHouse demo applications** — https://clickhouse.com/demos

  Public analytics demos using concrete sample datasets. Useful inspiration for
  making fake data feel specific and real rather than placeholder-like.

- **AspectBase** — https://aspectbase.com/

  Open-source analytics/observability dashboard for AI agent workflows. It is
  relevant as visual inspiration for simulated MCP/agent task output, especially
  "agent implemented", "awaiting deploy", and "verified" states.

## Raw Context

- The selected direction is option 2 from the initial discussion: a reusable
  dashboard demo, not a static screenshot and not a full seeded public account.
- The demo should be public and account-free: no OAuth, no GitHub App install,
  no public MCP token, and no production database writes.
- The primary job is conversion clarity: a visitor should understand Tally in
  roughly 60 seconds.
- Ask Tally should use deterministic scripted responses, so the demo is fast,
  reliable, safe, and testable.
- The fake app should be a fictional SaaS product rather than Tally dogfood
  analytics or a generic "Demo Project".
