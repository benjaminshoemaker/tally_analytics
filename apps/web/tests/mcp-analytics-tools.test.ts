import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyticsToolSchemas,
  getEventSchemaInputSchema,
  getLiveEventsInputSchema,
  getPathsToEventInputSchema,
  getProjectOverviewInputSchema,
  resolveProjectInputSchema,
  suggestNextEventsInputSchema,
} from "../lib/mcp/tools/analytics-schemas";
import {
  parseAnalyticsToolEventName,
  parseAnalyticsToolGoal,
  parseAnalyticsToolLimit,
  parseAnalyticsToolPeriod,
  parseAnalyticsToolSince,
  parseAnalyticsToolSteps,
  parseResolveProjectRepoInput,
  toAnalyticsToolResult,
  unauthorizedAnalyticsResult,
  unauthorizedAnalyticsScopeResult,
  registerAnalyticsTools,
} from "../lib/mcp/tools/analytics";
import { hasMcpScope, userIdFromAuth } from "../lib/mcp/tools/auth";

let listOwnedAnalyticsProjectsSpy: ReturnType<typeof vi.fn> | undefined;
let resolveOwnedMcpProjectForRepoContextSpy: ReturnType<typeof vi.fn> | undefined;
let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;
let getProjectOverviewSpy: ReturnType<typeof vi.fn> | undefined;
let getLiveEventsSpy: ReturnType<typeof vi.fn> | undefined;
let getSessionsSummarySpy: ReturnType<typeof vi.fn> | undefined;
let getTopPagesSpy: ReturnType<typeof vi.fn> | undefined;
let getTopReferrersSpy: ReturnType<typeof vi.fn> | undefined;
let listEventsSpy: ReturnType<typeof vi.fn> | undefined;
let getEventSchemaSpy: ReturnType<typeof vi.fn> | undefined;
let getPathsToEventSpy: ReturnType<typeof vi.fn> | undefined;
let suggestNextEventsSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", () => ({
  listOwnedAnalyticsProjects: (...args: unknown[]) => {
    if (!listOwnedAnalyticsProjectsSpy) throw new Error("listOwnedAnalyticsProjectsSpy not initialized");
    return listOwnedAnalyticsProjectsSpy(...args);
  },
  resolveOwnedMcpProjectForRepoContext: (...args: unknown[]) => {
    if (!resolveOwnedMcpProjectForRepoContextSpy) {
      throw new Error("resolveOwnedMcpProjectForRepoContextSpy not initialized");
    }
    return resolveOwnedMcpProjectForRepoContextSpy(...args);
  },
  getOwnedAnalyticsProject: (...args: unknown[]) => {
    if (!getOwnedAnalyticsProjectSpy) throw new Error("getOwnedAnalyticsProjectSpy not initialized");
    return getOwnedAnalyticsProjectSpy(...args);
  },
}));

vi.mock("../lib/analytics/service", () => ({
  getProjectOverview: (...args: unknown[]) => {
    if (!getProjectOverviewSpy) throw new Error("getProjectOverviewSpy not initialized");
    return getProjectOverviewSpy(...args);
  },
  getLiveEvents: (...args: unknown[]) => {
    if (!getLiveEventsSpy) throw new Error("getLiveEventsSpy not initialized");
    return getLiveEventsSpy(...args);
  },
  getSessionsSummary: (...args: unknown[]) => {
    if (!getSessionsSummarySpy) throw new Error("getSessionsSummarySpy not initialized");
    return getSessionsSummarySpy(...args);
  },
  getTopPages: (...args: unknown[]) => {
    if (!getTopPagesSpy) throw new Error("getTopPagesSpy not initialized");
    return getTopPagesSpy(...args);
  },
  getTopReferrers: (...args: unknown[]) => {
    if (!getTopReferrersSpy) throw new Error("getTopReferrersSpy not initialized");
    return getTopReferrersSpy(...args);
  },
  listEvents: (...args: unknown[]) => {
    if (!listEventsSpy) throw new Error("listEventsSpy not initialized");
    return listEventsSpy(...args);
  },
  getEventSchema: (...args: unknown[]) => {
    if (!getEventSchemaSpy) throw new Error("getEventSchemaSpy not initialized");
    return getEventSchemaSpy(...args);
  },
  getPathsToEvent: (...args: unknown[]) => {
    if (!getPathsToEventSpy) throw new Error("getPathsToEventSpy not initialized");
    return getPathsToEventSpy(...args);
  },
  suggestNextEvents: (...args: unknown[]) => {
    if (!suggestNextEventsSpy) throw new Error("suggestNextEventsSpy not initialized");
    return suggestNextEventsSpy(...args);
  },
}));

