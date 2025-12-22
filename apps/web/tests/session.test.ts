import { describe, expect, it, vi } from "vitest";

let insertSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;
let deleteSpy: ReturnType<typeof vi.fn> | undefined;
let cookieSetSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
    delete: (...args: unknown[]) => {
      if (!deleteSpy) throw new Error("deleteSpy not initialized");
      return deleteSpy(...args);
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (...args: unknown[]) => {
      if (!cookieSetSpy) throw new Error("cookieSetSpy not initialized");
      return cookieSetSpy(...args);
    },
  }),
}));

describe("auth sessions", () => {
  it("createSession(userId) creates session and sets cookie", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    vi.resetModules();
    cookieSetSpy = vi.fn();

    const sessionId = "11111111-1111-1111-1111-111111111111";
    const userId = "22222222-2222-2222-2222-222222222222";
    const expiresAt = new Date("2025-01-31T00:00:00.000Z");

    const returningSpy = vi.fn().mockResolvedValue([{ id: sessionId, userId, expiresAt }]);
    const valuesSpy = vi.fn(() => ({ returning: returningSpy }));
    insertSpy = vi.fn(() => ({ values: valuesSpy }));

    const { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } = await import("../lib/auth/cookies");
    const { createSession } = await import("../lib/auth/session");

    const created = await createSession(userId);

    expect(created).toEqual({ id: sessionId, userId, expiresAt });
    expect(cookieSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SESSION_COOKIE_NAME,
        value: sessionId,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      }),
    );

    vi.useRealTimers();
  });

  it("validateSession(request) returns session when cookie is valid", async () => {
    vi.resetModules();

    const sessionId = "33333333-3333-3333-3333-333333333333";
    const userId = "44444444-4444-4444-4444-444444444444";
    const expiresAt = new Date("2030-01-01T00:00:00.000Z");

    const whereSpy = vi.fn().mockResolvedValue([{ id: sessionId, userId, expiresAt }]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
    const { validateSession } = await import("../lib/auth/session");

    const request = new Request("http://localhost", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });

    await expect(validateSession(request)).resolves.toEqual({ id: sessionId, userId, expiresAt });
  });

  it("destroySession(sessionId) removes session and clears cookie", async () => {
    vi.resetModules();
    cookieSetSpy = vi.fn();

    const whereSpy = vi.fn().mockResolvedValue(undefined);
    deleteSpy = vi.fn(() => ({ where: whereSpy }));

    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
    const { destroySession } = await import("../lib/auth/session");

    const sessionId = "55555555-5555-5555-5555-555555555555";
    await destroySession(sessionId);

    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(cookieSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SESSION_COOKIE_NAME,
        value: "",
        maxAge: 0,
      }),
    );
  });
});

