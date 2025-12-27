import React from "react";

export const dynamic = "force-static";

const INSTALL_URL = "https://github.com/apps/tally-analytics-agent";

export default function DocsSetupPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <div className="prose prose-slate max-w-none">
        <h1>Getting started</h1>
        <p>Install Tally by adding the GitHub App to your repo. You’ll get a PR you can review and merge.</p>

        <ol>
          <li>
            <strong>Install the GitHub App</strong>:{" "}
            <a href={INSTALL_URL} target="_blank" rel="noreferrer">
              {INSTALL_URL}
            </a>
          </li>
          <li>
            <strong>Select repositories</strong> you want to track (you can limit access to specific repos).
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

        <h2>Troubleshooting</h2>
        <ul>
          <li>If your PR is still pending, verify the GitHub App has access to the repo.</li>
          <li>If you don’t see events, confirm the PR was merged and your deployment is up to date.</li>
        </ul>
      </div>
    </main>
  );
}