function expectValidationStatus(result: unknown, status: string): void {
  expect(result).toMatchObject({ ok: false, error: { status } });
}

const dashboardUrls = {
  project: "https://usetally.xyz/projects/proj_123",
  overview: "https://usetally.xyz/projects/proj_123/overview",
  live: "https://usetally.xyz/projects/proj_123/live",
  sessions: "https://usetally.xyz/projects/proj_123/sessions",
};

const ownedProject = {
  id: "proj_123",
  displayName: "Example App",
  source: "mcp_codex",
  status: "active",
  lastEventAt: new Date("2026-05-09T00:00:00.000Z"),
  mcpRepoName: "secret-repo",
  mcpAppRoot: ".",
  mcpPackageManager: "pnpm",
  dashboardUrls,
};

beforeEach(() => {
  listOwnedAnalyticsProjectsSpy = vi.fn();
  resolveOwnedMcpProjectForRepoContextSpy = vi.fn();
  getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue(ownedProject);
  getProjectOverviewSpy = vi.fn();
  getLiveEventsSpy = vi.fn();
  getSessionsSummarySpy = vi.fn();
  getTopPagesSpy = vi.fn();
  getTopReferrersSpy = vi.fn();
  listEventsSpy = vi.fn();
  getEventSchemaSpy = vi.fn();
  getPathsToEventSpy = vi.fn();
  suggestNextEventsSpy = vi.fn();
});

function analyticsToolCallback(registerToolSpy: ReturnType<typeof vi.fn>, name: string) {
  const call = registerToolSpy.mock.calls.find((toolCall) => toolCall[0] === name);
  if (!call) throw new Error(`Missing registered tool: ${name}`);
  return call[2] as (input: unknown, extra: { authInfo?: unknown }) => Promise<Record<string, unknown>>;
}

describe("MCP analytics auth and schemas", () => {
  it("extracts the authenticated user id from MCP auth info", () => {
    expect(userIdFromAuth({ extra: { userId: "user_1" } })).toBe("user_1");
    expect(userIdFromAuth({ extra: { userId: "" } })).toBeNull();
    expect(userIdFromAuth(undefined)).toBeNull();
    expect(hasMcpScope({ scopes: ["mcp:tasks"] }, "mcp:tasks")).toBe(true);
    expect(hasMcpScope({ scopes: ["mcp:install"] }, "mcp:tasks")).toBe(false);
    expect(unauthorizedAnalyticsResult()).toEqual({
      status: "unauthorized",
      summary: "Authentication is required before querying Tally analytics.",
    });
    expect(unauthorizedAnalyticsScopeResult()).toEqual({
      status: "unauthorized",
      summary: "The mcp:tasks scope is required before querying Tally analytics.",
    });
  });

  it("exports input and output schemas for all analytics tools", () => {
    expect(Object.keys(analyticsToolSchemas)).toEqual([
      "listProjects",
      "resolveProject",
      "listEvents",
      "getEventSchema",
      "getPathsToEvent",
      "getProjectOverview",
      "getLiveEvents",
      "getSessionsSummary",
      "getTopPages",
      "getTopReferrers",
      "suggestNextEvents",
    ]);

    for (const schema of Object.values(analyticsToolSchemas)) {
      expect(schema.inputSchema).toBeTruthy();
      expect(schema.outputSchema.safeParse({ status: "ok", summary: "ok" }).success).toBe(true);
    }
  });

  it("keeps recoverable invalid analytics inputs permissive at the schema boundary", () => {
    expect(getProjectOverviewInputSchema.safeParse({ projectId: "proj_1", period: "14d" }).success).toBe(true);
    expect(getLiveEventsInputSchema.safeParse({ projectId: "proj_1", limit: "many", since: "not-a-date" }).success).toBe(
      true,
    );
    expect(suggestNextEventsInputSchema.safeParse({ projectId: "proj_1", period: "7d", goal: "" }).success).toBe(true);
    expect(getEventSchemaInputSchema.safeParse({ projectId: "proj_1", period: "7d", eventName: "" }).success).toBe(
      true,
    );
    expect(
      getPathsToEventInputSchema.safeParse({
        projectId: "proj_1",
        period: "7d",
        targetEvent: "",
        maxSteps: 99,
        limit: "many",
      }).success,
    ).toBe(true);
    expect(
      resolveProjectInputSchema.safeParse({
        repo: { name: "repo", workspaceRoot: ".", appRoot: "../outside", packageManager: "pnpm" },
      }).success,
    ).toBe(true);
  });

  it("returns structured validation statuses after permissive schema parsing", () => {
    expectValidationStatus(parseAnalyticsToolPeriod("14d"), "invalid_period");
    expectValidationStatus(parseAnalyticsToolLimit("many", { defaultValue: 20, min: 1, max: 100 }), "invalid_limit");
    expectValidationStatus(parseAnalyticsToolSince("not-a-date"), "invalid_since");
    expectValidationStatus(parseAnalyticsToolGoal(""), "invalid_goal");
    expectValidationStatus(parseAnalyticsToolEventName(""), "invalid_event_name");
    expectValidationStatus(parseAnalyticsToolSteps(99), "invalid_steps");
    expectValidationStatus(
      parseResolveProjectRepoInput({
        repo: { name: "repo", workspaceRoot: ".", appRoot: "../outside", packageManager: "pnpm" },
      }),
      "invalid_repo_context",
    );
  });
});

