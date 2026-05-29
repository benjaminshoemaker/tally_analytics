import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let deleteSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
    delete: (...args: unknown[]) => {
      if (!deleteSpy) throw new Error("deleteSpy not initialized");
      return deleteSpy(...args);
    },
  },
}));

describe("project queries", () => {
  it("upsertProjectsForRepos does nothing when repositories is empty", async () => {
    vi.resetModules();
    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    selectSpy = vi.fn();
    deleteSpy = vi.fn();

    const { upsertProjectsForRepos } = await import("../lib/db/queries/projects");
    await expect(upsertProjectsForRepos({ userId: "u1", installationId: 1n, repositories: [] })).resolves.toBeUndefined();
  });

  it("deleteProjectsByInstallationAndRepoIds does nothing when repoIds is empty", async () => {
    vi.resetModules();
    insertSpy = vi.fn();
    selectSpy = vi.fn();
    deleteSpy = vi.fn(() => {
      throw new Error("db.delete called unexpectedly");
    });

    const { deleteProjectsByInstallationAndRepoIds } = await import("../lib/db/queries/projects");
    await expect(deleteProjectsByInstallationAndRepoIds({ installationId: 1n, repoIds: [] })).resolves.toBeUndefined();
  });

  it("normalizes GitHub remote URLs and preserves parseable non-GitHub paths", async () => {
    vi.resetModules();

    const { normalizeGitRemote } = await import("../lib/db/queries/projects");

    expect(normalizeGitRemote("git@github.com:Owner/Repo.git")).toBe("github.com/owner/repo");
    expect(normalizeGitRemote("https://github.com/Owner/Repo.git")).toBe("github.com/owner/repo");
    expect(normalizeGitRemote("ssh://git@gitlab.example.com/Team/Repo.git")).toBe("gitlab.example.com/Team/Repo");
    expect(normalizeGitRemote("not a url")).toBeNull();
    expect(normalizeGitRemote(null)).toBeNull();
  });

  it("derives readable MCP display names from remote repo names and app roots", async () => {
    vi.resetModules();

    const { mcpProjectDisplayName } = await import("../lib/db/queries/projects");

    expect(
      mcpProjectDisplayName({
        repoName: "web",
        normalizedGitRemote: "github.com/benjaminshoemaker/tally_analytics",
        appRoot: "apps/web",
      }),
    ).toBe("tally_analytics / apps/web");
    expect(mcpProjectDisplayName({ repoName: "web", normalizedGitRemote: null, appRoot: "apps/web" })).toBe(
      "web / apps/web",
    );
    expect(
      mcpProjectDisplayName({
        repoName: "single-app",
        normalizedGitRemote: "github.com/acme/single-app",
        appRoot: ".",
      }),
    ).toBe("single-app");
  });

  it("builds MCP fingerprints from the matching fields only", async () => {
    vi.resetModules();

    const { buildMcpProjectFingerprintInput, mcpFingerprint } = await import("../lib/db/queries/projects");

    const first = mcpFingerprint(
      buildMcpProjectFingerprintInput({
        repoName: "repo",
        packageName: "pkg",
        gitRemote: "git@github.com:Owner/Repo.git",
        appRoot: "apps/web",
      }),
    );
    const second = mcpFingerprint(
      buildMcpProjectFingerprintInput({
        repoName: "renamed",
        packageName: "other",
        gitRemote: "https://github.com/owner/repo.git",
        appRoot: "apps/web",
      }),
    );
    const third = mcpFingerprint(
      buildMcpProjectFingerprintInput({
        repoName: "repo",
        packageName: "pkg",
        gitRemote: null,
        appRoot: "apps/web",
      }),
    );

    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  it("creates MCP projects with active status and nullable GitHub fields", async () => {
    vi.resetModules();
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://usetally.xyz";

    const whereSpy = vi.fn().mockResolvedValueOnce([]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));

    const returningSpy = vi.fn().mockResolvedValue([{ id: "proj_new" }]);
    const onConflictDoNothingSpy = vi.fn(() => ({ returning: returningSpy }));
    const valuesSpy = vi.fn(() => ({ onConflictDoNothing: onConflictDoNothingSpy }));
    insertSpy = vi.fn(() => ({ values: valuesSpy }));
    deleteSpy = vi.fn();

    const { createOrReuseMcpProject } = await import("../lib/db/queries/projects");
    const result = await createOrReuseMcpProject({
      userId: "u1",
      repoName: "repo",
      packageName: "pkg",
      gitRemote: "git@github.com:Owner/Repo.git",
      appRoot: "apps/web",
      framework: "nextjs-app-router",
      packageManager: "pnpm",
    });

    expect(result).toMatchObject({
      status: "ready",
      projectId: "proj_new",
      dashboardUrl: "https://usetally.xyz/projects/proj_new",
      created: true,
    });
    const insertedValue = (valuesSpy.mock.calls as unknown[][])[0]?.[0] as Record<string, unknown>;
    expect(insertedValue).toEqual(
      expect.objectContaining({
        userId: "u1",
        source: "mcp_codex",
        displayName: "repo / apps/web",
        status: "active",
        mcpNormalizedGitRemote: "github.com/owner/repo",
        mcpRepoName: "repo",
        mcpAppRoot: "apps/web",
        mcpFramework: "nextjs-app-router",
        mcpPackageManager: "pnpm",
      }),
    );
    expect("githubRepoId" in insertedValue).toBe(false);
    expect("githubRepoFullName" in insertedValue).toBe(false);
    expect("githubInstallationId" in insertedValue).toBe(false);

    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  it("reuses exactly one MCP project match without inserting", async () => {
    vi.resetModules();

    const whereSpy = vi.fn().mockResolvedValue([{ id: "proj_existing" }]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));
    insertSpy = vi.fn(() => {
      throw new Error("db.insert called unexpectedly");
    });
    deleteSpy = vi.fn();

    const { createOrReuseMcpProject } = await import("../lib/db/queries/projects");
    const result = await createOrReuseMcpProject({
      userId: "u1",
      repoName: "repo",
      packageName: "pkg",
      gitRemote: "git@github.com:Owner/Repo.git",
      appRoot: "apps/web",
      framework: "nextjs-app-router",
      packageManager: "pnpm",
    });

    expect(result).toMatchObject({ status: "ready", projectId: "proj_existing", created: false });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("returns unsupported when more than one MCP project matches", async () => {
    vi.resetModules();

    const whereSpy = vi.fn().mockResolvedValue([{ id: "proj_1" }, { id: "proj_2" }]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));
    insertSpy = vi.fn();
    deleteSpy = vi.fn();

    const { createOrReuseMcpProject } = await import("../lib/db/queries/projects");
    const result = await createOrReuseMcpProject({
      userId: "u1",
      repoName: "repo",
      packageName: "pkg",
      gitRemote: null,
      appRoot: "apps/web",
      framework: "nextjs-app-router",
      packageManager: "pnpm",
    });

    expect(result).toMatchObject({ status: "unsupported", reason: "multiple_matching_projects" });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("reselects an existing MCP project after a concurrent insert conflict", async () => {
    vi.resetModules();

    const whereSpy = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "proj_existing" }]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));

    const returningSpy = vi.fn().mockResolvedValue([]);
    const onConflictDoNothingSpy = vi.fn(() => ({ returning: returningSpy }));
    const valuesSpy = vi.fn(() => ({ onConflictDoNothing: onConflictDoNothingSpy }));
    insertSpy = vi.fn(() => ({ values: valuesSpy }));
    deleteSpy = vi.fn();

    const { createOrReuseMcpProject } = await import("../lib/db/queries/projects");
    const result = await createOrReuseMcpProject({
      userId: "u1",
      repoName: "repo",
      packageName: "pkg",
      gitRemote: null,
      appRoot: "apps/web",
      framework: "nextjs-pages-router",
      packageManager: "npm",
    });

    expect(result).toMatchObject({ status: "ready", projectId: "proj_existing", created: false });
    expect(whereSpy).toHaveBeenCalledTimes(2);
  });
});
