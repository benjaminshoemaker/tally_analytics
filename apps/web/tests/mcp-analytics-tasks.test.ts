import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerAnalyticsTaskTools } from "../lib/mcp/tools/analytics-tasks";
import type { AnalyticsTaskRecord, TransitionAnalyticsTaskResult } from "../lib/analytics/tasks/types";
import type { OwnedAnalyticsProject, ResolveOwnedMcpProjectResult } from "../lib/db/queries/projects";

let getOwnedAnalyticsProjectSpy: ReturnType<typeof vi.fn> | undefined;
let resolveOwnedMcpProjectForRepoContextSpy: ReturnType<typeof vi.fn> | undefined;
let listOwnedAnalyticsTasksForProjectSpy: ReturnType<typeof vi.fn> | undefined;
let findOwnedAnalyticsTaskByIdSpy: ReturnType<typeof vi.fn> | undefined;
let transitionAnalyticsTaskSpy: ReturnType<typeof vi.fn> | undefined;
let refreshAnalyticsTaskListVerificationSpy: ReturnType<typeof vi.fn> | undefined;
let refreshAnalyticsTaskVerificationSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", async () => {
  return {
    buildMcpProjectFingerprintInput: (params: {
      repoName: string;
      packageName?: string | null;
      gitRemote?: string | null;
      appRoot: string;
    }) => ({
      source: "mcp_codex",
      identity: params.gitRemote ? "remote" : "repo_name",
      repoName: params.repoName,
      packageName: params.packageName ?? params.repoName,
      gitRemote: params.gitRemote ?? null,
      appRoot: params.appRoot,
    }),
    mcpFingerprint: (input: unknown) => JSON.stringify(input),
    normalizeGitRemote: (gitRemote: string | null | undefined) => {
      if (!gitRemote) return null;
      return gitRemote.toLowerCase().replace("git@", "").replace("https://", "").replace(".git", "");
    },
    getOwnedAnalyticsProject: (...args: unknown[]) => {
      if (!getOwnedAnalyticsProjectSpy) throw new Error("getOwnedAnalyticsProjectSpy not initialized");
      return getOwnedAnalyticsProjectSpy(...args);
    },
    resolveOwnedMcpProjectForRepoContext: (...args: unknown[]) => {
      if (!resolveOwnedMcpProjectForRepoContextSpy) {
        throw new Error("resolveOwnedMcpProjectForRepoContextSpy not initialized");
      }
      return resolveOwnedMcpProjectForRepoContextSpy(...args);
    },
  };
});

