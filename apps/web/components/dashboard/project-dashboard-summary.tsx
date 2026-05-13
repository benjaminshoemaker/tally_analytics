'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import Skeleton from './skeleton';

type OverviewResponse = {
  period: '30d';
  pageViews: { total: number; change: number; timeSeries: Array<{ date: string; count: number }> };
  sessions: { total: number; change: number };
  topPages: Array<{ path: string; views: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; count: number; percentage: number }>;
};

type ErrorResponse = { error?: string; message?: string };

type Props = {
  projectId: string;
  lastEventAt: string;
};

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === 'string' && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === 'string' && maybe.message.length > 0) return maybe.message;
  return null;
}

async function fetchOverview(projectId: string): Promise<OverviewResponse> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/analytics/overview?period=30d`,
    {
      method: 'GET',
      headers: { accept: 'application/json' },
    }
  );
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok)
    throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  return body as OverviewResponse;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-warm-200 bg-warm-50/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-warm-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-warm-950">{value}</p>
      {detail && <p className="mt-1 truncate text-xs text-warm-600">{detail}</p>}
    </div>
  );
}

export default function ProjectDashboardSummary({ projectId, lastEventAt }: Props) {
  const overviewQuery = useQuery({
    queryKey: ['project-dashboard-summary', projectId, '30d'],
    queryFn: () => fetchOverview(projectId),
    enabled: projectId.length > 0,
  });

  const topPage = overviewQuery.data?.topPages[0] ?? null;
  const topReferrer = overviewQuery.data?.topReferrers[0] ?? null;
  const hasEvents = Boolean(
    overviewQuery.data &&
    (overviewQuery.data.pageViews.total > 0 ||
      overviewQuery.data.sessions.total > 0 ||
      overviewQuery.data.topPages.length > 0 ||
      overviewQuery.data.topReferrers.length > 0)
  );

  const lastEventLabel = useMemo(() => formatTimestamp(lastEventAt), [lastEventAt]);

  if (overviewQuery.isPending) {
    return (
      <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </section>
    );
  }

  if (overviewQuery.isError) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-800">Recent usage unavailable</h2>
        <p className="mt-1 text-sm text-red-700">Open Analytics to retry the full report.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-warm-950">Recent usage</h2>
          <p className="mt-1 text-sm text-warm-600">
            Last event {lastEventLabel}. Showing the last 30 days.
          </p>
        </div>
        <Link
          href={`/projects/${encodeURIComponent(projectId)}/overview`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-3 py-2 text-sm font-medium text-warm-800 shadow-sm transition-colors hover:bg-warm-50"
        >
          Open Analytics
        </Link>
      </div>

      {!hasEvents ? (
        <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3">
          <p className="text-sm font-medium text-sky-950">No events in the last 30 days</p>
          <p className="mt-1 text-sm text-sky-900">
            Tally has received events before. Open Analytics or Live to inspect older activity.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Page views"
            value={overviewQuery.data.pageViews.total.toLocaleString()}
            detail={`${overviewQuery.data.pageViews.change >= 0 ? '+' : ''}${overviewQuery.data.pageViews.change}% vs prior period`}
          />
          <MetricTile
            label="Sessions"
            value={overviewQuery.data.sessions.total.toLocaleString()}
            detail={`${overviewQuery.data.sessions.change >= 0 ? '+' : ''}${overviewQuery.data.sessions.change}% vs prior period`}
          />
          <MetricTile
            label="Top page"
            value={topPage?.path ?? 'None'}
            detail={topPage ? `${topPage.views.toLocaleString()} views` : 'No page views yet'}
          />
          <MetricTile
            label="Top referrer"
            value={topReferrer?.referrer ?? 'None'}
            detail={
              topReferrer ? `${topReferrer.count.toLocaleString()} sessions` : 'No referrers yet'
            }
          />
        </div>
      )}
    </section>
  );
}
