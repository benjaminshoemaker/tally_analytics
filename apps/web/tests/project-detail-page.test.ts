import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ProjectDetailPage from "../app/(dashboard)/projects/[id]/page";

describe("/projects/[id] page", () => {
  it("renders the repo name, PR link, onboarding checklist, and regenerate button when eligible", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "analysis_failed",
        prNumber: 1,
        prUrl: "https://github.com/octo/repo/pull/1",
        detectedFramework: "nextjs-app",
        detectedAnalytics: [],
        eventsThisMonth: 0,
        lastEventAt: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      quotaLimit: 10000,
      quotaUsed: 0,
      isOverQuota: false,
      userPlan: "free",
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectDetailPage, { params: { id: "proj_123" } }),
      }),
    );

    expect(html).toContain("octo/repo");
    expect(html).toContain('href="https://github.com/octo/repo/pull/1"');
    expect(html).toContain("Getting Started");
    expect(html).toContain("Re-run Analysis"); // Button text changed from "Regenerate PR"
    expect(html).toContain("Analysis Failed"); // Status-specific card for failed state
  });
});
