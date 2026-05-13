Complete an end-to-end Tally dashboard-to-task dogfood flow, picking up from the completed SDK dogfood install.

Context:
- Product repo: /Users/coding/Projects/fast_pr_analytics
- Dogfood target repo: /Users/coding/Projects/tally-pages-router-test-project
- Existing dogfood project: proj_dgoEuC3C0lo-3Nk
- SDK install dogfood commit in target repo: d811d8e task(tally): install analytics sdk dogfood
- Prior end-to-end run verified:
  - @tally-analytics/sdk@0.1.0 installed with pnpm
  - local browser SDK events reached production ingestion/Tinybird
  - MCP overview/sessions queried the same data
  - production Tinybird env drift was repaired for both events and web/MCP Vercel projects
- Do not use npm in the target repo. It is pnpm-only.
- Do not publish another SDK version unless absolutely necessary; ask first.
- Real GitHub/App verification should use sandbox or existing safe credentials only.

Objective:
Run a second end-to-end dogfood flow that starts from the Tally dashboard instead of SDK install:

1. Open the Tally dashboard for project `proj_dgoEuC3C0lo-3Nk`.
2. Ask a dashboard analytics question that Tally cannot fully answer from the current production telemetry.
3. Confirm the UX behaves correctly:
   - Tally gives the best partial answer it can.
   - Tally explains what missing event/instrumentation would answer the question.
   - Tally does not silently create a task without explicit human confirmation.
4. Explicitly confirm task creation when prompted.
5. Verify the dashboard creates a pending analytics task for the missing event/instrumentation.
6. Use Tally MCP to discover/pick up that task.
7. Execute the task against `/Users/coding/Projects/tally-pages-router-test-project`.
8. Use pnpm only, build successfully, and keep the target repo free of package-manager pollution.
9. Run the target app locally and generate the newly instrumented event through the real installed SDK/app path.
10. Verify the new event reaches Tally ingestion and dashboard/Tinybird data.
11. Verify the dashboard question can now be answered with the new event data.
12. Verify the same data/task status can be queried via Tally MCP.
13. If product code is wrong, make narrow fixes in `/Users/coding/Projects/fast_pr_analytics`, add focused tests, commit, push, and confirm CI.
14. Commit any target repo changes after verification.

Screenshot requirements:
- Take and save screenshots at every meaningful screen/state:
  - dashboard project before asking the question
  - question input
  - partial/cannot-answer response
  - task confirmation prompt
  - task created/pending state
  - MCP/task discovery evidence if browser-visible, otherwise terminal output summary is fine
  - target app before/after generated event if visually relevant
  - dashboard live/overview view showing the new event
  - final answered question state
- Save screenshots under a clearly named local folder, for example:
  - `/Users/coding/Projects/fast_pr_analytics/tmp/dashboard-task-dogfood-screenshots/`
- Include screenshot paths in the final report.

Validation requirements:
- Show the initial target repo git status.
- Show the dashboard question asked.
- Show the partial answer / cannot-answer behavior.
- Show explicit confirmation before task creation.
- Show the created task details.
- Show MCP task query/pickup evidence.
- Show target repo diff after implementation.
- Show exact install command used, if dependencies change.
- Show build success.
- Show browser/network evidence that the new event was emitted from the app/SDK path.
- Show Tinybird/dashboard/API evidence that the new event landed.
- Show MCP evidence for the same task/event data.
- Show the final dashboard answer after the event exists.
- Show final git status for both repos.
- Keep a compact progress log with checkpoints and verification results.

Stop only when:
- the full dashboard question -> confirmed task -> MCP pickup -> implementation -> event emitted -> dashboard answer loop is verified, or
- there is a hard blocker requiring human auth/credentials that cannot be worked around after exhausting local/API/MCP/browser verification.