import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LiveFeedPage from "../app/(dashboard)/projects/[id]/live/page";
import { LIVE_FEED_REFETCH_INTERVAL_MS } from "../lib/hooks/use-live-feed";

describe("/projects/[id]/live page", () => {
  it("polls every 5 seconds", () => {
    expect(LIVE_FEED_REFETCH_INTERVAL_MS).toBe(5000);
  });

  it("renders an empty state when there are no events", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["live-feed", "proj_123"], { events: [], hasMore: false });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(LiveFeedPage, { params: { id: "proj_123" } }),
      }),
    );

    expect(html).toContain("Live feed");
    expect(html).toContain("No events yet");
  });

  it("renders recent events", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["live-feed", "proj_123"], {
      events: [
        {
          id: "e1",
          eventType: "page_view",
          path: "/",
          referrer: null,
          timestamp: "2025-01-01T00:00:00.000Z",
          relativeTime: "3 seconds ago",
        },
      ],
      hasMore: false,
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(LiveFeedPage, { params: { id: "proj_123" } }),
      }),
    );

    expect(html).toContain("page_view");
    expect(html).toContain("/");
    expect(html).toContain("3 seconds ago");
  });
});

