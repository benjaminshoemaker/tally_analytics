import { describe, expect, it, vi } from "vitest";

let selectSpy: ReturnType<typeof vi.fn> | undefined;
let updateSpy: ReturnType<typeof vi.fn> | undefined;
let insertSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
    update: (...args: unknown[]) => {
      if (!updateSpy) throw new Error("updateSpy not initialized");
      return updateSpy(...args);
    },
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
  },
}));

describe("user queries", () => {
  describe("findOrCreateUserByGitHub", () => {
    it("returns existing user id and updates user fields", async () => {
      vi.resetModules();

      const whereSelectSpy = vi.fn().mockResolvedValue([{ id: "u1" }]);
      const fromSelectSpy = vi.fn(() => ({ where: whereSelectSpy }));
      selectSpy = vi.fn(() => ({ from: fromSelectSpy }));

      const whereUpdateSpy = vi.fn().mockResolvedValue(undefined);
      const setSpy = vi.fn(() => ({ where: whereUpdateSpy }));
      updateSpy = vi.fn(() => ({ set: setSpy }));
      insertSpy = vi.fn();

      const { findOrCreateUserByGitHub } = await import("../lib/db/queries/users");
      await expect(
        findOrCreateUserByGitHub({
          githubUserId: 123n,
          githubUsername: "octocat",
          githubAvatarUrl: "https://example.com/avatar.png",
          email: "octocat@example.com",
        }),
      ).resolves.toEqual({ id: "u1" });

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          githubUsername: "octocat",
          githubAvatarUrl: "https://example.com/avatar.png",
          email: "octocat@example.com",
          updatedAt: expect.any(Date),
        }),
      );
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it("creates a new user when no user exists for the GitHub ID", async () => {
      vi.resetModules();

      const whereSelectSpy = vi.fn().mockResolvedValue([]);
      const fromSelectSpy = vi.fn(() => ({ where: whereSelectSpy }));
      selectSpy = vi.fn(() => ({ from: fromSelectSpy }));
      updateSpy = vi.fn();

      const returningSpy = vi.fn().mockResolvedValue([{ id: "new-user" }]);
      const valuesSpy = vi.fn(() => ({ returning: returningSpy }));
      insertSpy = vi.fn(() => ({ values: valuesSpy }));

      const { findOrCreateUserByGitHub } = await import("../lib/db/queries/users");
      await expect(
        findOrCreateUserByGitHub({
          githubUserId: 123n,
          githubUsername: "octocat",
          githubAvatarUrl: "https://example.com/avatar.png",
          email: "octocat@example.com",
        }),
      ).resolves.toEqual({ id: "new-user" });

      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          githubUserId: 123n,
          githubUsername: "octocat",
          githubAvatarUrl: "https://example.com/avatar.png",
          email: "octocat@example.com",
        }),
      );
      expect(returningSpy).toHaveBeenCalledTimes(1);
    });

    it("throws when insert returns no rows", async () => {
      vi.resetModules();

      selectSpy = vi.fn(() => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }));
      updateSpy = vi.fn();

      const returningSpy = vi.fn().mockResolvedValue([]);
      insertSpy = vi.fn(() => ({ values: () => ({ returning: returningSpy }) }));

      const { findOrCreateUserByGitHub } = await import("../lib/db/queries/users");
      await expect(
        findOrCreateUserByGitHub({
          githubUserId: 123n,
          githubUsername: "octocat",
          githubAvatarUrl: "https://example.com/avatar.png",
          email: "octocat@example.com",
        }),
      ).rejects.toThrow(/Failed to create user/);
    });
  });

  describe("getUserById", () => {
    it("returns null when no user exists", async () => {
      vi.resetModules();

      const whereSpy = vi.fn().mockResolvedValue([]);
      selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));
      updateSpy = vi.fn();
      insertSpy = vi.fn();

      const { getUserById } = await import("../lib/db/queries/users");
      await expect(getUserById("u1")).resolves.toBeNull();
    });

    it("returns the user record fields when present", async () => {
      vi.resetModules();

      const whereSpy = vi.fn().mockResolvedValue([
        {
          id: "u1",
          email: "a@example.com",
          githubUsername: "octocat",
          githubAvatarUrl: "https://example.com/avatar.png",
        },
      ]);
      selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));
      updateSpy = vi.fn();
      insertSpy = vi.fn();

      const { getUserById } = await import("../lib/db/queries/users");
      await expect(getUserById("u1")).resolves.toEqual({
        id: "u1",
        email: "a@example.com",
        githubUsername: "octocat",
        githubAvatarUrl: "https://example.com/avatar.png",
      });
    });
  });
});

