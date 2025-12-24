import React from "react";

import type { LiveFeedEvent } from "../../lib/hooks/use-live-feed";

export default function LiveEvent({ event, isNew }: { event: LiveFeedEvent; isNew: boolean }) {
  return (
    <div
      className={[
        "flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm",
        isNew ? "animate-pulse" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {event.eventType} <span className="text-slate-600">—</span>{" "}
          <span className="text-slate-700">{event.path}</span>
        </p>
        {event.referrer ? <p className="truncate text-xs text-slate-600">Referrer: {event.referrer}</p> : null}
      </div>

      <span className="whitespace-nowrap text-xs text-slate-600">{event.relativeTime}</span>
    </div>
  );
}

