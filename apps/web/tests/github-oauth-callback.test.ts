import { describe, expect, it, vi } from "vitest";

let exchangeSpy: ReturnType<typeof vi.fn> | undefined;
let fetchUserSpy: ReturnType<typeof vi.fn> | undefined;
let fetchEmailSpy: ReturnType<typeof vi.fn> | undefined;
let findOrCreateSpy: ReturnType<typeof vi.fn> | undefined;
let createSessionSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/github-oauth", () => ({
  exchangeCodeForToken: (...args: unknown[]) => {
    if (!exchangeSpy) throw new Error("exchangeSpy not initialized");
    return exchangeSpy(...args);
  },
  fetchGitHubUser: (...args: unknown[]) => {
    if (!fetchUserSpy) throw new Error("fetchUserSpy not initialized");
    return fetchUserSpy(...args);
  },
  fetchGitHubUserEmail: (...args: unknown[]) => {
    if (!fetchEmailSpy) throw new Error("fetchEmailSpy not initialized");
    return fetchEmailSpy(...args);
  },
}));

vi.mock("../lib/db/queries/users", () => ({
  findOrCreateUserByGitHub: (...args: unknown[]) => {
    if (!findOrCreateSpy) throw new Error("findOrCreateSpy not initialized");
    return findOrCreateSpy(...args);
  },
}));

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

describe("GET /api/auth/github/callback", () => {
  it("redirects to /login?error=oauth_cancelled when user cancels on GitHub", async () => {
    vi.resetModules();

    exchangeSpy = vi.fn();
    fetchUserSpy = vi.fn();
    fetchEmailSpy = vi.fn();
    findOrCreateSpy = vi.fn();
    createSessionSpy = vi.fn();

    const { GET } = await import("../app/api/auth/github/callback/route");
    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?error=access_denied&error_description=User+canceled"),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/login");
    expect(new URL(location ?? "", "http://localhost").searchParams.get("error")).toBe("oauth_cancelled");
    expect(exchangeSpy).not.toHaveBeenCalled();
    expect(findOrCreateSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=invalid_state when code or state is missing", async () => {
    vi.resetModules();

    exchangeSpy = vi.fn();
    fetchUserSpy = vi.fn();
    fetchEmailSpy = vi.fn();
    findOrCreateSpy = vi.fn();
    createSessionSpy = vi.fn();

    const { GET } = await import("../app/api/auth/github/callback/route");

    const missingCode = await GET(new Request("http://localhost/api/auth/github/callback?state=abc", { headers: {} }));
    expect(new URL(missingCode.headers.get("location") ?? "", "http://localhost").searchParams.get("error")).toBe(
      "invalid_state",
    );

    const missingState = await GET(new Request("http://localhost/api/auth/github/callback?code=abc", { headers: {} }));
    expect(new URL(missingState.headers.get("location") ?? "", "http://localhost").searchParams.get("error")).toBe(
      "invalid_state",
    );

    expect(exchangeSpy).not.toHaveBeenCalled();
    expect(findOrCreateSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=invalid_state when state cookie does not match param", async () => {
    vi.resetModules();

    exchangeSpy = vi.fn();
    fetchUserSpy = vi.fn();
    fetchEmailSpy = vi.fn();
    findOrCreateSpy = vi.fn();
    createSessionSpy = vi.fn();

    const { GET } = await import("../app/api/auth/github/callback/route");

    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=abc&state=param-state", {
        headers: { cookie: "oauth_state=cookie-state" },
      }),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/login");
    expect(new URL(location ?? "", "http://localhost").searchParams.get("error")).toBe("invalid_state");
    expect(exchangeSpy).not.toHaveBeenCalled();
    expect(findOrCreateSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=github_error when GitHub API calls fail", async () => {
    vi.resetModules();

    exchangeSpy = vi.fn().mockRejectedValue(new Error("bad code"));
    fetchUserSpy = vi.fn();
    fetchEmailSpy = vi.fn();
    findOrCreateSpy = vi.fn();
    createSessionSpy = vi.fn();

    const { GET } = await import("../app/api/auth/github/callback/route");

    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=bad&state=state", {
        headers: { cookie: "oauth_state=state" },
      }),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/login");
    expect(new URL(location ?? "", "http://localhost").searchParams.get("error")).toBe("github_error");
    expect(findOrCreateSpy).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  it("creates a user session, clears oauth_state cookie, and redirects to /projects on success", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    vi.resetModules();

    const userId = "11111111-1111-1111-1111-111111111111";
    const sessionId = "22222222-2222-2222-2222-222222222222";

    exchangeSpy = vi.fn().mockResolvedValue("token");
    fetchUserSpy = vi.fn().mockResolvedValue({ id: 8659979, login: "emriedel", avatar_url: "https://example/avatar" });
    fetchEmailSpy = vi.fn().mockResolvedValue("emriedel@example.com");
    findOrCreateSpy = vi.fn().mockResolvedValue({ id: userId });
    createSessionSpy = vi.fn().mockResolvedValue({ id: sessionId, userId, expiresAt: new Date("2030-01-01T00:00:00.000Z") });

    const { GET } = await import("../app/api/auth/github/callback/route");

    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=good&state=state", {
        headers: { cookie: "oauth_state=state" },
      }),
    );

    expect(exchangeSpy).toHaveBeenCalledWith("good");
    expect(fetchUserSpy).toHaveBeenCalledWith("token");
    expect(fetchEmailSpy).toHaveBeenCalledWith("token");
    expect(findOrCreateSpy).toHaveBeenCalledWith({
      githubUserId: 8659979n,
      githubUsername: "emriedel",
      githubAvatarUrl: "https://example/avatar",
      email: "emriedel@example.com",
    });
    expect(createSessionSpy).toHaveBeenCalledWith(userId);

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/projects");

    const setCookies = getSetCookies(response);
    expect(setCookies.some((cookie) => cookie.startsWith("oauth_state=") && cookie.includes("Max-Age=0"))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith("fpa_session="))).toBe(true);

    vi.useRealTimers();
  });
});

