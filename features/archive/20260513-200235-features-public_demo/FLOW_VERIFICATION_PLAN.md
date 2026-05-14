# Flow Verification Plan: features/public_demo

Status: Applicable

## Flow Claim

A prospective user can open the public demo from the landing page, inspect fake
Acme Forms dashboard data, ask a suggested Ask Tally question, and see a
simulated agent task outcome without logging in or touching authenticated APIs.

## Channel Under Test

Browser UI.

This is a public marketing/product experience, so the verification must drive a
browser against the local web app. Unit tests are useful but not enough to prove
the click-through public route and viewport behavior.

## Harness Shape

Add a Playwright browser test using the existing web E2E harness.

Recommended command:

```bash
pnpm --filter web e2e --grep @public-demo
```

If the harness cannot filter reliably by tag, the test may run through the
standard `pnpm --filter web e2e` command and keep the spec name focused on
`public-demo`.

## Setup And State

- Start the local web app through the existing Playwright config/harness.
- Do not seed a database.
- Do not log in.
- Do not configure OAuth, MCP, GitHub, Stripe, Tinybird, or third-party AI.
- Use only bundled static fixture data from the app.

## Driver

The agent should:

1. Open the marketing homepage.
2. Click the "View demo dashboard" link.
3. Confirm the URL/path is `/demo`.
4. Confirm the demo-data banner is visible.
5. At a desktop viewport, confirm the demo-data banner, product value summary,
   Overview metrics, and Ask Tally entry point or suggested question are visible
   before any scroll.
6. Capture browser network requests during the flow and fail if any forbidden
   API route is requested.
7. Switch to Live and confirm fake events render.
8. Switch to Sessions and confirm session metrics render.
9. Switch to Ask Tally.
10. Select or type "What should we track next?"
11. Submit the question.
12. Confirm a draft task and simulated MCP/agent output are visible.
13. Confirm "Start with MCP" points to `/docs/setup`.
14. Repeat the core visual assertions at a mobile viewport and confirm primary
    text is not overlapped or clipped.

## Assertions

Success assertions:

- `/demo` loads without redirecting to `/login`.
- "This is demo data. Connect your repo for real analytics." is visible.
- "Acme Forms" is visible.
- Product value summary is visible in the initial desktop viewport.
- Overview, Live, Sessions, and Ask Tally views are reachable.
- Ask Tally returns a deterministic response for "What should we track next?"
- The missing-tracking response includes `form_published` and a simulated
  MCP/agent output label.
- The setup CTA has `href="/docs/setup"`.

Negative assertions:

- No login page is shown.
- No account/user dropdown is shown.
- No billing/settings controls are shown.
- No browser console errors are emitted during the core flow.
- No request to `/api/projects`, `/api/mcp`, `/api/oauth`, `/api/auth`,
  `/api/stripe`, or Tinybird-backed analytics endpoints occurs during demo
  interactions.
- At desktop and mobile viewport sizes, primary demo banner, navigation, metric,
  and Ask Tally/task text is not visibly overlapped or clipped.

Network capture should use Playwright `page.on("request", ...)` or equivalent
request instrumentation before navigating to the homepage. Store requested URLs
in an array and assert no URL path starts with a forbidden prefix after the
interaction sequence.

## Evidence

Keep standard Playwright failure artifacts. For manual closeout or debugging,
capture screenshots for:

- Initial `/demo` overview viewport.
- Ask Tally response with simulated agent task output.
- Mobile viewport after opening `/demo`.

## Teardown And Rerun

No persistent state is created. Reruns should be idempotent because demo state
is local React state and resets on page reload.

## Open Decisions

None.
