"use client";

import React from "react";

import LiveEvent from "../dashboard/live-event";
import StatCard from "../dashboard/stat-card";
import TopList from "../dashboard/top-list";
import type {
  PublicDemoLiveEvent,
  PublicDemoOverview,
  PublicDemoProject,
  PublicDemoSessions,
} from "../../lib/demo/public-demo-data";
import DemoQuestionPanel from "./demo-ask-tally-panel";

type PublicDemoTab = "Overview" | "Live" | "Sessions" | "Ask Tally";

const tabs: PublicDemoTab[] = ["Overview", "Live", "Sessions", "Ask Tally"];

export default function PublicDemoDashboard({
  project,
  overview,
  liveEvents,
  sessions,
  questions,
}: {
  project: PublicDemoProject;
  overview: PublicDemoOverview;
  liveEvents: PublicDemoLiveEvent[];
  sessions: PublicDemoSessions;
  questions: readonly string[];
}) {
  const [activeTab, setActiveTab] = React.useState<PublicDemoTab>("Overview");

  return (
    <main className="min-h-screen bg-warm-50 text-warm-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-warm-200 bg-white p-4 shadow-warm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">Tally demo dashboard</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-warm-950">{project.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-warm-600">
              See what Tally can answer from analytics that already exist, and what task your agent gets when tracking is missing.
            </p>
          </div>
          <a
            href="/docs/setup"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Start with MCP
          </a>
        </header>

        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          This is demo data. Connect your repo for real analytics.
        </div>

        <nav className="rounded-lg border border-warm-200 bg-white p-2 shadow-warm" role="tablist" aria-label="Demo dashboard sections">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "min-h-11 rounded-md px-3 text-sm font-semibold transition",
                  activeTab === tab
                    ? "bg-warm-950 text-white"
                    : "bg-warm-50 text-warm-700 hover:bg-warm-100 hover:text-warm-950",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "Overview" ? (
          <OverviewPanel overview={overview} onAskTally={() => setActiveTab("Ask Tally")} />
        ) : null}
        {activeTab === "Live" ? <LivePanel events={liveEvents} /> : null}
        {activeTab === "Sessions" ? <SessionsPanel sessions={sessions} /> : null}
        {activeTab === "Ask Tally" ? <DemoQuestionPanel questions={questions} /> : null}
      </div>
    </main>
  );
}

function OverviewPanel({ overview, onAskTally }: { overview: PublicDemoOverview; onAskTally: () => void }) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Page views" value={overview.pageViews.total.toLocaleString()} change={overview.pageViews.change} detail="Last 30 days" />
        <StatCard label="Sessions" value={overview.sessions.total.toLocaleString()} change={overview.sessions.change} detail="Last 30 days" />
        <StatCard label="Top page" value={overview.topPage} detail="Most visited path" />
        <StatCard label="Top referrer" value={overview.topReferrer} detail="Largest traffic source" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-warm-950">Traffic trend</h2>
              <p className="mt-1 text-sm text-warm-600">Page views rose 18% over the last 30 days.</p>
            </div>
            <button type="button" onClick={onAskTally} className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              Ask Tally
            </button>
          </div>
          <div className="mt-5 flex h-40 items-end gap-2" role="img" aria-label="Page views trend for Acme Forms">
            {overview.pageViews.timeSeries.map((point) => {
              const height = Math.max(18, Math.round((point.count / 1120) * 100));
              return (
                <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t bg-brand-500" style={{ height: `${height}%` }} />
                  <span className="text-[10px] text-warm-500">{point.date.slice(0, 6)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4">
          <TopList title="Top pages" items={overview.topPages} />
          <TopList title="Top referrers" items={overview.topReferrers} />
        </div>
      </div>
    </section>
  );
}

function LivePanel({ events }: { events: PublicDemoLiveEvent[] }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-warm-950">Live events</h2>
        <p className="mt-1 text-sm text-warm-600">Recent fake production events from Acme Forms.</p>
      </div>
      {events.map((event, index) => (
        <LiveEvent key={event.id} event={event} isNew={index === 0} />
      ))}
    </section>
  );
}

function SessionsPanel({ sessions }: { sessions: PublicDemoSessions }) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total sessions" value={sessions.totalSessions.toLocaleString()} detail="Last 30 days" />
        <StatCard label="New visitors" value={sessions.newVisitors.toLocaleString()} detail="First-time sessions" />
        <StatCard label="Returning visitors" value={sessions.returningVisitors.toLocaleString()} detail="Returning sessions" />
      </div>
      <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm">
        <h2 className="font-display text-lg font-semibold text-warm-950">New vs returning sessions</h2>
        <div className="mt-5 grid gap-2">
          {sessions.timeSeries.map((point) => (
            <div key={point.date} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
              <span className="text-xs text-warm-500">{point.date}</span>
              <div className="flex h-4 overflow-hidden rounded-full bg-warm-100">
                <div className="bg-brand-600" style={{ width: `${Math.max(8, point.newSessions / 3)}%` }} />
                <div className="bg-warm-400" style={{ width: `${Math.max(4, point.returningSessions / 3)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
