import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ProjectDetailPage from '../app/(dashboard)/projects/[id]/page';

describe('/projects/[id] page', () => {
  it('renders the repo name, legacy onboarding checklist, and regenerate button when eligible', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['project', 'proj_123'], {
      project: {
        id: 'proj_123',
        displayName: 'octo/repo',
        source: 'github_app',
        githubRepoFullName: 'octo/repo',
        status: 'analysis_failed',
        prNumber: 1,
        prUrl: 'https://github.com/octo/repo/pull/1',
        detectedFramework: 'nextjs-app',
        detectedAnalytics: [],
        eventsThisMonth: 0,
        lastEventAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        actions: {
          canRegenerate: true,
        },
      },
      quotaLimit: 10000,
      quotaUsed: 0,
      isOverQuota: false,
      userPlan: 'free',
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectDetailPage, { params: { id: 'proj_123' } }),
      })
    );

    expect(html).not.toContain('View PR');
    expect(html).not.toContain('href="https://github.com/octo/repo/pull/1"');
    expect(html).toContain('Getting Started');
    expect(html).toContain('Re-run Analysis'); // Button text changed from "Regenerate PR"
    expect(html).toContain('Analysis Failed'); // Status-specific card for failed state
    expect(html).toContain('Ask Tally');
    expect(html).toContain('Agent task queue');
  });

  it('does not render GitHub-only regenerate controls for MCP projects', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['project', 'proj_mcp'], {
      project: {
        id: 'proj_mcp',
        displayName: 'Tally Demo',
        source: 'mcp_codex',
        githubRepoFullName: null,
        status: 'unsupported',
        prNumber: null,
        prUrl: null,
        detectedFramework: 'nextjs-app',
        detectedAnalytics: [],
        eventsThisMonth: 0,
        lastEventAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        actions: {
          canRegenerate: false,
        },
      },
      quotaLimit: 10000,
      quotaUsed: 0,
      isOverQuota: false,
      userPlan: 'free',
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectDetailPage, { params: { id: 'proj_mcp' } }),
      })
    );

    expect(html).not.toContain('Re-run Analysis');
    expect(html).not.toContain('Repository Not Supported');
    expect(html).not.toContain('View PR');
    expect(html).toContain('Ask Tally');
  });

  it('renders the waiting-for-first-event state for active projects with no events', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['project', 'proj_mcp'], {
      project: {
        id: 'proj_mcp',
        displayName: 'Tally Demo',
        source: 'mcp_codex',
        githubRepoFullName: null,
        status: 'active',
        prNumber: null,
        prUrl: null,
        detectedFramework: 'nextjs-app',
        detectedAnalytics: [],
        eventsThisMonth: 0,
        lastEventAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        actions: {
          canRegenerate: false,
        },
      },
      quotaLimit: 10000,
      quotaUsed: 0,
      isOverQuota: false,
      userPlan: 'free',
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectDetailPage, { params: { id: 'proj_mcp' } }),
      })
    );

    expect(html).toContain('Waiting for first event');
    expect(html).toContain('Tally is installed, but no production events have been received yet.');
    expect(html).toContain('Ask Tally');
  });

  it('renders recent usage immediately for active projects with events', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['project', 'proj_active'], {
      project: {
        id: 'proj_active',
        displayName: 'Tally Demo',
        source: 'mcp_codex',
        githubRepoFullName: null,
        status: 'active',
        prNumber: null,
        prUrl: null,
        detectedFramework: 'nextjs-app',
        detectedAnalytics: [],
        eventsThisMonth: 12,
        lastEventAt: '2026-05-01T12:36:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        actions: {
          canRegenerate: false,
        },
      },
      quotaLimit: 10000,
      quotaUsed: 12,
      isOverQuota: false,
      userPlan: 'free',
    });
    queryClient.setQueryData(['project-dashboard-summary', 'proj_active', '30d'], {
      period: '30d',
      pageViews: { total: 12, change: 100, timeSeries: [{ date: '2026-05-01', count: 12 }] },
      sessions: { total: 4, change: 100 },
      topPages: [{ path: '/signup', views: 7, percentage: 58.33 }],
      topReferrers: [{ referrer: 'google.com', count: 3, percentage: 75 }],
    });

    const html = renderToStaticMarkup(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(ProjectDetailPage, { params: { id: 'proj_active' } }),
      })
    );

    expect(html).toContain('Recent usage');
    expect(html).toContain('Page views');
    expect(html).toContain('12');
    expect(html).toContain('/signup');
    expect(html).toContain('google.com');
    expect(html).not.toContain('Waiting for first event');
  });
});
