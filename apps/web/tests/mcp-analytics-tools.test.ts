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
