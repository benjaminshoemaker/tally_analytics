import React from "react";

import type { LiveFeedEvent } from "../../lib/hooks/use-live-feed";

export default function LiveEvent({ event, isNew }: { event: LiveFeedEvent; isNew: boolean }) {
  return (
    <div
      className={[
        "flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        isNew ? "animate-pulse" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">
          <span className="font-mono">{event.eventType}</span>
        </p>
        <p className="truncate text-xs text-slate-700">{event.path}</p>
        {event.referrer ? <p className="truncate text-xs text-slate-600">Referrer: {event.referrer}</p> : null}
      </div>

      <span className="text-xs text-slate-600 sm:whitespace-nowrap">{event.relativeTime}</span>
    </div>
  );
}
