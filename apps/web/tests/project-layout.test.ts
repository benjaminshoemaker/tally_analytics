import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/proj_123",
}));

import ProjectLayout from "../app/(dashboard)/projects/[id]/layout";

describe("project layout", () => {
  it("renders breadcrumb with Projects link", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_123" } },
          React.createElement("div", { "data-testid": "child" }, "Child content"),
        ),
      }),
    );

    expect(html).toContain('href="/projects"');
    expect(html).toContain("Projects");
  });

  it("renders project name from data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_123" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain("octo/repo");
  });

  it("renders status badge when status is available", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_123" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain("Active");
  });

  it("renders tab navigation with correct links", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_123" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain('href="/projects/proj_123"');
    expect(html).toContain('href="/projects/proj_123/overview"');
    expect(html).toContain('href="/projects/proj_123/live"');
    expect(html).toContain('href="/projects/proj_123/sessions"');
    expect(html).toContain("Overview");
    expect(html).toContain("Analytics");
    expect(html).toContain("Live Feed");
    expect(html).toContain("Sessions");
  });

  it("renders skeleton when data is pending", () => {
    const queryClient = new QueryClient();

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_456" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain("animate-shimmer");
  });

  it("renders project ID as fallback when repo name is not available", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_789"], {
      project: {
        id: "proj_789",
        githubRepoFullName: null,
        status: "pending",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_789" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain("proj_789");
  });

  it("renders children content", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_123" } },
          React.createElement("div", { className: "test-child" }, "My child content"),
        ),
      }),
    );

    expect(html).toContain("My child content");
    expect(html).toContain("test-child");
  });

  it("highlights the active tab based on pathname", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_123"], {
      project: {
        id: "proj_123",
        githubRepoFullName: "octo/repo",
        status: "active",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_123" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain("bg-slate-900");
  });

  it("renders different statuses correctly", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["project", "proj_analyzing"], {
      project: {
        id: "proj_analyzing",
        githubRepoFullName: "user/analyzing-repo",
        status: "analyzing",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(
          ProjectLayout,
          { params: { id: "proj_analyzing" } },
          React.createElement("div", null, "Child"),
        ),
      }),
    );

    expect(html).toContain("Analyzing");
  });
});
