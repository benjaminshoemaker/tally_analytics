import { describe, expect, it, vi } from "vitest";

let destroySessionSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/session", () => ({
  destroySession: (...args: unknown[]) => {
    if (!destroySessionSpy) throw new Error("destroySessionSpy not initialized");
    return destroySessionSpy(...args);
  },
}));

describe("POST /api/auth/logout (no cookie)", () => {
  it("clears cookie and redirects when there is no session cookie", async () => {
    vi.resetModules();
    destroySessionSpy = vi.fn();

    const { POST } = await import("../app/api/auth/logout/route");
    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
    const response = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));

    expect(destroySessionSpy).not.toHaveBeenCalled();
    expect(new URL(response.headers.get("location") ?? "", "http://localhost").pathname).toBe("/");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Expires=");
  });
});
