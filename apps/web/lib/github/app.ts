import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

export type GitHubAuth =
  | { type: "app" }
  | {
      type: "installation";
      installationId: number;
    };

export type GitHubAuthResponse =
  | { token: string }
  | {
      token: string;
      expiresAt: string;
    };

export type GitHubAuthFn = (auth: GitHubAuth) => Promise<GitHubAuthResponse>;

export type GitHubInstallationAccessToken = {
  token: string;
  expiresAt: string;
};

export type CreateOctokitFn<TOctokit = Octokit> = (options: { auth: string }) => TOctokit;

export type GitHubAppClient<TOctokit = Octokit> = {
  getAppJwt: () => Promise<string>;
  getInstallationAccessToken: (installationId: number) => Promise<GitHubInstallationAccessToken>;
  getInstallationOctokit: (installationId: number) => Promise<TOctokit>;
};

const INSTALLATION_TOKEN_REFRESH_SKEW_MS = 60_000;

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;

  throw new Error(
    `Missing required environment variable: ${name}. Set it in apps/web/.env.local for local dev, or in your Vercel project environment variables.`,
  );
}

function readGitHubAppConfigFromEnv(): { appId: number; privateKey: string } {
  const appIdRaw = readRequiredEnv("GITHUB_APP_ID");
  const appId = Number(appIdRaw);
  if (!Number.isFinite(appId) || appId <= 0) {
    throw new Error(`Invalid GITHUB_APP_ID: expected a positive number, got ${JSON.stringify(appIdRaw)}`);
  }

  const privateKey = readRequiredEnv("GITHUB_APP_PRIVATE_KEY").replaceAll("\\n", "\n");
  return { appId, privateKey };
}

function createDefaultAuth(appId: number, privateKey: string): GitHubAuthFn {
  const app = new App({ appId, privateKey, Octokit });
  return (auth) => app.octokit.auth(auth as never) as Promise<GitHubAuthResponse>;
}

export function createGitHubAppClient<TOctokit = Octokit>(options: {
  appId: number;
  privateKey: string;
  auth?: GitHubAuthFn;
  now?: () => number;
  createOctokit?: CreateOctokitFn<TOctokit>;
}): GitHubAppClient<TOctokit> {
  const auth = options.auth ?? createDefaultAuth(options.appId, options.privateKey);
  const now = options.now ?? (() => Date.now());
  const createOctokit: CreateOctokitFn<TOctokit> = options.createOctokit ?? ((o) => new Octokit(o) as never);

  const installationTokenCache = new Map<number, GitHubInstallationAccessToken & { expiresAtMs: number }>();

  async function getAppJwt(): Promise<string> {
    const result = await auth({ type: "app" });
    return result.token;
  }

  async function getInstallationAccessToken(installationId: number): Promise<GitHubInstallationAccessToken> {
    const cached = installationTokenCache.get(installationId);
    if (cached && cached.expiresAtMs - now() >= INSTALLATION_TOKEN_REFRESH_SKEW_MS) {
      return { token: cached.token, expiresAt: cached.expiresAt };
    }

    const result = await auth({ type: "installation", installationId });
    if (!("expiresAt" in result)) {
      throw new Error("Invalid GitHub installation auth response: missing expiresAt");
    }

    const expiresAtMs = Date.parse(result.expiresAt);
    if (!Number.isFinite(expiresAtMs)) {
      throw new Error(`Invalid GitHub installation auth response: invalid expiresAt ${JSON.stringify(result.expiresAt)}`);
    }

    const token = { token: result.token, expiresAt: result.expiresAt, expiresAtMs };
    installationTokenCache.set(installationId, token);
    return { token: token.token, expiresAt: token.expiresAt };
  }

  async function getInstallationOctokit(installationId: number): Promise<TOctokit> {
    const { token } = await getInstallationAccessToken(installationId);
    return createOctokit({ auth: token });
  }

  return { getAppJwt, getInstallationAccessToken, getInstallationOctokit };
}

let singleton: GitHubAppClient | null = null;

function getSingleton(): GitHubAppClient {
  if (singleton) return singleton;
  const { appId, privateKey } = readGitHubAppConfigFromEnv();
  singleton = createGitHubAppClient({ appId, privateKey });
  return singleton;
}

export function __testOnly_clearGitHubAppClient(): void {
  singleton = null;
}

export async function getAppJwt(): Promise<string> {
  return getSingleton().getAppJwt();
}

export async function getInstallationAccessToken(installationId: number): Promise<GitHubInstallationAccessToken> {
  return getSingleton().getInstallationAccessToken(installationId);
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  return getSingleton().getInstallationOctokit(installationId);
}
