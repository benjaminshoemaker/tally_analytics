"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";

import SessionsChart from "../../../../../components/dashboard/sessions-chart";
import StatCard from "../../../../../components/dashboard/stat-card";
import { SkeletonStatCard, SkeletonChart } from "../../../../../components/dashboard/skeleton";

type Period = "24h" | "7d" | "30d";

type SessionsResponse = {
  period: Period;
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{ date: string; newSessions: number; returningSessions: number }>;
};

type ErrorResponse = { error?: string; message?: string };

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

async function fetchSessions(projectId: string, period: Period): Promise<SessionsResponse> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/analytics/sessions?period=${period}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  return body as SessionsResponse;
}

export default function SessionsPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [period, setPeriod] = useState<Period>("7d");

  const sessionsQuery = useQuery({
    queryKey: ["sessions", projectId, period],
    queryFn: () => fetchSessions(projectId, period),
    enabled: projectId.length > 0,
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Session Analytics</h2>
          <p className="text-sm text-slate-600">Visitor sessions breakdown.</p>
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

      {sessionsQuery.isPending ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonChart />
        </>
      ) : sessionsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Unable to load sessions. Please try again.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total sessions" value={String(sessionsQuery.data.totalSessions)} change={0} />
            <StatCard label="New visitors" value={String(sessionsQuery.data.newVisitors)} change={0} />
            <StatCard label="Returning visitors" value={String(sessionsQuery.data.returningVisitors)} change={0} />
          </div>

          <SessionsChart data={sessionsQuery.data.timeSeries} />
        </>
      )}
    </div>
  );
}

