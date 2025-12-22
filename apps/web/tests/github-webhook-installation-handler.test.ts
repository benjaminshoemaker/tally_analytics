import { describe, expect, it, vi } from "vitest";

let selectSpy: ReturnType<typeof vi.fn> | undefined;
let insertSpy: ReturnType<typeof vi.fn> | undefined;
let deleteSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
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

describe("GitHub installation webhook handlers", () => {
  it("installation.created creates project records for repositories", async () => {
    vi.resetModules();

    const schema = await import("../lib/db/schema");
    const userId = "11111111-1111-1111-1111-111111111111";

    const whereSelectSpy = vi.fn().mockResolvedValue([{ userId }]);
    const fromSelectSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.githubTokens);
      return { where: whereSelectSpy };
    });
    selectSpy = vi.fn(() => ({ from: fromSelectSpy }));

    const onConflictDoUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const valuesSpy = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateSpy }));
    insertSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.projects);
      return { values: valuesSpy };
    });

    deleteSpy = vi.fn();

    const { handleInstallationWebhook } = await import("../lib/github/handlers/installation");

    await handleInstallationWebhook({
      action: "created",
      installation: { id: 123 },
      repositories: [
        { id: 456, full_name: "octo/repo-1" },
        { id: 789, full_name: "octo/repo-2" },
      ],
    });

    expect(valuesSpy).toHaveBeenCalledTimes(1);
    const inserted = valuesSpy.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(Array.isArray(inserted)).toBe(true);
    expect(inserted).toHaveLength(2);

    for (const row of inserted) {
      expect(row).toMatchObject({
        userId,
        githubInstallationId: 123n,
      });
      expect(typeof row.id).toBe("string");
      expect((row.id as string).startsWith("proj_")).toBe(true);
      expect((row.id as string)).toHaveLength(20);
    }

    expect(onConflictDoUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it("installation.deleted removes projects for the installation", async () => {
    vi.resetModules();

    const schema = await import("../lib/db/schema");

    selectSpy = vi.fn();
    insertSpy = vi.fn();

    const whereDeleteSpy = vi.fn().mockResolvedValue(undefined);
    deleteSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.projects);
      return { where: whereDeleteSpy };
    });

    const { handleInstallationWebhook } = await import("../lib/github/handlers/installation");

    await handleInstallationWebhook({
      action: "deleted",
      installation: { id: 123 },
    });

    expect(whereDeleteSpy).toHaveBeenCalledTimes(1);
  });

  it("installation_repositories.removed deletes projects for removed repos", async () => {
    vi.resetModules();

    const schema = await import("../lib/db/schema");
    selectSpy = vi.fn();
    insertSpy = vi.fn();

    const whereDeleteSpy = vi.fn().mockResolvedValue(undefined);
    deleteSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.projects);
      return { where: whereDeleteSpy };
    });

    const { handleInstallationRepositoriesWebhook } = await import("../lib/github/handlers/installation");

    await handleInstallationRepositoriesWebhook({
      action: "removed",
      installation: { id: 123 },
      repositories_removed: [{ id: 456, full_name: "octo/repo-1" }],
    });

    expect(whereDeleteSpy).toHaveBeenCalledTimes(1);
  });

  it("installation_repositories.added creates project records for added repos", async () => {
    vi.resetModules();

    const schema = await import("../lib/db/schema");
    const userId = "11111111-1111-1111-1111-111111111111";

    const whereSelectSpy = vi.fn().mockResolvedValue([{ userId }]);
    const fromSelectSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.githubTokens);
      return { where: whereSelectSpy };
    });
    selectSpy = vi.fn(() => ({ from: fromSelectSpy }));

    const onConflictDoUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const valuesSpy = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateSpy }));
    insertSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.projects);
      return { values: valuesSpy };
    });

    deleteSpy = vi.fn();

    const { handleInstallationRepositoriesWebhook } = await import("../lib/github/handlers/installation");

    await handleInstallationRepositoriesWebhook({
      action: "added",
      installation: { id: 123 },
      repositories_added: [{ id: 456, full_name: "octo/repo-1" }],
    });

    expect(valuesSpy).toHaveBeenCalledTimes(1);
    const inserted = valuesSpy.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      userId,
      githubInstallationId: 123n,
      githubRepoId: 456n,
      githubRepoFullName: "octo/repo-1",
    });
    expect(onConflictDoUpdateSpy).toHaveBeenCalledTimes(1);
  });
});
