import crypto from "node:crypto";

import { readRequiredEnv } from "../env/read-required-env";

export type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildGitHubAuthUrl(state: string): string {
  const clientId = readRequiredEnv("GITHUB_OAUTH_CLIENT_ID");
  const appUrl = readRequiredEnv("NEXT_PUBLIC_APP_URL");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: new URL("/api/auth/github/callback", appUrl).toString(),
    scope: "read:user user:email",
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = readRequiredEnv("GITHUB_OAUTH_CLIENT_ID");
  const clientSecret = readRequiredEnv("GITHUB_OAUTH_CLIENT_SECRET");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as
    | { access_token?: string; token_type?: string; scope?: string }
    | { error: string; error_description?: string; error_uri?: string };

  if ("error" in data) {
    throw new Error(`GitHub OAuth error: ${data.error_description ?? data.error}`);
  }

  if (!data.access_token) {
    throw new Error("GitHub token exchange failed: missing access_token");
  }

  return data.access_token;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub user fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as GitHubUser;
  return data;
}

export async function fetchGitHubUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub email fetch failed: ${response.status}`);
  }

  const emails = (await response.json()) as GitHubEmail[];
  const primaryVerified = emails.find((email) => email.primary && email.verified);
  if (primaryVerified) return primaryVerified.email;

  const anyVerified = emails.find((email) => email.verified);
  if (anyVerified) return anyVerified.email;

  throw new Error("No verified email found on GitHub account");
}

