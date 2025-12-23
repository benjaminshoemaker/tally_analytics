import { describe, expect, it, vi } from "vitest";

let setProjectStatusByRepoIdSpy: ReturnType<typeof vi.fn> | undefined;
let updateProjectDetectionByRepoIdSpy: ReturnType<typeof vi.fn> | undefined;
let getInstallationOctokitSpy: ReturnType<typeof vi.fn> | undefined;
let detectFrameworkSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", () => ({
  setProjectStatusByRepoId: (...args: unknown[]) => {
    if (!setProjectStatusByRepoIdSpy) throw new Error("setProjectStatusByRepoIdSpy not initialized");
    return setProjectStatusByRepoIdSpy(...args);
  },
  updateProjectDetectionByRepoId: (...args: unknown[]) => {
    if (!updateProjectDetectionByRepoIdSpy) throw new Error("updateProjectDetectionByRepoIdSpy not initialized");
    return updateProjectDetectionByRepoIdSpy(...args);
  },
}));

vi.mock("../lib/github/app", () => ({
  getInstallationOctokit: (...args: unknown[]) => {
    if (!getInstallationOctokitSpy) throw new Error("getInstallationOctokitSpy not initialized");
    return getInstallationOctokitSpy(...args);
  },
}));

vi.mock("../lib/github/detect-framework", () => ({
  detectFramework: (...args: unknown[]) => {
    if (!detectFrameworkSpy) throw new Error("detectFrameworkSpy not initialized");
    return detectFrameworkSpy(...args);
  },
}));

describe("analyzeRepository", () => {
  it("sets status to analyzing, then unsupported for unsupported repos", async () => {
    vi.resetModules();

    setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
    updateProjectDetectionByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
    getInstallationOctokitSpy = vi.fn().mockResolvedValue({ some: "octokit" });
    detectFrameworkSpy = vi.fn().mockResolvedValue({
      framework: null,
      entryPoint: null,
      existingAnalytics: [],
      isMonorepo: false,
      error: "unsupported_framework",
    });

    const { analyzeRepository } = await import("../lib/github/analyze");
    await analyzeRepository({
      repoId: 123n,
      repoFullName: "octo/repo",
      installationId: 456n,
    });

    expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({ repoId: 123n, status: "analyzing" });
    expect(updateProjectDetectionByRepoIdSpy).toHaveBeenCalledWith({
      repoId: 123n,
      detectedFramework: null,
      detectedAnalytics: [],
    });
    expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({ repoId: 123n, status: "unsupported" });
  });

  it("stores detection results on success", async () => {
    vi.resetModules();

    setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
    updateProjectDetectionByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
    getInstallationOctokitSpy = vi.fn().mockResolvedValue({ some: "octokit" });
    detectFrameworkSpy = vi.fn().mockResolvedValue({
      framework: "nextjs-app",
      entryPoint: "app/layout.tsx",
      existingAnalytics: ["@vercel/analytics"],
      isMonorepo: false,
      error: null,
    });

    const { analyzeRepository } = await import("../lib/github/analyze");
    await analyzeRepository({
      repoId: 123n,
      repoFullName: "octo/repo",
      installationId: 456n,
    });

    expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({ repoId: 123n, status: "analyzing" });
    expect(updateProjectDetectionByRepoIdSpy).toHaveBeenCalledWith({
      repoId: 123n,
      detectedFramework: "nextjs-app",
      detectedAnalytics: ["@vercel/analytics"],
    });
  });
});

