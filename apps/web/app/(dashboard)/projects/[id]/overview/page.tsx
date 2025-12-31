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

  const isRefetching = overviewQuery.isFetching && !overviewQuery.isPending;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3 opacity-0 animate-fade-in md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl text-warm-900">Analytics Overview</h2>
          <p className="text-sm text-warm-500">Key metrics for this project.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-warm-700">
          Period
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              disabled={isRefetching}
              className="appearance-none rounded-lg border border-warm-200 bg-white py-1.5 pl-3 pr-8 text-sm shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              {isRefetching ? (
                <svg className="size-4 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="size-4 text-warm-400" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 animate-fade-in">
          <p className="text-sm text-red-700">Unable to load analytics. Please try again.</p>
        </div>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity duration-300 ${isRefetching ? "opacity-60" : "opacity-100"}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="opacity-0 animate-fade-in stagger-1">
              <StatCard label="Page views" value={overviewQuery.data.pageViews.total.toLocaleString()} change={overviewQuery.data.pageViews.change} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-2">
              <StatCard label="Sessions" value={overviewQuery.data.sessions.total.toLocaleString()} change={overviewQuery.data.sessions.change} />
            </div>
          </div>

          <div className="opacity-0 animate-fade-in stagger-3">
            <PageViewsChart data={overviewQuery.data.pageViews.timeSeries} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="opacity-0 animate-fade-in stagger-4">
              <TopList title="Top pages" items={topPagesItems} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-5">
              <TopList title="Top referrers" items={topReferrersItems} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