describe("MCP analytics result mapping", () => {
  it("maps domain success statuses without setting isError", () => {
    for (const status of [
      "ok",
      "no_projects",
      "no_events",
      "partial_data",
      "insufficient_data",
      "no_match",
      "multiple_matches",
    ] as const) {
      const result = toAnalyticsToolResult({ status, summary: `${status} summary` });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({ status, summary: `${status} summary` });
      expect(result.content).toEqual([{ type: "text", text: `${status} summary` }]);
    }
  });

  it("sets isError for invalid input, unauthorized, project-not-found, and service-error statuses", () => {
    for (const status of [
      "invalid_period",
      "invalid_limit",
      "invalid_since",
      "invalid_goal",
      "invalid_event_name",
      "invalid_steps",
      "invalid_repo_context",
      "unauthorized",
      "project_not_found",
      "service_error",
    ] as const) {
      const result = toAnalyticsToolResult({ status, summary: `${status} summary` });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({ status });
    }
  });

  it("maps missing MCP auth to structured unauthorized", () => {
    const result = toAnalyticsToolResult(unauthorizedAnalyticsResult());

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        status: "unauthorized",
        summary: "Authentication is required before querying Tally analytics.",
      },
      content: [{ type: "text", text: "Authentication is required before querying Tally analytics." }],
    });
  });

  it("keeps result text compact and away from secrets or raw query details", () => {
    const result = toAnalyticsToolResult({
      status: "service_error",
      summary:
        "Bearer oauth-secret TINYBIRD_TOKEN=tb-secret SELECT * FROM events WHERE githubInstallationId=123 billingPlan=pro",
      oauthToken: "oauth-secret",
      tinybirdToken: "tb-secret",
      rawSql: "SELECT * FROM events",
      githubInstallationId: 123,
      billingPlan: "pro",
      privateSourceContent: "source code",
    });
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";

    expect(text).toBe("Analytics query failed.");
    expect(text).not.toContain("oauth-secret");
    expect(text).not.toContain("tb-secret");
    expect(text).not.toContain("SELECT * FROM events");
    expect(text).not.toContain("githubInstallationId=123");
    expect(text).not.toContain("billingPlan=pro");
    expect(text).not.toContain("source code");
  });
});

