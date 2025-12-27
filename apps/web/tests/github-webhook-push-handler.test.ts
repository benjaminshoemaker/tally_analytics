import { describe, expect, it, vi } from "vitest";

let getProjectStatusByRepoIdSpy: ReturnType<typeof vi.fn> | undefined;
let analyzeRepositorySpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", () => ({
  getProjectStatusByRepoId: (...args: unknown[]) => {
    if (!getProjectStatusByRepoIdSpy) throw new Error("getProjectStatusByRepoIdSpy not initialized");
    return getProjectStatusByRepoIdSpy(...args);
  },
}));

vi.mock("../lib/github/analyze", () => ({
  analyzeRepository: (...args: unknown[]) => {
    if (!analyzeRepositorySpy) throw new Error("analyzeRepositorySpy not initialized");
    return analyzeRepositorySpy(...args);
  },
}));

describe("handlePushWebhook", () => {
  it("re-runs analysis only when status is unsupported and push is to default branch", async () => {
    vi.resetModules();
    getProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue("unsupported");
    analyzeRepositorySpy = vi.fn().mockResolvedValue(undefined);

    const { handlePushWebhook } = await import("../lib/github/handlers/push");

    const payload = {
      ref: "refs/heads/main",
      deleted: false,
      repository: { id: 123, full_name: "octo/repo", default_branch: "main" },
      installation: { id: 456 },
    };

    await handlePushWebhook(payload);

    expect(getProjectStatusByRepoIdSpy).toHaveBeenCalledWith({ repoId: 123n });
    expect(analyzeRepositorySpy).toHaveBeenCalledWith({ repoId: 123n, repoFullName: "octo/repo", installationId: 456n });
  });

  it("does nothing for non-default branch pushes", async () => {
    vi.resetModules();
    getProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue("unsupported");
    analyzeRepositorySpy = vi.fn().mockResolvedValue(undefined);

    const { handlePushWebhook } = await import("../lib/github/handlers/push");
    await handlePushWebhook({
      ref: "refs/heads/feature",
      deleted: false,
      repository: { id: 123, full_name: "octo/repo", default_branch: "main" },
      installation: { id: 456 },
    });

    expect(analyzeRepositorySpy).not.toHaveBeenCalled();
  });

  it("does nothing when project is not unsupported", async () => {
    vi.resetModules();
    getProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue("active");
    analyzeRepositorySpy = vi.fn().mockResolvedValue(undefined);

    const { handlePushWebhook } = await import("../lib/github/handlers/push");
    await handlePushWebhook({
      ref: "refs/heads/main",
      deleted: false,
      repository: { id: 123, full_name: "octo/repo", default_branch: "main" },
      installation: { id: 456 },
    });

    expect(analyzeRepositorySpy).not.toHaveBeenCalled();
  });
});

