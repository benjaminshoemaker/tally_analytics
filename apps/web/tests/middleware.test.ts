import { describe, expect, it, vi } from "vitest";

describe("auth middleware", () => {
  it("matches /dashboard/* and /api/projects/*", async () => {
    vi.resetModules();
    const { config } = await import("../middleware");

    expect(config).toEqual({ matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*", "/api/projects/:path*"] });
  });

  it("allows requests when a session cookie is present", async () => {
    vi.resetModules();

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("../middleware");
    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");

    const response = await middleware(
      new NextRequest("http://localhost/dashboard", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=sess_123` },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects dashboard requests to /login when no session cookie is present", async () => {
    vi.resetModules();

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("../middleware");

    const response = await middleware(new NextRequest("http://localhost/dashboard"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(new URL(response.headers.get("location") ?? "", "http://localhost").pathname).toBe("/login");
  });

  it("returns 401 for /api/projects/* when no session cookie is present", async () => {
    vi.resetModules();

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("../middleware");

    const response = await middleware(new NextRequest("http://localhost/api/projects"));
    expect(response.status).toBe(401);
  });
});
