import React from "react";

import type { LiveFeedEvent } from "../../lib/hooks/use-live-feed";

export default function LiveEvent({ event, isNew }: { event: LiveFeedEvent; isNew: boolean }) {
  return (
    <div
      className={[
        "group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-warm-200 bg-white px-4 py-3 shadow-warm transition-all duration-300 hover:shadow-warm-md sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        isNew ? "ring-2 ring-brand-500/20 animate-fade-in" : "",
      ].join(" ")}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-brand-400 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-warm-900">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono">{event.eventType}</span>
          </span>
        </p>
        <p className="truncate text-xs text-warm-700">{event.path}</p>
        {event.referrer ? <p className="truncate text-xs text-warm-500">Referrer: {event.referrer}</p> : null}
      </div>

      <span className="text-xs font-medium text-warm-500 sm:whitespace-nowrap">{event.relativeTime}</span>
    </div>
  );
}
