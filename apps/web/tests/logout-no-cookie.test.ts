import { describe, expect, it, vi } from "vitest";

let destroySessionSpy: ReturnType<typeof vi.fn> | undefined;
let clearSessionCookieSpy: ReturnType<typeof vi.fn> | undefined;
let getSessionIdFromRequestSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/session", () => ({
  destroySession: (...args: unknown[]) => {
    if (!destroySessionSpy) throw new Error("destroySessionSpy not initialized");
    return destroySessionSpy(...args);
  },
}));

vi.mock("../lib/auth/cookies", () => ({
  getSessionIdFromRequest: (...args: unknown[]) => {
    if (!getSessionIdFromRequestSpy) throw new Error("getSessionIdFromRequestSpy not initialized");
    return getSessionIdFromRequestSpy(...args);
  },
  clearSessionCookie: (...args: unknown[]) => {
    if (!clearSessionCookieSpy) throw new Error("clearSessionCookieSpy not initialized");
    return clearSessionCookieSpy(...args);
  },
}));

describe("POST /api/auth/logout (no cookie)", () => {
  it("clears cookie and redirects when there is no session cookie", async () => {
    vi.resetModules();
    destroySessionSpy = vi.fn();
    clearSessionCookieSpy = vi.fn();
    getSessionIdFromRequestSpy = vi.fn().mockReturnValue(null);

    const { POST } = await import("../app/api/auth/logout/route");
    const response = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));

    expect(getSessionIdFromRequestSpy).toHaveBeenCalledTimes(1);
    expect(destroySessionSpy).not.toHaveBeenCalled();
    expect(clearSessionCookieSpy).toHaveBeenCalledTimes(1);
    expect(new URL(response.headers.get("location") ?? "", "http://localhost").pathname).toBe("/");
  });
});

