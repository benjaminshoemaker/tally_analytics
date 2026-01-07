import { describe, expect, it, vi } from "vitest";

let updateSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    update: (...args: unknown[]) => {
      if (!updateSpy) throw new Error("updateSpy not initialized");
      return updateSpy(...args);
    },
  },
}));

describe("link-github-users script", () => {
  it("defines the expected users to link", async () => {
    vi.resetModules();
    process.env.DATABASE_URL ??= "postgres://example.invalid/db";

    const { USERS_TO_LINK } = await import("../scripts/link-github-users");
    expect(USERS_TO_LINK).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ githubUsername: "emriedel", githubUserId: 8659979n }),
        expect.objectContaining({ githubUsername: "benjaminshoemaker", githubUserId: 224462439n }),
      ]),
    );
  });

  it("logs success for each linked user and continues on missing users", async () => {
    vi.resetModules();
    process.env.DATABASE_URL ??= "postgres://example.invalid/db";

    const returningSpy = vi
      .fn()
      .mockResolvedValueOnce([{ id: "u1" }])
      .mockResolvedValueOnce([]) // missing
      .mockResolvedValueOnce([{ id: "u3" }]);
    const whereSpy = vi.fn(() => ({ returning: returningSpy }));
    const setSpy = vi.fn(() => ({ where: whereSpy }));
    updateSpy = vi.fn(() => ({ set: setSpy }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { linkGitHubUsers } = await import("../scripts/link-github-users");
    await linkGitHubUsers([
      { userId: "u1", githubUserId: 1n, githubUsername: "a" },
      { userId: "u2", githubUserId: 2n, githubUsername: "b" },
      { userId: "u3", githubUserId: 3n, githubUsername: "c" },
    ]);

    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(setSpy).toHaveBeenCalledTimes(3);
    expect(whereSpy).toHaveBeenCalledTimes(3);
    expect(returningSpy).toHaveBeenCalledTimes(3);

    expect(logSpy).toHaveBeenCalledWith("Linked u1 → a (1)");
    expect(errorSpy).toHaveBeenCalledWith("User not found: u2 (b)");
    expect(logSpy).toHaveBeenCalledWith("Linked u3 → c (3)");

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

