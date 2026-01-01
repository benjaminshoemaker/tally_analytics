import { describe, expect, it, vi } from "vitest";

let selectSpy: ReturnType<typeof vi.fn> | undefined;
let insertSpy: ReturnType<typeof vi.fn> | undefined;

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
  },
}));

describe("regenerate requests queries", () => {
  describe("countRecentRegenerateRequests", () => {
    it("returns the count of recent regenerate requests", async () => {
      vi.resetModules();

      const whereSpy = vi.fn().mockResolvedValue([{ count: 5 }]);
      const fromSpy = vi.fn(() => ({ where: whereSpy }));
      selectSpy = vi.fn(() => ({ from: fromSpy }));
      insertSpy = vi.fn();

      const { countRecentRegenerateRequests } = await import("../lib/db/queries/regenerate-requests");
      const count = await countRecentRegenerateRequests({
        userId: "u1",
        projectId: "proj_123",
        since: new Date("2024-01-01T00:00:00Z"),
      });

      expect(count).toBe(5);
      expect(selectSpy).toHaveBeenCalled();
      expect(fromSpy).toHaveBeenCalled();
      expect(whereSpy).toHaveBeenCalled();
    });

    it("returns 0 when count is null or undefined", async () => {
      vi.resetModules();

      const whereSpy = vi.fn().mockResolvedValue([{}]);
      const fromSpy = vi.fn(() => ({ where: whereSpy }));
      selectSpy = vi.fn(() => ({ from: fromSpy }));
      insertSpy = vi.fn();

      const { countRecentRegenerateRequests } = await import("../lib/db/queries/regenerate-requests");
      const count = await countRecentRegenerateRequests({
        userId: "u1",
        projectId: "proj_123",
        since: new Date("2024-01-01T00:00:00Z"),
      });

      expect(count).toBe(0);
    });

    it("returns 0 when no rows are returned", async () => {
      vi.resetModules();

      const whereSpy = vi.fn().mockResolvedValue([]);
      const fromSpy = vi.fn(() => ({ where: whereSpy }));
      selectSpy = vi.fn(() => ({ from: fromSpy }));
      insertSpy = vi.fn();

      const { countRecentRegenerateRequests } = await import("../lib/db/queries/regenerate-requests");
      const count = await countRecentRegenerateRequests({
        userId: "u1",
        projectId: "proj_123",
        since: new Date("2024-01-01T00:00:00Z"),
      });

      expect(count).toBe(0);
    });

    it("converts string count to number", async () => {
      vi.resetModules();

      const whereSpy = vi.fn().mockResolvedValue([{ count: "10" }]);
      const fromSpy = vi.fn(() => ({ where: whereSpy }));
      selectSpy = vi.fn(() => ({ from: fromSpy }));
      insertSpy = vi.fn();

      const { countRecentRegenerateRequests } = await import("../lib/db/queries/regenerate-requests");
      const count = await countRecentRegenerateRequests({
        userId: "u1",
        projectId: "proj_123",
        since: new Date("2024-01-01T00:00:00Z"),
      });

      expect(count).toBe(10);
    });
  });

  describe("createRegenerateRequest", () => {
    it("inserts a new regenerate request", async () => {
      vi.resetModules();

      selectSpy = vi.fn();
      const valuesSpy = vi.fn().mockResolvedValue(undefined);
      insertSpy = vi.fn(() => ({ values: valuesSpy }));

      const { createRegenerateRequest } = await import("../lib/db/queries/regenerate-requests");
      await createRegenerateRequest({ userId: "u1", projectId: "proj_123" });

      expect(insertSpy).toHaveBeenCalled();
      expect(valuesSpy).toHaveBeenCalledWith({ userId: "u1", projectId: "proj_123" });
    });
  });
});
