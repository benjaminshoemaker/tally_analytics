import { describe, expect, it, vi } from "vitest";

describe("events project cache (Task 4.3.A)", () => {
  it("caches project activity lookups for 30 seconds", async () => {
    const queryStatus = vi.fn(async () => "active");
    const now = vi.fn(() => 1_000);

    const { createProjectCache } = await import("../../events/lib/project-cache");
    const cache = createProjectCache({ queryStatus, now, ttlMs: 30_000 });

    await expect(cache.isProjectActive("proj_test")).resolves.toBe(true);
    await expect(cache.isProjectActive("proj_test")).resolves.toBe(true);
    expect(queryStatus).toHaveBeenCalledTimes(1);

    now.mockReturnValue(30_999);
    await expect(cache.isProjectActive("proj_test")).resolves.toBe(true);
    expect(queryStatus).toHaveBeenCalledTimes(1);

    now.mockReturnValue(31_001);
    await expect(cache.isProjectActive("proj_test")).resolves.toBe(true);
    expect(queryStatus).toHaveBeenCalledTimes(2);
  });
});