describe("MCP project and dashboard analytics tools", () => {
  it("registers project and dashboard-semantics tools with read-only schemas", () => {
    const registerToolSpy = vi.fn();

    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    expect(registerToolSpy.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([
      "list_projects",
      "resolve_project",
      "get_project_overview",
      "get_live_events",
      "get_sessions_summary",
      "get_top_pages",
      "get_top_referrers",
    ]));

    for (const [, options] of registerToolSpy.mock.calls) {
      expect(options).toMatchObject({
        title: expect.any(String),
        description: expect.any(String),
        inputSchema: expect.any(Object),
        outputSchema: expect.any(Object),
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
      });
    }
  });

  it("lists owned projects without private MCP, GitHub, OAuth, or billing fields", async () => {
    listOwnedAnalyticsProjectsSpy = vi.fn().mockResolvedValue([ownedProject]);
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const result = await analyticsToolCallback(registerToolSpy, "list_projects")(
      { limit: 1 },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(listOwnedAnalyticsProjectsSpy).toHaveBeenCalledWith({ userId: "user_1", limit: 1 });
    expect(result).toMatchObject({
      structuredContent: {
        status: "ok",
        projects: [
          {
            id: "proj_123",
            name: "Example App",
            status: "active",
            source: "mcp_codex",
            dashboardUrls,
          },
        ],
      },
    });
    expect(JSON.stringify(result.structuredContent)).not.toContain("secret-repo");
    expect(JSON.stringify(result.structuredContent)).not.toContain("githubInstallation");
    expect(JSON.stringify(result.structuredContent)).not.toContain("oauth");
    expect(JSON.stringify(result.structuredContent)).not.toContain("billing");
  });

  it("resolves a repo context to one owned project without returning fingerprints", async () => {
    resolveOwnedMcpProjectForRepoContextSpy = vi.fn().mockResolvedValue({
      status: "ok",
      project: { ...ownedProject, mcpFingerprint: "raw-fingerprint-value" },
      match: { strategy: "fingerprint", confidence: "exact" },
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const result = await analyticsToolCallback(registerToolSpy, "resolve_project")(
      { repo: { name: "repo", workspaceRoot: ".", appRoot: ".", packageManager: "pnpm" } },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "ok",
        project: {
          id: "proj_123",
          dashboardUrls,
        },
        match: { confidence: "exact" },
      },
    });
    expect(JSON.stringify(result.structuredContent)).not.toContain("raw-fingerprint-value");
  });

  it("returns dashboard URLs, compact summaries, and provenance for project analytics responses", async () => {
    getProjectOverviewSpy = vi.fn().mockResolvedValue({
      status: "ok",
      summary: "12 page views and 4 sessions in the selected period.",
      period: "7d",
      pageViews: { total: 12, change: 0, timeSeries: [] },
      sessions: { total: 4, change: 0 },
      topPages: [],
      topReferrers: [],
      provenance: {
        projectName: "Example App",
        generatedAt: "2026-05-09T00:00:00.000Z",
        queryBasis: { tool: "get_project_overview", semantics: "dashboard_overview" },
      },
      dashboardUrls,
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const result = await analyticsToolCallback(registerToolSpy, "get_project_overview")(
      { projectId: "proj_123", period: "7d" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(getOwnedAnalyticsProjectSpy).toHaveBeenCalledWith({ userId: "user_1", projectId: "proj_123" });
    expect(getProjectOverviewSpy).toHaveBeenCalledWith({ userId: "user_1", projectId: "proj_123", period: "7d" });
    expect(result).toMatchObject({
      content: [{ type: "text", text: "12 page views and 4 sessions in the selected period." }],
      structuredContent: {
        status: "ok",
        dashboardUrls,
        provenance: {
          queryBasis: { semantics: "dashboard_overview" },
        },
      },
    });
  });

  it("returns project_not_found before calling analytics services for unowned projects", async () => {
    getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue(null);
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const result = await analyticsToolCallback(registerToolSpy, "get_project_overview")(
      { projectId: "proj_other", period: "7d" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      isError: true,
      structuredContent: { status: "project_not_found" },
    });
    expect(getProjectOverviewSpy).not.toHaveBeenCalled();
  });
});

describe("MCP event, path, and recommendation analytics tools", () => {
  it("registers event discovery, path, and recommendation tools as read-only with output schemas", () => {
    const registerToolSpy = vi.fn();

    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    expect(registerToolSpy.mock.calls.map((call) => call[0])).toEqual([
      "list_projects",
      "resolve_project",
      "get_project_overview",
      "get_live_events",
      "get_sessions_summary",
      "get_top_pages",
      "get_top_referrers",
      "list_events",
      "get_event_schema",
      "get_paths_to_event",
      "suggest_next_events",
    ]);

    for (const name of ["list_events", "get_event_schema", "get_paths_to_event", "suggest_next_events"]) {
      const call = registerToolSpy.mock.calls.find((toolCall) => toolCall[0] === name);
      expect(call?.[1]).toMatchObject({
        outputSchema: expect.any(Object),
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
      });
    }
  });

  it("exposes signup-like event candidates through list_events without fuzzy event selection", async () => {
    listEventsSpy = vi.fn().mockResolvedValue({
      status: "ok",
      summary: "3 event types found.",
      period: "7d",
      events: [
        { eventName: "signup_completed", count: 4 },
        { eventName: "signup_started", count: 2 },
      ],
      dashboardUrls,
      provenance: { projectName: "Example App", generatedAt: "now", queryBasis: { tool: "list_events" } },
    });
    getEventSchemaSpy = vi.fn().mockResolvedValue({
      status: "invalid_event_name",
      summary: "Exact event name was not found.",
      availableEvents: ["signup_completed", "signup_started"],
      dashboardUrls,
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const listResult = await analyticsToolCallback(registerToolSpy, "list_events")(
      { projectId: "proj_123", period: "7d" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );
    expect(listResult).toMatchObject({
      structuredContent: {
        status: "ok",
        events: [{ eventName: "signup_completed" }, { eventName: "signup_started" }],
      },
    });

    const schemaResult = await analyticsToolCallback(registerToolSpy, "get_event_schema")(
      { projectId: "proj_123", period: "7d", eventName: "signup" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );
    expect(schemaResult).toMatchObject({
      isError: true,
      structuredContent: {
        status: "invalid_event_name",
        availableEvents: ["signup_completed", "signup_started"],
      },
    });
    expect(getEventSchemaSpy).toHaveBeenCalledWith({
      userId: "user_1",
      projectId: "proj_123",
      period: "7d",
      eventName: "signup",
    });
  });

  it("maps path and recommendation MCP statuses with limitations and recommendations", async () => {
    const pathStatuses = [
      { status: "ok", paths: [{ sequence: ["/pricing"], targetEventCount: 5, percentage: 100 }] },
      { status: "partial_data", limitations: ["Fewer than 5 target events were observed."] },
      {
        status: "insufficient_data",
        limitations: ["Target event was not observed."],
        suggestedEvents: [{ eventName: "signup_completed", reason: "Needed.", priority: "high" }],
      },
      { status: "no_events", paths: [] },
    ] as const;
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    for (const pathResult of pathStatuses) {
      getPathsToEventSpy = vi.fn().mockResolvedValue({
        summary: `${pathResult.status} path summary`,
        projectId: "proj_123",
        targetEvent: "signup_completed",
        period: "7d",
        coverage: { targetEventTotal: 5, targetEventsWithPriorPath: 5 },
        dashboardUrls,
        ...pathResult,
      });

      const result = await analyticsToolCallback(registerToolSpy, "get_paths_to_event")(
        { projectId: "proj_123", period: "7d", targetEvent: "signup_completed" },
        { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({ status: pathResult.status });
    }

    suggestNextEventsSpy = vi.fn().mockResolvedValue({
      status: "partial_data",
      summary: "Missing signup completion event.",
      projectId: "proj_123",
      period: "7d",
      evidence: ["Signup pages are receiving traffic."],
      limitations: ["No signup completion event has been observed."],
      recommendations: [{ eventName: "signup_completed", reason: "Needed.", priority: "high" }],
      createsPendingTasks: false,
      dashboardUrls,
    });

    const recommendationResult = await analyticsToolCallback(registerToolSpy, "suggest_next_events")(
      { projectId: "proj_123", period: "7d", goal: "Understand signup" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );
    expect(recommendationResult).toMatchObject({
      structuredContent: {
        status: "partial_data",
        recommendations: [{ eventName: "signup_completed" }],
        createsPendingTasks: false,
      },
    });
  });
});

describe("MCP analytics prompt-shaped sequences", () => {
  const auth = { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } };
  const dataWindow = {
    period: "7d",
    start: "2026-05-02T00:00:00.000Z",
    end: "2026-05-09T00:00:00.000Z",
    dataThrough: "2026-05-09T00:00:00.000Z",
  };

  it("supports a usage-summary prompt with project resolution, exact window, and dashboard URL", async () => {
    resolveOwnedMcpProjectForRepoContextSpy = vi.fn().mockResolvedValue({
      status: "ok",
      project: ownedProject,
      match: { strategy: "fingerprint", confidence: "exact" },
    });
    getProjectOverviewSpy = vi.fn().mockResolvedValue({
      status: "ok",
      summary: "Example App had 120 page views and 42 sessions in the last 7 days.",
      period: "7d",
      dataWindow,
      pageViews: { total: 120, change: 12, timeSeries: [] },
      sessions: { total: 42, change: 4 },
      topPages: [{ path: "/pricing", views: 36 }],
      topReferrers: [{ referrer: "google.com", sessions: 10 }],
      provenance: {
        projectName: "Example App",
        generatedAt: "2026-05-09T00:00:00.000Z",
        dataWindow,
        queryBasis: { tool: "get_project_overview", semantics: "dashboard_overview" },
      },
      dashboardUrls,
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const resolved = await analyticsToolCallback(registerToolSpy, "resolve_project")(
      { repo: { name: "example-app", gitRemote: "git@github.com:acme/example-app.git", appRoot: "." } },
      auth,
    );
    const overview = await analyticsToolCallback(registerToolSpy, "get_project_overview")(
      { projectId: "proj_123", period: "7d" },
      auth,
    );

    expect(resolved).toMatchObject({
      structuredContent: {
        status: "ok",
        project: { id: "proj_123", dashboardUrls },
        match: { confidence: "exact" },
      },
    });
    expect(overview).toMatchObject({
      content: [{ type: "text", text: "Example App had 120 page views and 42 sessions in the last 7 days." }],
      structuredContent: {
        status: "ok",
        dataWindow,
        pageViews: { total: 120 },
        dashboardUrls: { overview: dashboardUrls.overview },
      },
    });
  });

  it("supports a pages-before-signup prompt when an exact target event exists", async () => {
    listEventsSpy = vi.fn().mockResolvedValue({
      status: "ok",
      summary: "Observed signup and page events.",
      period: "7d",
      dataWindow,
      events: [
        { eventName: "signup_completed", count: 14 },
        { eventName: "page_view", count: 120 },
      ],
      dashboardUrls,
      provenance: { projectName: "Example App", generatedAt: "now", dataWindow, queryBasis: { tool: "list_events" } },
    });
    getPathsToEventSpy = vi.fn().mockResolvedValue({
      status: "ok",
      summary: "Most signup completions were preceded by /pricing or /docs.",
      projectId: "proj_123",
      period: "7d",
      targetEvent: "signup_completed",
      dataWindow,
      paths: [
        { sequence: ["/pricing", "/signup"], targetEventCount: 9, percentage: 64 },
        { sequence: ["/docs", "/signup"], targetEventCount: 3, percentage: 21 },
      ],
      coverage: { targetEventTotal: 14, targetEventsWithPriorPath: 12 },
      dashboardUrls,
      provenance: {
        projectName: "Example App",
        generatedAt: "now",
        dataWindow,
        queryBasis: { tool: "get_paths_to_event", semantics: "session_paths_to_event" },
      },
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const events = await analyticsToolCallback(registerToolSpy, "list_events")(
      { projectId: "proj_123", period: "7d" },
      auth,
    );
    const paths = await analyticsToolCallback(registerToolSpy, "get_paths_to_event")(
      { projectId: "proj_123", period: "7d", targetEvent: "signup_completed", maxSteps: 5 },
      auth,
    );

    expect(events).toMatchObject({
      structuredContent: {
        status: "ok",
        events: [{ eventName: "signup_completed" }, { eventName: "page_view" }],
        dashboardUrls,
      },
    });
    expect(paths).toMatchObject({
      structuredContent: {
        status: "ok",
        targetEvent: "signup_completed",
        dataWindow,
        paths: expect.arrayContaining([
          expect.objectContaining({ sequence: ["/pricing", "/signup"], targetEventCount: 9 }),
        ]),
        dashboardUrls: { overview: dashboardUrls.overview },
      },
    });
    expect(getPathsToEventSpy).toHaveBeenCalledWith({
      userId: "user_1",
      projectId: "proj_123",
      period: "7d",
      targetEvent: "signup_completed",
      maxSteps: 5,
      limit: 10,
    });
  });

  it("supports a pages-before-signup prompt without a target event by returning limitations and suggestions", async () => {
    listEventsSpy = vi.fn().mockResolvedValue({
      status: "ok",
      summary: "Only generic traffic events were observed.",
      period: "7d",
      dataWindow,
      events: [
        { eventName: "page_view", count: 120 },
        { eventName: "cta_clicked", count: 18 },
      ],
      dashboardUrls,
      provenance: { projectName: "Example App", generatedAt: "now", dataWindow, queryBasis: { tool: "list_events" } },
    });
    suggestNextEventsSpy = vi.fn().mockResolvedValue({
      status: "partial_data",
      summary: "Signup paths can only be answered partially because no signup completion event exists.",
      projectId: "proj_123",
      period: "7d",
      dataWindow,
      evidence: ["Pricing and docs pages have traffic.", "CTA clicks are observed."],
      limitations: ["No signup_started or signup_completed event has been observed."],
      recommendations: [
        { eventName: "signup_started", reason: "Marks entry into the funnel.", priority: "high" },
        { eventName: "signup_completed", reason: "Makes pages-before-signup answerable.", priority: "high" },
      ],
      createsPendingTasks: false,
      dashboardUrls,
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const events = await analyticsToolCallback(registerToolSpy, "list_events")(
      { projectId: "proj_123", period: "7d" },
      auth,
    );
    const suggestions = await analyticsToolCallback(registerToolSpy, "suggest_next_events")(
      { projectId: "proj_123", period: "7d", goal: "Which pages are users visiting before signup?" },
      auth,
    );

    expect(events.structuredContent).toMatchObject({
      status: "ok",
      events: [{ eventName: "page_view" }, { eventName: "cta_clicked" }],
    });
    expect(JSON.stringify(events.structuredContent)).not.toContain("signup_completed");
    expect(suggestions).toMatchObject({
      structuredContent: {
        status: "partial_data",
        dataWindow,
        limitations: ["No signup_started or signup_completed event has been observed."],
        recommendations: [{ eventName: "signup_started" }, { eventName: "signup_completed" }],
        createsPendingTasks: false,
        dashboardUrls: { overview: dashboardUrls.overview },
      },
    });
  });

  it("supports a next-events prompt with evidence and no pending task creation", async () => {
    suggestNextEventsSpy = vi.fn().mockResolvedValue({
      status: "partial_data",
      summary: "Add funnel and activation events next.",
      projectId: "proj_123",
      period: "30d",
      dataWindow: { ...dataWindow, period: "30d", start: "2026-04-09T00:00:00.000Z" },
      evidence: ["Top pages include /pricing and /dashboard.", "Only page_view and cta_clicked are observed."],
      limitations: ["The current events do not distinguish signup from activation."],
      recommendations: [
        { eventName: "signup_completed", reason: "Needed for acquisition funnel analysis.", priority: "high" },
        { eventName: "workspace_created", reason: "Needed for activation analysis.", priority: "medium" },
      ],
      createsPendingTasks: false,
      dashboardUrls,
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const result = await analyticsToolCallback(registerToolSpy, "suggest_next_events")(
      { projectId: "proj_123", period: "30d", goal: "Look at usage and suggest events we should add next." },
      auth,
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "partial_data",
        evidence: ["Top pages include /pricing and /dashboard.", "Only page_view and cta_clicked are observed."],
        limitations: ["The current events do not distinguish signup from activation."],
        recommendations: [{ eventName: "signup_completed" }, { eventName: "workspace_created" }],
        createsPendingTasks: false,
        dashboardUrls,
      },
    });
  });

  it("supports multiple project selection by exposing candidates instead of querying analytics", async () => {
    resolveOwnedMcpProjectForRepoContextSpy = vi.fn().mockResolvedValue({
      status: "multiple_matches",
      candidates: [
        { ...ownedProject, id: "proj_123", displayName: "Example App" },
        { ...ownedProject, id: "proj_456", displayName: "Example App Staging" },
      ],
    });
    const registerToolSpy = vi.fn();
    registerAnalyticsTools({ registerTool: registerToolSpy } as never);

    const result = await analyticsToolCallback(registerToolSpy, "resolve_project")(
      { repo: { name: "example-app", appRoot: "." } },
      auth,
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "multiple_matches",
        candidates: [
          { id: "proj_123", name: "Example App", dashboardUrls },
          { id: "proj_456", name: "Example App Staging", dashboardUrls },
        ],
      },
    });
    expect(getProjectOverviewSpy).not.toHaveBeenCalled();
    expect(getPathsToEventSpy).not.toHaveBeenCalled();
    expect(suggestNextEventsSpy).not.toHaveBeenCalled();
  });
});
