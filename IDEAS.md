# Product and Engineering Ideas

These are preserved opportunities, not a committed roadmap or execution order.
Before implementing one, revalidate the user need, current product state, and
whether the idea is still differentiated.

## Product Opportunities

### Analytics Coverage Map

Compare a safe inventory of routes and actions from a user's repository with
observed Tally events to identify pages, CTAs, forms, and funnels that are
invisible or under-instrumented. The detailed innovation brief is in
[`features/analytics_coverage_map/FEATURE_BRIEF.md`](features/analytics_coverage_map/FEATURE_BRIEF.md).

### Prompt-Configured Dashboards and Reports

Let users describe the analytics view they need, then render it through a
structured report specification and stable Tally components. Investigate
component-catalog approaches rather than arbitrary generated UI.

### Agent-Native Custom Instrumentation

Extend the current agent loop from installation and querying to custom event
contracts such as signup completion. The differentiated loop is: detect a
missing signal, define the event contract, let the local agent implement it,
verify locally, and confirm the production event.

Possible extensions already identified in the completed dashboard-task work:

- Passive or repeated feature-usage task types
- Funnel-step instrumentation
- An advanced event-schema editor
- Creating a confirmed analytics task from an MCP-side question

### Analytics Alerts

Allow users to ask an agent to monitor conditions such as conversion dropping
below a threshold or traffic spiking. This likely needs stable metric
definitions, saved queries, notification destinations, and scheduled
evaluation.

### Cross-Project Comparison

Compare activation, launch traffic, or other consistently defined metrics
across projects. This requires clear multi-project permissions and compatible
metric definitions.

### Advanced Analytics

A superseded V2 plan contained potentially useful product ideas that should not
be lost:

- Engagement time and scroll depth
- UTM and acquisition attribution
- Configurable conversions and suggested conversion pages
- Conversion paths and funnels
- Exit-page analysis
- New-versus-returning visitor reporting
- CTA effectiveness

These need fresh product and privacy review before reuse; the original detailed
plan remains available in Git history.

### Optional Hosted Repository Automation

Keep the GitHub App as a possible advanced path for remote inspection, hosted
PR creation, and webhook automation. It should not replace the simpler
MCP-first path to initial value. Related future possibilities include GitLab
and Bitbucket support.

Possible extensions include detecting meaningful repository changes, rerunning
analysis automatically, and proposing updated instrumentation without requiring
an uninstall/reinstall cycle. Manual GitHub-project regeneration already exists;
revalidate whether broader automation is valuable before expanding it.

### Competitive and Marketing Surfaces

The repository contains comparison-page research that could support focused
pages for Google Analytics, Plausible, or PostHog. Any such page should be based
on current product evidence rather than generic SEO copy.

Other marketing work worth revalidating includes a consistent landing-page CTA
path, more scannable documentation, and real social proof once genuine customer
quotes or logos are available.

### Broader Platform Support

Consider additional frameworks, monorepos, an API-key fallback for MCP clients
without OAuth, data export, self-hosting, and team collaboration only after the
core agent-native workflow is strong.

### Billing Extensions

Potential billing additions from the completed Stripe work include annual
billing, team seats, usage-based overages, custom dunning, invoice PDFs, and
Stripe Tax support.

## Product Questions To Revalidate

- Does the current surface complete the full differentiated loop from
  installation through missing-signal detection, implementation, local
  verification, and production verification?
- Should positioning lead with "from no analytics to verified tracking in one
  prompt" rather than broad analytics claims?
- Which product ideas materially distinguish Tally from PostHog's existing AI,
  MCP, and instrumentation capabilities?

## Engineering and Operational Follow-Ups

- Address the current production dependency advisories. A 2026-09-29
  `pnpm audit --prod --audit-level moderate` run reported 81 findings, including
  critical Next.js advisories and high-severity findings in `lodash` and
  `drizzle-orm`; re-run the audit when beginning the upgrade because advisory
  data and patched versions can change.
- Update `SECURITY.md`; it still describes the removed magic-link flow and old
  analytics route locations.
- Keep measuring the SDK's gzipped bundle size and clarify whether the target is
  below 3,000 bytes or 3 KiB. The documented command reported 3,065 bytes on
  2026-09-29.
- Audit the production Stripe webhook subscription and endpoint behavior before
  expanding beyond the focused billing-event filter used by the verification
  harness.
- Investigate the previously observed `invalid_limit` response from
  `get_live_events` when called with `limit: 10`.
- Document safe Vercel deployment for the separate web/MCP and events projects,
  including root-directory and project-link pitfalls.
- Add a production smoke check for both Tinybird tokens before dogfood or
  release verification.
- Keep production MCP smoke verification distinct from the local fixture-backed
  harness.
- Establish proportionate production monitoring for Vercel application errors
  and performance, Neon database health, and Tinybird ingestion/query failures.
- Address existing Next.js image warnings when working in the affected UI.
