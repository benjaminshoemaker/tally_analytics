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

describe("GitHub pull request webhook handler", () => {
  it("pull_request.closed sets status to active when merged", async () => {
    vi.resetModules();

    const schema = await import("../lib/db/schema");

    const whereSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn(() => ({ where: whereSpy }));
    updateSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.projects);
      return { set: setSpy };
    });

    const { handlePullRequestWebhook } = await import("../lib/github/handlers/pull-request");

    await handlePullRequestWebhook({
      action: "closed",
      pull_request: { number: 10, merged: true },
      repository: { id: 456 },
    });

    expect(setSpy).toHaveBeenCalledWith({ status: "active" });
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it("pull_request.closed sets status to pr_closed when not merged", async () => {
    vi.resetModules();

    const schema = await import("../lib/db/schema");

    const whereSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn(() => ({ where: whereSpy }));
    updateSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.projects);
      return { set: setSpy };
    });

    const { handlePullRequestWebhook } = await import("../lib/github/handlers/pull-request");

    await handlePullRequestWebhook({
      action: "closed",
      pull_request: { number: 10, merged: false },
      repository: { id: 456 },
    });

    expect(setSpy).toHaveBeenCalledWith({ status: "pr_closed" });
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores pull_request events that are not closed", async () => {
    vi.resetModules();
    updateSpy = vi.fn();

    const { handlePullRequestWebhook } = await import("../lib/github/handlers/pull-request");

    await handlePullRequestWebhook({
      action: "opened",
      pull_request: { number: 10, merged: false },
      repository: { id: 456 },
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });
});

