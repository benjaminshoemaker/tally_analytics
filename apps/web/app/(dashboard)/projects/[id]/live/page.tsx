"use client";

import React, { useEffect, useMemo, useState } from "react";

import LiveEvent from "../../../../../components/dashboard/live-event";
import { useLiveFeed } from "../../../../../lib/hooks/use-live-feed";

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
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Live feed</h1>
        <p className="text-sm text-slate-600">Recent events for this project.</p>
      </header>

      {feedQuery.isPending ? (
        <p className="text-sm text-slate-700">Loading events…</p>
      ) : feedQuery.isError ? (
        <p className="text-sm text-slate-700">Unable to load events.</p>
      ) : feedQuery.data.events.length === 0 ? (
        <p className="text-sm text-slate-700">No events yet.</p>
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

