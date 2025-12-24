import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/get-user", () => ({
  getUserFromRequest: (...args: unknown[]) => {
    if (!getUserFromRequestSpy) throw new Error("getUserFromRequestSpy not initialized");
    return getUserFromRequestSpy(...args);
  },
}));

describe("auth middleware", () => {
  it("matches /dashboard/* and /api/projects/*", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn();

    const { config } = await import("../middleware");

    expect(config).toEqual({ matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*", "/api/projects/:path*"] });
  });

  it("allows requests when session is valid", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "user", email: "user@example.com" });

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("../middleware");

    const response = await middleware(new NextRequest("http://localhost/dashboard"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects dashboard requests to /login when session is invalid", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("../middleware");

    const response = await middleware(new NextRequest("http://localhost/dashboard"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(new URL(response.headers.get("location") ?? "", "http://localhost").pathname).toBe("/login");
  });

  it("returns 401 for /api/projects/* when session is invalid", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("../middleware");

    const response = await middleware(new NextRequest("http://localhost/api/projects"));
    expect(response.status).toBe(401);
  });
});
