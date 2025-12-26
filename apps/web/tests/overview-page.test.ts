import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import OverviewPage from "../app/(dashboard)/projects/[id]/overview/page";

describe("/projects/[id]/overview page", () => {
  it("renders summary stats and top lists from cached query data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["overview", "proj_123", "7d"], {
      period: "7d",
      pageViews: { total: 30, change: 100, timeSeries: [{ date: "2025-01-01", count: 30 }] },
      sessions: { total: 5, change: -50 },
      topPages: [{ path: "/", views: 20, percentage: 66.67 }],
      topReferrers: [{ referrer: "Direct", count: 5, percentage: 100 }],
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(OverviewPage, { params: { id: "proj_123" } }),
      }),
    );

    expect(html).toContain("Overview");
    expect(html).toContain("Page views");
    expect(html).toContain("30");
    expect(html).toContain("Sessions");
    expect(html).toContain("5");
    expect(html).toContain("Top pages");
    expect(html).toContain("Top referrers");
    expect(html).toContain("Direct");
  });
});

