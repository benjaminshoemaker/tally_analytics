import { describe, expect, it, vi } from "vitest";

let validateSessionSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/session", () => ({
  validateSession: (...args: unknown[]) => {
    if (!validateSessionSpy) throw new Error("validateSessionSpy not initialized");
    return validateSessionSpy(...args);
  },
}));

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
  },
}));

describe("getUserFromRequest", () => {
  it("returns null when there is no valid session", async () => {
    vi.resetModules();
    validateSessionSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn(() => {
      throw new Error("db.select called unexpectedly");
    });

    const { getUserFromRequest } = await import("../lib/auth/get-user");
    const request = new Request("http://localhost/dashboard");

    await expect(getUserFromRequest(request)).resolves.toBeNull();
    expect(validateSessionSpy).toHaveBeenCalledWith(request);
  });

  it("returns the user row for a valid session", async () => {
    vi.resetModules();
    const userId = "11111111-1111-1111-1111-111111111111";
    validateSessionSpy = vi.fn().mockResolvedValue({ id: "sess", userId, expiresAt: new Date("2030-01-01T00:00:00.000Z") });

    const schema = await import("../lib/db/schema");
    const whereSpy = vi.fn().mockResolvedValue([{ id: userId, email: "test@example.com" }]);
    const fromSpy = vi.fn((table: unknown) => {
      expect(table).toBe(schema.users);
      return { where: whereSpy };
    });
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const { getUserFromRequest } = await import("../lib/auth/get-user");
    const request = new Request("http://localhost/dashboard");

    await expect(getUserFromRequest(request)).resolves.toEqual({ id: userId, email: "test@example.com" });
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it("returns null when the session is valid but the user row is missing", async () => {
    vi.resetModules();
    const userId = "22222222-2222-2222-2222-222222222222";
    validateSessionSpy = vi.fn().mockResolvedValue({ id: "sess", userId, expiresAt: new Date("2030-01-01T00:00:00.000Z") });

    const whereSpy = vi.fn().mockResolvedValue([]);
    selectSpy = vi.fn(() => ({ from: () => ({ where: whereSpy }) }));

    const { getUserFromRequest } = await import("../lib/auth/get-user");
    await expect(getUserFromRequest(new Request("http://localhost/dashboard"))).resolves.toBeNull();
  });
});

