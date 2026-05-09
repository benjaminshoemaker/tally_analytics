import { describe, expect, it } from "vitest";

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
} from "../lib/mcp/tools/analytics";
import { userIdFromAuth } from "../lib/mcp/tools/auth";

function expectValidationStatus(result: unknown, status: string): void {
  expect(result).toMatchObject({ ok: false, error: { status } });
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
