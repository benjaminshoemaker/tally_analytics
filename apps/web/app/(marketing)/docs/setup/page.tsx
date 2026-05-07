import React from "react";

export const dynamic = "force-static";

const AUTH_URL = "/api/auth/github";

export default function DocsSetupPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <div className="prose prose-slate max-w-none">
        <h1>Getting started</h1>
        <p>Connect GitHub and get a PR you can review and merge.</p>

        <ol>
          <li>
            <strong>Sign in with GitHub</strong>:{" "}
            <a href={AUTH_URL}>
              {AUTH_URL}
            </a>
          </li>
          <li>
            <strong>Install the GitHub App</strong> from your dashboard and select repositories you want to track.
          </li>
          <li>
            <strong>Merge the generated PR</strong> (it adds the analytics component/hook and an SDK dependency).
          </li>
          <li>
            <strong>Deploy</strong> your app as you normally do.
          </li>
          <li>
            <strong>Open your dashboard</strong> and confirm you’re receiving events.
          </li>
        </ol>

        <h2>Using Codex?</h2>
        <p>Using Codex? Add Tally from your coding agent.</p>
        <pre>
          <code>codex mcp add tally --url https://usetally.xyz/api/mcp</code>
        </pre>
        <p>After the MCP is connected, ask Codex to add Tally analytics to your Next.js app.</p>

        <h2>Troubleshooting</h2>
        <ul>
          <li>If your PR is still pending, verify the GitHub App has access to the repo.</li>
          <li>If you don’t see events, confirm the PR was merged and your deployment is up to date.</li>
        </ul>
      </div>
    </main>
  );
}
