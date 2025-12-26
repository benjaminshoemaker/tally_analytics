import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SessionsPage from "../app/(dashboard)/projects/[id]/sessions/page";

describe("/projects/[id]/sessions page", () => {
  it("renders summary stats and chart from cached query data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["sessions", "proj_123", "7d"], {
      period: "7d",
      totalSessions: 5,
      newVisitors: 5,
      returningVisitors: 0,
      timeSeries: [
        { date: "2025-01-01", newSessions: 2, returningSessions: 0 },
        { date: "2025-01-02", newSessions: 3, returningSessions: 0 },
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(SessionsPage, { params: { id: "proj_123" } }),
      }),
    );

    expect(html).toContain("Sessions");
    expect(html).toContain("Total sessions");
    expect(html).toContain("5");
    expect(html).toContain("New visitors");
    expect(html).toContain("Returning visitors");
  });
});

