# Next Features

This file tracks promising follow-up features that are not part of the current discovery scope.

## Prompt-Configured Analytics Dashboards

- **Priority:** P0
- **Status:** Next feature after MCP onboarding
- **Added:** 2026-05-06
- **Source:** MCP product discovery discussion
- **Description:** Let users describe the analytics view or report they need, then render it through a structured dashboard/report spec using stable Tally components rather than hand-built fixed pages for every metric.
- **Notes:** Treat this as a separate feature from v1 MCP onboarding. Explore tools such as Tambo, json-render, or a component-catalog/report-spec renderer so Tally can avoid building arbitrary generated UI from scratch.

## Agent-Configured Analytics Alerts

- **Priority:** Medium
- **Status:** Deferred
- **Added:** 2026-05-05
- **Source:** MCP product discovery discussion
- **Description:** Let users ask an agent to monitor analytics conditions such as "tell me if signup conversion drops below 5%" or "alert me if traffic from Product Hunt spikes."
- **Notes:** This likely depends on a stable metric catalog, saved query/report specs, notification destinations, and a scheduling or alert evaluation service. Treat as a follow-up after MCP installation, querying, and report creation are clearer.

## Cross-Project Analytics Comparison

- **Priority:** Low
- **Status:** Deferred
- **Added:** 2026-05-05
- **Source:** MCP product discovery discussion
- **Description:** Let users compare analytics across multiple projects, repos, or products, such as "which app has the strongest activation?" or "compare launch week traffic across these three repos."
- **Notes:** This needs multi-project permissions, consistent metric definitions, and a useful comparison UI. It is valuable but should not drive the first MCP-focused iteration.
