import { expect, test } from '@playwright/test';

import { loginScenarioUser, seedScenario } from './support/scenarios';

test('@scenario seeded analysis-failed scenario can log in and open project detail', async ({
  page,
}) => {
  const scenario = seedScenario('analysis-failed-can-regenerate');
  const project = scenario.projects[0];
  if (!project) throw new Error('Scenario must include a project');
  if (!project.prUrl) throw new Error('Scenario project must include a PR URL');

  await loginScenarioUser(page, scenario);
  await page.goto(`/projects/${project.id}`);

  await expect(page.getByText('Analysis Failed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-run Analysis' })).toBeVisible();
  await expect(page.getByRole('link', { name: /View PR/ })).toHaveAttribute('href', project.prUrl);
});

test('@scenario seeded campaign events are queryable through analytics APIs', async ({ page }) => {
  const scenario = seedScenario('active-project-with-campaign-data');
  const project = scenario.projects[0];
  if (!project) throw new Error('Scenario must include a project');

  await loginScenarioUser(page, scenario);

  const overviewResponse = await page.request.get(
    `/api/projects/${project.id}/analytics/overview?period=30d`
  );
  expect(overviewResponse.ok()).toBe(true);
  await expect(overviewResponse.json()).resolves.toMatchObject({
    period: '30d',
    pageViews: {
      total: 2,
      change: 100,
      timeSeries: [{ date: '2026-05-01', count: 2 }],
    },
    sessions: {
      total: 2,
      change: 100,
    },
    topPages: expect.arrayContaining([
      { path: '/', views: 1, percentage: 50 },
      { path: '/signup', views: 1, percentage: 50 },
    ]),
    topReferrers: expect.arrayContaining([
      { referrer: 'google.com', count: 1, percentage: 50 },
      { referrer: 'www.linkedin.com', count: 1, percentage: 50 },
    ]),
  });

  const sessionsResponse = await page.request.get(
    `/api/projects/${project.id}/analytics/sessions?period=30d`
  );
  expect(sessionsResponse.ok()).toBe(true);
  await expect(sessionsResponse.json()).resolves.toEqual({
    period: '30d',
    totalSessions: 2,
    newVisitors: 1,
    returningVisitors: 1,
    timeSeries: [{ date: '2026-05-01', newSessions: 1, returningSessions: 1 }],
  });

  const liveResponse = await page.request.get(`/api/projects/${project.id}/analytics/live?limit=2`);
  expect(liveResponse.ok()).toBe(true);
  await expect(liveResponse.json()).resolves.toMatchObject({
    events: [
      { eventType: 'page_view', path: '/signup', timestamp: '2026-05-01T12:36:00.000Z' },
      { eventType: 'session_start', path: '/pricing', timestamp: '2026-05-01T12:30:00.000Z' },
    ],
    hasMore: true,
  });
});

test('@scenario seeded MCP active no-event project shows waiting state', async ({ page }) => {
  const scenario = seedScenario('mcp-active-no-events');
  const project = scenario.projects[0];
  if (!project) throw new Error('Scenario must include a project');

  await loginScenarioUser(page, scenario);
  await page.goto(`/projects/${project.id}`);

  await expect(
    page.getByRole('heading', { name: project.displayName ?? project.id })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting for first event' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-run Analysis' })).toHaveCount(0);

  await page.goto(`/projects/${project.id}/live`);
  await expect(page.getByRole('heading', { name: 'Waiting for first event' })).toBeVisible();
});
