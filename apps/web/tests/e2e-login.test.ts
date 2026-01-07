import { describe, expect, it, vi } from "vitest";

let createSessionSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/session", () => ({
  createSession: (...args: unknown[]) => {
    if (!createSessionSpy) throw new Error("createSessionSpy not initialized");
    return createSessionSpy(...args);
  },
}));

function getSetCookies(response: Response): string[] {
  const headers = response.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

describe("POST /api/auth/e2e-login", () => {
  it("returns 404 when E2E_TEST_MODE is not enabled", async () => {
    const previousMode = process.env.E2E_TEST_MODE;
    const previousEnv = process.env.NODE_ENV;

    process.env.E2E_TEST_MODE = "0";
    (process.env as any).NODE_ENV = "test";

    vi.resetModules();
    createSessionSpy = vi.fn();
    const { POST } = await import("../app/api/auth/e2e-login/route");

    const response = await POST(
      new Request("http://localhost/api/auth/e2e-login", {
        method: "POST",
        body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(createSessionSpy).not.toHaveBeenCalled();

    if (previousMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = previousMode;
    if (previousEnv === undefined) delete (process.env as any).NODE_ENV;
    else (process.env as any).NODE_ENV = previousEnv;
  });

  it("returns 404 in production even when E2E_TEST_MODE is enabled", async () => {
    const previousMode = process.env.E2E_TEST_MODE;
    const previousEnv = process.env.NODE_ENV;

    process.env.E2E_TEST_MODE = "1";
    (process.env as any).NODE_ENV = "production";

    vi.resetModules();
    createSessionSpy = vi.fn();
    const { POST } = await import("../app/api/auth/e2e-login/route");

    const response = await POST(
      new Request("https://usetally.xyz/api/auth/e2e-login", {
        method: "POST",
        body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(createSessionSpy).not.toHaveBeenCalled();

    if (previousMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = previousMode;
    if (previousEnv === undefined) delete (process.env as any).NODE_ENV;
    else (process.env as any).NODE_ENV = previousEnv;
  });

  it("creates a session and sets a session cookie when enabled", async () => {
    const previousMode = process.env.E2E_TEST_MODE;
    const previousEnv = process.env.NODE_ENV;

    process.env.E2E_TEST_MODE = "1";
    (process.env as any).NODE_ENV = "test";

    vi.resetModules();
    createSessionSpy = vi
      .fn()
      .mockResolvedValue({ id: "22222222-2222-2222-2222-222222222222", userId: "11111111-1111-1111-1111-111111111111", expiresAt: new Date("2030-01-01T00:00:00.000Z") });

    const { POST } = await import("../app/api/auth/e2e-login/route");

    const response = await POST(
      new Request("http://localhost/api/auth/e2e-login", {
        method: "POST",
        body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(createSessionSpy).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");

    const setCookies = getSetCookies(response);
    expect(setCookies.some((cookie) => cookie.startsWith("fpa_session="))).toBe(true);

    if (previousMode === undefined) delete process.env.E2E_TEST_MODE;
    else process.env.E2E_TEST_MODE = previousMode;
    if (previousEnv === undefined) delete (process.env as any).NODE_ENV;
    else (process.env as any).NODE_ENV = previousEnv;
  });
});
