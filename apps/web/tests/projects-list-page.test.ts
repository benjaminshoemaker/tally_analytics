import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ProjectsPage from "../app/(dashboard)/projects/page";
import { PROJECT_LIST_REFETCH_INTERVAL_MS } from "../lib/hooks/use-projects";

describe("/projects page", () => {
  it("configures polling every 10 seconds", () => {
    expect(PROJECT_LIST_REFETCH_INTERVAL_MS).toBe(10_000);
  });

  it("renders an empty state when there are no projects", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["projects"], { projects: [] });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectsPage),
      }),
    );

    expect(html).toContain("Projects");
    expect(html).toContain("No projects yet");
  });

  it("renders project cards that link to the detail page", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["projects"], {
      projects: [
        {
          id: "proj_123",
          githubRepoFullName: "octo/repo",
          status: "active",
          prUrl: null,
          detectedFramework: "nextjs-app",
          eventsThisMonth: 0,
          lastEventAt: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectsPage),
      }),
    );

    expect(html).toContain("octo/repo");
    expect(html).toContain('href="/projects/proj_123"');
    expect(html).toContain("active");
  });
});

