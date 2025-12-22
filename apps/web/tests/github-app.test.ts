import { describe, expect, it, vi } from "vitest";

let capturedAppOptions: unknown;
let appAuthSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("@octokit/app", () => ({
  App: class App {
    octokit: { auth: (...args: unknown[]) => unknown };
    constructor(options: unknown) {
      capturedAppOptions = options;
      this.octokit = {
        auth: (...args: unknown[]) => {
          if (!appAuthSpy) throw new Error("appAuthSpy not initialized");
          return appAuthSpy(...args);
        },
      };
    }
  },
}));

vi.mock("@octokit/rest", () => ({
  Octokit: class Octokit {
    constructor(_options: unknown) {}
  },
}));

describe("github app client", () => {
  it("creates GitHub App client using env appId/privateKey and can generate an app JWT", async () => {
    const previousAppId = process.env.GITHUB_APP_ID;
    const previousPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    process.env.GITHUB_APP_ID = "123";
    process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n";

    vi.resetModules();
    appAuthSpy = vi.fn().mockResolvedValue({ token: "header.payload.signature" });

    const { __testOnly_clearGitHubAppClient, getAppJwt } = await import("../lib/github/app");
    __testOnly_clearGitHubAppClient();

    await expect(getAppJwt()).resolves.toBe("header.payload.signature");

    expect(capturedAppOptions).toEqual(
      expect.objectContaining({
        appId: 123,
        privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      }),
    );
    expect(appAuthSpy).toHaveBeenCalledWith({ type: "app" });

    if (previousAppId === undefined) delete process.env.GITHUB_APP_ID;
    else process.env.GITHUB_APP_ID = previousAppId;
    if (previousPrivateKey === undefined) delete process.env.GITHUB_APP_PRIVATE_KEY;
    else process.env.GITHUB_APP_PRIVATE_KEY = previousPrivateKey;
  });

  it("caches installation tokens and refreshes before expiry", async () => {
    vi.resetModules();
    const { createGitHubAppClient } = await import("../lib/github/app");

    const nowSpy = vi.fn();
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(59_500).mockReturnValueOnce(60_001);

    const authSpy = vi
      .fn()
      .mockResolvedValueOnce({ token: "t1", expiresAt: new Date(60_000).toISOString() })
      .mockResolvedValueOnce({ token: "t2", expiresAt: new Date(180_000).toISOString() });

    const client = createGitHubAppClient({
      appId: 123,
      privateKey: "key",
      auth: authSpy,
      now: nowSpy,
      createOctokit: () => ({}) as never,
    });

    await expect(client.getInstallationAccessToken(1)).resolves.toEqual({
      token: "t1",
      expiresAt: new Date(60_000).toISOString(),
    });
    await expect(client.getInstallationAccessToken(1)).resolves.toEqual({
      token: "t1",
      expiresAt: new Date(60_000).toISOString(),
    });
    await expect(client.getInstallationAccessToken(1)).resolves.toEqual({
      token: "t2",
      expiresAt: new Date(180_000).toISOString(),
    });
    await expect(client.getInstallationAccessToken(1)).resolves.toEqual({
      token: "t2",
      expiresAt: new Date(180_000).toISOString(),
    });

    expect(authSpy).toHaveBeenCalledTimes(2);
    expect(authSpy).toHaveBeenNthCalledWith(1, { type: "installation", installationId: 1 });
    expect(authSpy).toHaveBeenNthCalledWith(2, { type: "installation", installationId: 1 });
  });

  it("getInstallationOctokit(installationId) returns an Octokit client", async () => {
    vi.resetModules();
    const { createGitHubAppClient } = await import("../lib/github/app");

    const authSpy = vi.fn().mockResolvedValue({ token: "t1", expiresAt: new Date(60_000).toISOString() });
    const createOctokitSpy = vi.fn().mockReturnValue({ ok: true });

    const client = createGitHubAppClient({
      appId: 123,
      privateKey: "key",
      auth: authSpy,
      now: () => 0,
      createOctokit: createOctokitSpy as never,
    });

    await expect(client.getInstallationOctokit(999)).resolves.toEqual({ ok: true });
    expect(createOctokitSpy).toHaveBeenCalledWith({ auth: "t1" });
  });

  it("throws a clear error for an invalid GITHUB_APP_ID", async () => {
    const previousAppId = process.env.GITHUB_APP_ID;
    const previousPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    process.env.GITHUB_APP_ID = "not-a-number";
    process.env.GITHUB_APP_PRIVATE_KEY = "key";

    vi.resetModules();
    const { __testOnly_clearGitHubAppClient, getAppJwt } = await import("../lib/github/app");
    __testOnly_clearGitHubAppClient();

    await expect(getAppJwt()).rejects.toThrow(/Invalid GITHUB_APP_ID/);

    if (previousAppId === undefined) delete process.env.GITHUB_APP_ID;
    else process.env.GITHUB_APP_ID = previousAppId;
    if (previousPrivateKey === undefined) delete process.env.GITHUB_APP_PRIVATE_KEY;
    else process.env.GITHUB_APP_PRIVATE_KEY = previousPrivateKey;
  });

  it("throws when installation auth response is missing expiresAt", async () => {
    vi.resetModules();
    const { createGitHubAppClient } = await import("../lib/github/app");

    const authSpy = vi.fn().mockResolvedValue({ token: "t1" });
    const client = createGitHubAppClient({
      appId: 123,
      privateKey: "key",
      auth: authSpy,
      now: () => 0,
      createOctokit: () => ({}) as never,
    });

    await expect(client.getInstallationAccessToken(1)).rejects.toThrow(/missing expiresAt/);
  });

  it("throws when installation auth response has an invalid expiresAt", async () => {
    vi.resetModules();
    const { createGitHubAppClient } = await import("../lib/github/app");

    const authSpy = vi.fn().mockResolvedValue({ token: "t1", expiresAt: "not-a-date" });
    const client = createGitHubAppClient({
      appId: 123,
      privateKey: "key",
      auth: authSpy,
      now: () => 0,
      createOctokit: () => ({}) as never,
    });

    await expect(client.getInstallationAccessToken(1)).rejects.toThrow(/invalid expiresAt/);
  });
});
