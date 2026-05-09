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
  registerAnalyticsTools,
} from "../lib/mcp/tools/analytics";
import { userIdFromAuth } from "../lib/mcp/tools/auth";

let listOwnedAnalyticsProjectsSpy: ReturnType<typeof vi.fn> | undefined;
let resolveOwnedMcpProjectForRepoContextSpy: ReturnType<typeof vi.fn> | undefined;
let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;
let getProjectOverviewSpy: ReturnType<typeof vi.fn> | undefined;
let getLiveEventsSpy: ReturnType<typeof vi.fn> | undefined;
let getSessionsSummarySpy: ReturnType<typeof vi.fn> | undefined;
let getTopPagesSpy: ReturnType<typeof vi.fn> | undefined;
let getTopReferrersSpy: ReturnType<typeof vi.fn> | undefined;

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
    expect(unauthorizedAnalyticsResult()).toEqual({
      status: "unauthorized",
      summary: "Authentication is required before querying Tally analytics.",
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

    expect(registerToolSpy.mock.calls.map((call) => call[0])).toEqual([
      "list_projects",
      "resolve_project",
      "get_project_overview",
      "get_live_events",
      "get_sessions_summary",
      "get_top_pages",
      "get_top_referrers",
    ]);

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
      { authInfo: { extra: { userId: "user_1" } } },
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
      { authInfo: { extra: { userId: "user_1" } } },
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
      { authInfo: { extra: { userId: "user_1" } } },
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
      { authInfo: { extra: { userId: "user_1" } } },
    );

    expect(result).toMatchObject({
      isError: true,
      structuredContent: { status: "project_not_found" },
    });
    expect(getProjectOverviewSpy).not.toHaveBeenCalled();
  });
});
