import { describe, expect, it, vi } from "vitest";

let destroySessionSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/session", () => ({
  destroySession: (...args: unknown[]) => {
    if (!destroySessionSpy) throw new Error("destroySessionSpy not initialized");
    return destroySessionSpy(...args);
  },
}));

describe("POST /api/auth/logout", () => {
  it("destroys the session and redirects to /", async () => {
    vi.resetModules();
    destroySessionSpy = vi.fn().mockResolvedValue(undefined);

    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
    const { POST } = await import("../app/api/auth/logout/route");

    const sessionId = "11111111-1111-1111-1111-111111111111";
    const response = await POST(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
      }),
    );

    expect(destroySessionSpy).toHaveBeenCalledWith(sessionId);
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(new URL(response.headers.get("location") ?? "", "http://localhost").pathname).toBe("/");
  });
});

