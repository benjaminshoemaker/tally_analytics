import { describe, expect, it, vi } from "vitest";

describe("GitHub OAuth helpers", () => {
  describe("generateOAuthState", () => {
    it("returns a 64-character hex string", async () => {
      vi.resetModules();
      const { generateOAuthState } = await import("../lib/auth/github-oauth");
      expect(generateOAuthState()).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates unique values on each call", async () => {
      vi.resetModules();
      const { generateOAuthState } = await import("../lib/auth/github-oauth");
      expect(generateOAuthState()).not.toBe(generateOAuthState());
    });
  });

  describe("buildGitHubAuthUrl", () => {
    it("builds the correct GitHub authorization URL", async () => {
      vi.resetModules();
      process.env.GITHUB_OAUTH_CLIENT_ID = "client-id";
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

      const { buildGitHubAuthUrl } = await import("../lib/auth/github-oauth");
      const url = new URL(buildGitHubAuthUrl("test-state"));

      expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
      expect(url.searchParams.get("client_id")).toBe("client-id");
      expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/github/callback");
      expect(url.searchParams.get("scope")).toBe("read:user user:email");
      expect(url.searchParams.get("state")).toBe("test-state");
    });
  });

  describe("exchangeCodeForToken", () => {
    it("exchanges an auth code for an access token", async () => {
      vi.resetModules();
      process.env.GITHUB_OAUTH_CLIENT_ID = "client-id";
      process.env.GITHUB_OAUTH_CLIENT_SECRET = "client-secret";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "gho_test_token" }),
      });

      const { exchangeCodeForToken } = await import("../lib/auth/github-oauth");
      await expect(exchangeCodeForToken("test-code")).resolves.toBe("gho_test_token");
    });

    it("throws when GitHub returns an error response", async () => {
      vi.resetModules();
      process.env.GITHUB_OAUTH_CLIENT_ID = "client-id";
      process.env.GITHUB_OAUTH_CLIENT_SECRET = "client-secret";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: "bad_verification_code", error_description: "Bad code" }),
      });

      const { exchangeCodeForToken } = await import("../lib/auth/github-oauth");
      await expect(exchangeCodeForToken("invalid-code")).rejects.toThrow(/bad_verification_code|Bad code/);
    });
  });

  describe("fetchGitHubUser", () => {
    it("returns the GitHub user profile", async () => {
      vi.resetModules();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 123, login: "testuser", avatar_url: "https://example.com/avatar.png" }),
      });

      const { fetchGitHubUser } = await import("../lib/auth/github-oauth");
      await expect(fetchGitHubUser("t1")).resolves.toEqual({
        id: 123,
        login: "testuser",
        avatar_url: "https://example.com/avatar.png",
      });
    });
  });

  describe("fetchGitHubUserEmail", () => {
    it("returns the primary verified email when available", async () => {
      vi.resetModules();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { email: "unverified@example.com", primary: true, verified: false },
            { email: "primary@example.com", primary: true, verified: true },
            { email: "verified@example.com", primary: false, verified: true },
          ]),
      });

      const { fetchGitHubUserEmail } = await import("../lib/auth/github-oauth");
      await expect(fetchGitHubUserEmail("t1")).resolves.toBe("primary@example.com");
    });

    it("falls back to any verified email when there is no primary verified email", async () => {
      vi.resetModules();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { email: "unverified@example.com", primary: true, verified: false },
            { email: "verified@example.com", primary: false, verified: true },
          ]),
      });

      const { fetchGitHubUserEmail } = await import("../lib/auth/github-oauth");
      await expect(fetchGitHubUserEmail("t1")).resolves.toBe("verified@example.com");
    });

    it("throws when no verified emails exist", async () => {
      vi.resetModules();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ email: "unverified@example.com", primary: true, verified: false }]),
      });

      const { fetchGitHubUserEmail } = await import("../lib/auth/github-oauth");
      await expect(fetchGitHubUserEmail("t1")).rejects.toThrow(/verified email/i);
    });
  });
});

