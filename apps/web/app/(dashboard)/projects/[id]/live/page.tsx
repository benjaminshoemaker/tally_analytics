"use client";

import React, { useEffect, useMemo, useState } from "react";

import LiveEvent from "../../../../../components/dashboard/live-event";
import Skeleton from "../../../../../components/dashboard/skeleton";
import { useLiveFeed } from "../../../../../lib/hooks/use-live-feed";

function ActivityIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-slate-300">
      <path
        d="M44 24H36L30 42L18 6L12 24H4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SkeletonEvent() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export default function LiveFeedPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const feedQuery = useLiveFeed(projectId);

  const [seenEventIds, setSeenEventIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const events = feedQuery.data?.events ?? [];
    if (!events.length) return;

    setSeenEventIds((previous) => {
      const next = new Set(previous);
      for (const event of events) next.add(event.id);
      return next;
    });
  }, [feedQuery.data]);

  const isNewById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const event of feedQuery.data?.events ?? []) {
      map.set(event.id, !seenEventIds.has(event.id));
    }
    return map;
  }, [feedQuery.data, seenEventIds]);

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Live Feed</h2>
        <p className="text-sm text-slate-600">Real-time events from your site.</p>
      </header>

      {feedQuery.isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonEvent key={i} />
          ))}
        </div>
      ) : feedQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Unable to load events. Please try again.</p>
        </div>
      ) : feedQuery.data.events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <ActivityIcon />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No events yet</h3>
          <p className="mt-1 text-sm text-slate-600">Events will appear here as visitors browse your site.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedQuery.data.events.map((event) => (
            <LiveEvent key={event.id} event={event} isNew={isNewById.get(event.id) ?? false} />
          ))}
        </div>
      )}
    </div>
  );
}

