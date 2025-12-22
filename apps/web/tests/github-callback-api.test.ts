import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let getOrRefreshInstallationTokenSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/get-user", () => ({
  getUserFromRequest: (...args: unknown[]) => {
    if (!getUserFromRequestSpy) throw new Error("getUserFromRequestSpy not initialized");
    return getUserFromRequestSpy(...args);
  },
}));

vi.mock("../lib/db/queries/github-tokens", () => ({
  getOrRefreshInstallationToken: (...args: unknown[]) => {
    if (!getOrRefreshInstallationTokenSpy) throw new Error("getOrRefreshInstallationTokenSpy not initialized");
    return getOrRefreshInstallationTokenSpy(...args);
  },
}));

describe("GET /api/github/callback", () => {
  it("links installation to authenticated user, stores token, and redirects to /dashboard", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      email: "test@example.com",
    });
    getOrRefreshInstallationTokenSpy = vi.fn().mockResolvedValue({
      token: "t1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    const { GET } = await import("../app/api/github/callback/route");
    const response = await GET(new Request("http://localhost/api/github/callback?installation_id=123"));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/dashboard");

    expect(getOrRefreshInstallationTokenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "11111111-1111-1111-1111-111111111111",
        installationId: 123n,
      }),
    );
  });

  it("redirects to /login when the user is not authenticated", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    getOrRefreshInstallationTokenSpy = vi.fn();

    const { GET } = await import("../app/api/github/callback/route");
    const response = await GET(new Request("http://localhost/api/github/callback?installation_id=123"));

    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/login");
  });

  it("redirects to /dashboard when installation_id is missing or invalid", async () => {
    vi.resetModules();
    getUserFromRequestSpy = vi.fn().mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      email: "test@example.com",
    });
    getOrRefreshInstallationTokenSpy = vi.fn();

    const { GET } = await import("../app/api/github/callback/route");
    const response = await GET(new Request("http://localhost/api/github/callback"));

    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/dashboard");
  });
});

