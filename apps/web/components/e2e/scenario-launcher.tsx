"use client";

import { useState } from "react";

export type ManualScenario = {
  id: string;
  description: string;
  tags: string[];
  user: {
    id: string;
    email: string;
  };
  route: string;
  assertions: string[];
  projectName: string;
};

type ScenarioGroup = {
  title: string;
  description: string;
  scenarios: ManualScenario[];
};

export default function ScenarioLauncher({ groups }: { groups: ScenarioGroup[] }) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterScenario(scenario: ManualScenario) {
    setActiveScenarioId(scenario.id);
    setError(null);

    try {
      const response = await fetch("/api/auth/e2e-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: scenario.user.id }),
      });

      if (!response.ok) {
        throw new Error(`Login failed with ${response.status}`);
      }

      window.location.assign(scenario.route);
    } catch (cause) {
      setActiveScenarioId(null);
      setError(cause instanceof Error ? cause.message : "Unable to enter scenario");
    }
  }

  return (
    <main className="min-h-screen bg-warm-50 px-5 py-8 text-warm-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-warm-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            Local E2E mode
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-warm-900">
                Manual scenario launcher
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-600">
                Choose a seeded local state, then continue through the real dashboard UI as that
                user. The launcher only handles test login and navigation.
              </p>
            </div>
            <a
              href="/projects"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-warm-300 bg-white px-4 text-sm font-medium text-warm-800 shadow-warm transition hover:border-warm-400 hover:bg-warm-100"
            >
              Current dashboard
            </a>
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </header>

        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold text-warm-900">{group.title}</h2>
                <p className="mt-1 text-sm text-warm-600">{group.description}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.scenarios.map((scenario) => {
                  const isLoading = activeScenarioId === scenario.id;

                  return (
                    <article
                      key={scenario.id}
                      className="flex min-h-64 flex-col justify-between rounded-lg border border-warm-200 bg-white p-4 shadow-warm"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-warm-900">
                            {scenario.projectName}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-warm-600">
                            {scenario.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {scenario.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-warm-100 px-2.5 py-1 text-xs font-medium text-warm-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="rounded-lg bg-warm-50 p-3">
                          <p className="text-xs font-medium text-warm-500">What to check</p>
                          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-5 text-warm-700">
                            {scenario.assertions.slice(0, 3).map((assertion) => (
                              <li key={assertion}>{assertion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void enterScenario(scenario)}
                        disabled={isLoading || activeScenarioId !== null}
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-warm transition hover:bg-brand-700 disabled:cursor-wait disabled:bg-warm-300"
                      >
                        {isLoading ? "Entering..." : "Enter flow"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
