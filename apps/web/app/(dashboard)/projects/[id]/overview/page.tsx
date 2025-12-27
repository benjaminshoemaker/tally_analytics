"use client";

import React, { useMemo, useState } from "react";

import PageViewsChart from "../../../../../components/dashboard/page-views-chart";
import StatCard from "../../../../../components/dashboard/stat-card";
import TopList from "../../../../../components/dashboard/top-list";
import { SkeletonStatCard, SkeletonChart, SkeletonList } from "../../../../../components/dashboard/skeleton";
import { useQuery } from "@tanstack/react-query";

type Period = "24h" | "7d" | "30d";

type OverviewResponse = {
  period: Period;
  pageViews: { total: number; change: number; timeSeries: Array<{ date: string; count: number }> };
  sessions: { total: number; change: number };
  topPages: Array<{ path: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; count: number; percentage: number }>;
};

type ErrorResponse = { error?: string; message?: string };

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

async function fetchOverview(projectId: string, period: Period): Promise<OverviewResponse> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/analytics/overview?period=${period}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  return body as OverviewResponse;
}

export default function OverviewPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [period, setPeriod] = useState<Period>("7d");

  const overviewQuery = useQuery({
    queryKey: ["overview", projectId, period],
    queryFn: () => fetchOverview(projectId, period),
    enabled: projectId.length > 0,
  });

  const topPagesItems = useMemo(() => {
    return (
      overviewQuery.data?.topPages.map((item) => ({
        label: item.path,
        value: item.views,
        percentage: item.percentage,
      })) ?? []
    );
  }, [overviewQuery.data]);

  const topReferrersItems = useMemo(() => {
    return (
      overviewQuery.data?.topReferrers.map((item) => ({
        label: item.referrer,
        value: item.count,
        percentage: item.percentage,
      })) ?? []
    );
  }, [overviewQuery.data]);

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Analytics Overview</h2>
          <p className="text-sm text-slate-600">Key metrics for this project.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          Period
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
      </header>

      {overviewQuery.isPending ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonChart />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonList />
            <SkeletonList />
          </div>
        </>
      ) : overviewQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Unable to load analytics. Please try again.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Page views" value={String(overviewQuery.data.pageViews.total)} change={overviewQuery.data.pageViews.change} />
            <StatCard label="Sessions" value={String(overviewQuery.data.sessions.total)} change={overviewQuery.data.sessions.change} />
          </div>

          <PageViewsChart data={overviewQuery.data.pageViews.timeSeries} />

          <div className="grid gap-4 md:grid-cols-2">
            <TopList title="Top pages" items={topPagesItems} />
            <TopList title="Top referrers" items={topReferrersItems} />
          </div>
        </>
      )}
    </div>
  );
}

