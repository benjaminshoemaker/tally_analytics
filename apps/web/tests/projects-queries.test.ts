import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let deleteSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
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
    deleteSpy = vi.fn();

    const { upsertProjectsForRepos } = await import("../lib/db/queries/projects");
    await expect(upsertProjectsForRepos({ userId: "u1", installationId: 1n, repositories: [] })).resolves.toBeUndefined();
  });

  it("deleteProjectsByInstallationAndRepoIds does nothing when repoIds is empty", async () => {
    vi.resetModules();
    insertSpy = vi.fn();
    deleteSpy = vi.fn(() => {
      throw new Error("db.delete called unexpectedly");
    });

    const { deleteProjectsByInstallationAndRepoIds } = await import("../lib/db/queries/projects");
    await expect(deleteProjectsByInstallationAndRepoIds({ installationId: 1n, repoIds: [] })).resolves.toBeUndefined();
  });
});

