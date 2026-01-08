import { describe, expect, it, vi } from "vitest";

function getSetCookies(response: Response): string[] {
  const headers = response.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function getCookieValue(setCookie: string, name: string): string | null {
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+);`));
  return match?.[1] ?? null;
}

describe("GET /api/auth/github", () => {
  it("sets oauth_state cookie and redirects to GitHub auth URL (302)", async () => {
    const previousClientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    process.env.GITHUB_OAUTH_CLIENT_ID = "client-id";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    vi.resetModules();
    const { GET } = await import("../app/api/auth/github/route");

    const response = await GET(new Request("http://localhost:3000/api/auth/github"));

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location ?? "");
    expect(redirectUrl.origin).toBe("https://github.com");
    expect(redirectUrl.pathname).toBe("/login/oauth/authorize");
    expect(redirectUrl.searchParams.get("client_id")).toBe("client-id");
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/github/callback");
    expect(redirectUrl.searchParams.get("scope")).toBe("read:user user:email");

    const state = redirectUrl.searchParams.get("state");
    expect(state).toMatch(/^[a-f0-9]{64}$/);

    const setCookies = getSetCookies(response);
    const oauthCookie = setCookies.find((cookie) => cookie.startsWith("oauth_state="));
    expect(oauthCookie).toBeTruthy();
    expect(oauthCookie).toContain("HttpOnly");
    expect(oauthCookie).toMatch(/SameSite=lax/i);
    expect(oauthCookie).toContain("Max-Age=600");

    const cookieState = oauthCookie ? getCookieValue(oauthCookie, "oauth_state") : null;
    expect(cookieState).toBe(state);

    if (previousClientId === undefined) delete process.env.GITHUB_OAUTH_CLIENT_ID;
    else process.env.GITHUB_OAUTH_CLIENT_ID = previousClientId;
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  it("uses Secure cookies when NEXT_PUBLIC_APP_URL is https", async () => {
    const previousClientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    process.env.GITHUB_OAUTH_CLIENT_ID = "client-id";
    process.env.NEXT_PUBLIC_APP_URL = "https://usetally.xyz";

    vi.resetModules();
    const { GET } = await import("../app/api/auth/github/route");

    const response = await GET(new Request("https://usetally.xyz/api/auth/github"));
    const setCookies = getSetCookies(response);
    const oauthCookie = setCookies.find((cookie) => cookie.startsWith("oauth_state="));
    expect(oauthCookie).toBeTruthy();
    expect(oauthCookie).toContain("Secure");

    if (previousClientId === undefined) delete process.env.GITHUB_OAUTH_CLIENT_ID;
    else process.env.GITHUB_OAUTH_CLIENT_ID = previousClientId;
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });
});