vi.mock("../lib/analytics/tasks/queries", () => ({
  listOwnedAnalyticsTasksForProject: (...args: unknown[]) => {
    if (!listOwnedAnalyticsTasksForProjectSpy) {
      throw new Error("listOwnedAnalyticsTasksForProjectSpy not initialized");
    }
    return listOwnedAnalyticsTasksForProjectSpy(...args);
  },
  findOwnedAnalyticsTaskById: (...args: unknown[]) => {
    if (!findOwnedAnalyticsTaskByIdSpy) throw new Error("findOwnedAnalyticsTaskByIdSpy not initialized");
    return findOwnedAnalyticsTaskByIdSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/transitions", () => ({
  transitionAnalyticsTask: (...args: unknown[]) => {
    if (!transitionAnalyticsTaskSpy) throw new Error("transitionAnalyticsTaskSpy not initialized");
    return transitionAnalyticsTaskSpy(...args);
  },
}));

vi.mock("../lib/analytics/tasks/verification", () => ({
  refreshAnalyticsTaskListVerification: (...args: unknown[]) => {
    if (!refreshAnalyticsTaskListVerificationSpy) {
      throw new Error("refreshAnalyticsTaskListVerificationSpy not initialized");
    }
    return refreshAnalyticsTaskListVerificationSpy(...args);
  },
  refreshAnalyticsTaskVerification: (...args: unknown[]) => {
    if (!refreshAnalyticsTaskVerificationSpy) {
      throw new Error("refreshAnalyticsTaskVerificationSpy not initialized");
    }
    return refreshAnalyticsTaskVerificationSpy(...args);
  },
}));

function makeOwnedProject(overrides: Partial<OwnedAnalyticsProject> = {}): OwnedAnalyticsProject {
  return {
    id: "proj_123",
    displayName: "Example App",
    source: "mcp_codex",
    status: "active",
    lastEventAt: null,
    mcpRepoName: "example/repo",
    mcpAppRoot: ".",
    mcpPackageManager: "pnpm",
    dashboardUrls: {
      project: "https://usetally.xyz/projects/proj_123",
      overview: "https://usetally.xyz/projects/proj_123/overview",
      live: "https://usetally.xyz/projects/proj_123/live",
      sessions: "https://usetally.xyz/projects/proj_123/sessions",
    },
    ...overrides,
  };
}

function makeTask(overrides: Partial<AnalyticsTaskRecord> = {}): AnalyticsTaskRecord {
  return {
    id: "task_123",
    projectId: "proj_123",
    userId: "user_123",
    status: "pending",
    taskType: "track_click",
    title: "Track upgrade CTA clicks",
    originalQuestion: "How many people clicked upgrade?",
    answerKind: "cannot_answer_yet",
    answerSummary: "Need additional tracking.",
    analyticsGap: "Upgrade CTA click event missing.",
    eventName: "upgrade_cta_clicked",
    triggerDescription: "When user clicks the upgrade call-to-action.",
    propertiesSchema: { required: ["surface"] },
    targetSurface: "/pricing",
    implementationGuidance: "Track in CTA click handler.",
    verificationCriteria: { productionEvent: "upgrade_cta_clicked" },
    verificationSource: "production_event",
    duplicateFingerprint: null,
    duplicateOfTaskId: null,
    localVerification: null,
    implementationFingerprint: null,
    lastError: null,
    confirmedAt: new Date("2026-05-10T00:00:00.000Z"),
    claimedAt: null,
    implementedAt: null,
    verifiedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: new Date("2026-05-10T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    ...overrides,
  };
}

function makeTransitionResult(task: AnalyticsTaskRecord, status: TransitionAnalyticsTaskResult["status"] = "transitioned"): TransitionAnalyticsTaskResult {
  return {
    status,
    task,
    statusEvent: null,
  };
}

function analyticsTaskToolCallback(registerToolSpy: ReturnType<typeof vi.fn>, name: string) {
  const call = registerToolSpy.mock.calls.find((toolCall) => toolCall[0] === name);
  if (!call) throw new Error(`Missing registered tool: ${name}`);
  return call[2] as (input: unknown, extra: { authInfo?: unknown }) => Promise<Record<string, unknown>>;
}

beforeEach(() => {
  getOwnedAnalyticsProjectSpy = vi.fn().mockResolvedValue(makeOwnedProject());
  resolveOwnedMcpProjectForRepoContextSpy = vi
    .fn<(...args: unknown[]) => Promise<ResolveOwnedMcpProjectResult>>()
    .mockResolvedValue({ status: "no_match" });
  listOwnedAnalyticsTasksForProjectSpy = vi.fn().mockResolvedValue([]);
  findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(null);
  transitionAnalyticsTaskSpy = vi.fn();
  refreshAnalyticsTaskListVerificationSpy = vi.fn(async ({ tasks }: { tasks: AnalyticsTaskRecord[] }) => tasks);
  refreshAnalyticsTaskVerificationSpy = vi.fn(async ({ task }: { task: AnalyticsTaskRecord }) => ({
    status: "unchanged",
    task,
  }));
});

describe("MCP analytics task tools", () => {
  it("registers pending-list, context, and status-report tools", () => {
    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);

    expect(registerToolSpy.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([
      "list_pending_analytics_tasks",
      "get_analytics_task_context",
      "report_analytics_task_status",
    ]));

    for (const [, options] of registerToolSpy.mock.calls) {
      expect(options).toMatchObject({
        title: expect.any(String),
        description: expect.any(String),
        inputSchema: expect.any(Object),
        outputSchema: expect.any(Object),
      });
    }
  });

  it("lists pending and in-progress tasks for an explicitly selected project", async () => {
    const pending = makeTask({ id: "task_pending", status: "pending" });
    const inProgress = makeTask({ id: "task_in_progress", status: "in_progress" });
    const verified = makeTask({ id: "task_verified", status: "verified" });
    listOwnedAnalyticsTasksForProjectSpy = vi.fn().mockResolvedValue([pending, inProgress, verified]);
    refreshAnalyticsTaskListVerificationSpy = vi.fn().mockResolvedValue([pending, inProgress, verified]);

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "list_pending_analytics_tasks");

    const result = await callback(
      { projectId: "proj_123" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "ready",
        tasks: [
          { id: "task_pending", status: "pending" },
          { id: "task_in_progress", status: "in_progress" },
        ],
      },
    });
    expect(JSON.stringify(result.structuredContent)).not.toContain("user_1");
    expect(listOwnedAnalyticsTasksForProjectSpy).toHaveBeenCalledWith({
      userId: "user_1",
      projectId: "proj_123",
    });
  });

  it("returns no_tasks when no pending or in-progress work exists", async () => {
    listOwnedAnalyticsTasksForProjectSpy = vi.fn().mockResolvedValue([makeTask({ status: "verified" })]);
    refreshAnalyticsTaskListVerificationSpy = vi.fn().mockResolvedValue([makeTask({ status: "verified" })]);

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "list_pending_analytics_tasks");
    const result = await callback(
      { projectId: "proj_123" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "no_tasks",
      },
    });
  });

  it("returns project-selection candidates capped at 10 for ambiguous repo resolution", async () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      makeOwnedProject({
        id: `proj_${index + 1}`,
        displayName: `repo-${index + 1}`,
        dashboardUrls: {
          project: `https://usetally.xyz/projects/proj_${index + 1}`,
          overview: `https://usetally.xyz/projects/proj_${index + 1}/overview`,
          live: `https://usetally.xyz/projects/proj_${index + 1}/live`,
          sessions: `https://usetally.xyz/projects/proj_${index + 1}/sessions`,
        },
      }),
    );
    resolveOwnedMcpProjectForRepoContextSpy = vi.fn().mockResolvedValue({
      status: "multiple_matches",
      candidates,
    });

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "list_pending_analytics_tasks");
    const result = await callback(
      { repo: { name: "repo", appRoot: "." } },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        status: "needs_project_selection",
      },
    });
    expect(((result.structuredContent as { candidates?: unknown[] }).candidates ?? []).length).toBe(10);
    expect(listOwnedAnalyticsTasksForProjectSpy).not.toHaveBeenCalled();
  });

  it("returns no_matching_project when repo context does not resolve", async () => {
    resolveOwnedMcpProjectForRepoContextSpy = vi.fn().mockResolvedValue({ status: "no_match" });

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "list_pending_analytics_tasks");
    const result = await callback(
      { repo: { name: "repo", appRoot: "." } },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        status: "no_matching_project",
      },
    });
  });

  it("returns unauthorized for missing MCP auth context", async () => {
    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "list_pending_analytics_tasks");
    const result = await callback({}, {});

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        status: "unauthorized",
      },
    });
  });

  it("returns full task context with redacted secrets", async () => {
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(
      makeTask({
        answerSummary: "Use Bearer top-secret-token to inspect oauthToken fields.",
        implementationGuidance: "TINYBIRD_TOKEN=tb_secret should never appear in tool output.",
        localVerification: {
          changedFiles: ["apps/web/src/track.ts"],
          oauthToken: "very-secret",
          note: "visitor_id=abc123",
        },
        verificationCriteria: {
          productionEvent: "upgrade_cta_clicked",
          user_id: "raw-user-id",
        },
      }),
    );

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "get_analytics_task_context");
    const result = await callback(
      { taskId: "task_123", projectId: "proj_123" },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "ready",
        context: {
          taskId: "task_123",
          currentAnswer: {
            kind: "cannot_answer_yet",
          },
          eventContract: {
            eventName: "upgrade_cta_clicked",
          },
        },
      },
    });
    const serialized = JSON.stringify(result.structuredContent);
    expect(serialized).not.toContain("top-secret-token");
    expect(serialized).not.toContain("oauthToken");
    expect(serialized).not.toContain("TINYBIRD_TOKEN");
    expect(serialized).not.toContain("visitor_id=abc123");
    expect(serialized).not.toContain("raw-user-id");
  });

  it("rejects install-only tokens for list, context, and status-report task tools", async () => {
    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const installOnlyAuth = { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:install"] } };

    for (const name of [
      "list_pending_analytics_tasks",
      "get_analytics_task_context",
      "report_analytics_task_status",
    ]) {
      const callback = analyticsTaskToolCallback(registerToolSpy, name);
      const payload = name === "get_analytics_task_context" || name === "report_analytics_task_status"
        ? { taskId: "task_123", status: "in_progress" }
        : {};
      const result = await callback(payload, installOnlyAuth);
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          status: "insufficient_scope",
        },
      });
    }
  });

  it("reports in_progress status updates through transition service", async () => {
    const task = makeTask({ status: "pending" });
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(task);
    transitionAnalyticsTaskSpy = vi.fn().mockResolvedValue(
      makeTransitionResult(makeTask({ ...task, status: "in_progress" })),
    );

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "report_analytics_task_status");
    const result = await callback(
      {
        taskId: "task_123",
        status: "in_progress",
        projectId: "proj_123",
        changedFiles: ["apps/web/src/track.ts"],
      },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(transitionAnalyticsTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task_123",
        toStatus: "in_progress",
        actorType: "agent",
        changedFiles: ["apps/web/src/track.ts"],
      }),
    );
    expect(result).toMatchObject({
      structuredContent: {
        status: "ready",
        task: {
          status: "in_progress",
        },
      },
    });
  });

  it("reports implemented_locally and surfaces verified when production evidence already exists", async () => {
    const implementedTask = makeTask({
      status: "implemented_locally",
      implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    });
    const verifiedTask = makeTask({
      ...implementedTask,
      status: "verified",
      verifiedAt: new Date("2026-05-12T10:05:00.000Z"),
    });
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "in_progress" }));
    transitionAnalyticsTaskSpy = vi.fn().mockResolvedValue(makeTransitionResult(implementedTask));
    refreshAnalyticsTaskVerificationSpy = vi.fn().mockResolvedValue({
      status: "verified",
      task: verifiedTask,
    });

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "report_analytics_task_status");
    const result = await callback(
      {
        taskId: "task_123",
        status: "implemented_locally",
        projectId: "proj_123",
        implementationFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(refreshAnalyticsTaskVerificationSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      structuredContent: {
        status: "ready",
        verification: "verified",
        task: {
          status: "verified",
        },
      },
    });
  });

  it("reports implemented_locally and surfaces awaiting_deploy when production evidence is not ready", async () => {
    const implementedTask = makeTask({
      status: "implemented_locally",
      implementedAt: new Date("2026-05-12T10:00:00.000Z"),
    });
    const awaitingTask = makeTask({
      ...implementedTask,
      status: "awaiting_deploy",
      lastError: "production_event_not_found",
    });
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(makeTask({ status: "in_progress" }));
    transitionAnalyticsTaskSpy = vi.fn().mockResolvedValue(makeTransitionResult(implementedTask));
    refreshAnalyticsTaskVerificationSpy = vi.fn().mockResolvedValue({
      status: "awaiting_deploy",
      task: awaitingTask,
    });

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "report_analytics_task_status");
    const result = await callback(
      {
        taskId: "task_123",
        status: "implemented_locally",
        projectId: "proj_123",
        localEventEvidence: [{ eventName: "upgrade_cta_clicked", properties: { placement: "hero" } }],
      },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      structuredContent: {
        status: "ready",
        verification: "awaiting_deploy",
        task: {
          status: "awaiting_deploy",
        },
      },
    });
  });

  it("returns task_not_found for foreign task IDs", async () => {
    findOwnedAnalyticsTaskByIdSpy = vi.fn().mockResolvedValue(null);
    transitionAnalyticsTaskSpy = vi.fn();

    const registerToolSpy = vi.fn();
    registerAnalyticsTaskTools({ registerTool: registerToolSpy } as never);
    const callback = analyticsTaskToolCallback(registerToolSpy, "report_analytics_task_status");
    const result = await callback(
      {
        taskId: "task_foreign",
        status: "failed",
        projectId: "proj_123",
        errorSummary: "Build failed.",
      },
      { authInfo: { extra: { userId: "user_1" }, scopes: ["mcp:tasks"] } },
    );

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        status: "task_not_found",
      },
    });
    expect(transitionAnalyticsTaskSpy).not.toHaveBeenCalled();
  });
});
