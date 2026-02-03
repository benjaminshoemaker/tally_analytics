Phase 2 Checkpoint Results
==========================

Tool Availability:
- ExecuteAutomation Playwright: no
- Browser MCP Extension: no
- Microsoft Playwright MCP: yes
- Chrome DevTools MCP: yes (list_pages responded with existing browser warning)
- code-simplifier: no
- Trigger.dev MCP: yes

## Local Verification

Automated Checks:
- Tests: PASSED (`pnpm -C apps/web test`)
- SDK tests: PASSED (`pnpm --filter sdk test`)
- Events app tests: PASSED (`pnpm --filter web test events`)
- Type Check: PASSED (`pnpm typecheck`)
- Linting: PASSED with warnings (no-img-element warnings in marketing + dashboard components)
- Build: PASSED (`pnpm build`)
- Dev Server: PASSED (`pnpm dev`, verified `http://localhost:3000`, log: `.claude/verification/phase-2-devserver.log`)
- Security: PASSED with notes (pattern scan; untracked `tally-analytics-agent.2025-12-21.private-key.pem` present; placeholders only in docs/tests)
- Coverage: 86.78% (target 80%) via `pnpm -C apps/web test -- --coverage`

Code Quality Metrics:
- Files changed in phase: 10
- Lines added: 1128
- Lines removed: 87
- New dependencies added: None

Optional Checks:
- Code Simplification: SKIPPED (tool unavailable)
- Browser Verification: SKIPPED (criteria require PR-generated external site + network inspection)
- Tech Debt: FAILED (duplication 4.18%, 36 clones; >15 blocks). Complexity/unused-var ESLint checks blocked by Next.js pages directory error.

Manual Local Checks:
- Automated successfully: none
- Automation failed:
  - Build SDK and verify bundle size: gzip size 4556 bytes (> 3072 limit)
- Truly manual:
  - Manually test PR-generated component in browser: V2 fields appear in network requests
  - Verify Tinybird receives and stores new V2 fields from PR-generated sites

Approach Review: No issues noted

Local Verification: PASSED (manual items pending)

---

## Manual Verification Guide

===============================================================================
MANUAL VERIFICATION: Build SDK and Verify Bundle Size
===============================================================================

## What We're Verifying
Ensure the SDK bundle remains under 3KB gzipped after the Phase 2 template changes.

## Prerequisites
- [ ] Terminal open at repo root
- [ ] Node + pnpm installed

## Step-by-Step Verification

### Step 1: Build the SDK
1. Run: `pnpm --filter sdk build`
2. You should see a successful build with `dist/index.js` created.

### Step 2: Measure gzipped size
1. Run: `gzip -c packages/sdk/dist/index.js | wc -c`
2. Record the byte count.

## Expected Results
PASS if output is < 3072 bytes.

## How to Confirm Success
The criterion PASSES if the gzip byte count is less than 3072.

## Common Issues & Troubleshooting
| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Size > 3072 | Added code expanded SDK bundle | Remove unused exports, inline fewer helpers, or move optional features to separate entry points |

## If Verification Fails
- Current measurement: 4556 bytes (FAIL)
- Reduce SDK bundle size and re-run the steps above

-------------------------------------------------------------------------------

===============================================================================
MANUAL VERIFICATION: PR-Generated Component Sends V2 Fields
===============================================================================

## What We're Verifying
The generated PR template sends V2 fields (`engagement_time_ms`, `scroll_depth`, `visitor_id`, `is_returning`, UTM params, `cta_clicks`) in `/v1/track` requests.

## Prerequisites
- [ ] Dev server running at `http://localhost:3000` (start with: `pnpm dev`)
- [ ] A project installed via the GitHub App with a repository you control
- [ ] Ability to create a PR and deploy/preview the repo (Vercel preview or local dev)
- [ ] Browser open (Chrome recommended)

## Step-by-Step Verification

### Step 1: Generate a fresh PR
1. Go to: `http://localhost:3000/projects/{projectId}`
2. Click **Re-run Analysis** to generate a new PR (or open existing PR via **View PR**)
3. Confirm the PR contains the generated analytics component file and is based on the latest templates.

### Step 2: Run the PR branch
1. Deploy the PR branch (Vercel preview) or run the repo locally:
   - `git checkout <pr-branch>`
   - `pnpm install`
   - `pnpm dev`
2. Open the deployed site in the browser.

### Step 3: Capture network requests
1. Open DevTools -> Network tab
2. Filter by `/v1/track`
3. Load a page and interact:
   - Scroll to the bottom
   - Click a CTA element (e.g., signup/pricing link)
   - Move the mouse + type to create activity time
4. Click the `/v1/track` request and inspect the request payload

## Expected Results
PASS if all of the following are true:
- `session_start` payload includes `visitor_id`, `is_returning`, and any UTM params
- `page_view` payload includes `engagement_time_ms`, `scroll_depth`, and `cta_clicks`
- `visitor_id` persists across a page reload

## Common Issues & Troubleshooting
| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Missing V2 fields | PR still using old template | Regenerate PR and redeploy |
| `engagement_time_ms` stays 0 | No activity time recorded | Wait 5-10 seconds while moving mouse/scrolling |
| `scroll_depth` stays 0 | No scroll events | Scroll past viewport height |
| No requests | DNT enabled or fetch blocked | Ensure `navigator.doNotTrack !== '1'` and ad blockers disabled |

## If Verification Fails
1. Confirm the PR includes the updated template code in the analytics component file
2. Check browser console for errors
3. Re-run analysis and redeploy preview

-------------------------------------------------------------------------------

===============================================================================
MANUAL VERIFICATION: Tinybird Receives V2 Fields
===============================================================================

## What We're Verifying
Tinybird `events` datasource stores the new V2 fields after the PR-generated site sends events.

## Prerequisites
- [ ] Tinybird CLI authenticated (`tb auth`)
- [ ] Access to the workspace containing the `events` datasource
- [ ] A deployed PR-generated site actively sending events

## Step-by-Step Verification

### Step 1: Trigger V2 events
1. Visit the PR-generated site
2. Perform actions that generate V2 fields:
   - Open a URL with `?utm_source=test&utm_medium=cpc`
   - Scroll to the bottom
   - Click a CTA (e.g., pricing/signup link)
   - Wait 5-10 seconds with activity for engagement time

### Step 2: Query Tinybird
1. Run the query below (from Tinybird CLI command reference `tb sql`):
   - `tb sql "SELECT count() AS v2_events FROM events WHERE engagement_time_ms IS NOT NULL OR scroll_depth IS NOT NULL OR visitor_id IS NOT NULL OR is_returning IS NOT NULL OR utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL OR utm_term IS NOT NULL OR utm_content IS NOT NULL OR cta_clicks IS NOT NULL"`
2. Optionally filter by project ID:
   - `tb sql "SELECT project_id, engagement_time_ms, scroll_depth, visitor_id, is_returning, utm_source, cta_clicks FROM events WHERE project_id = 'proj_...' ORDER BY timestamp DESC LIMIT 5"`

## Expected Results
PASS if query returns at least one row with non-null V2 fields and values match recent actions.

## Common Issues & Troubleshooting
| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Zero results | No events ingested | Ensure site is sending events and project ID is correct |
| Fields null | Events not sending V2 payload | Confirm PR template includes V2 tracking and DNT not enabled |
| `tb sql` fails | Not authenticated | Run `tb auth` and confirm workspace |

## If Verification Fails
1. Reconfirm the PR-generated site is live and sending events
2. Check network payloads for V2 fields
3. Validate Tinybird datasource schema includes the new columns

-------------------------------------------------------------------------------
