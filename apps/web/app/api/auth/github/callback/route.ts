import { NextResponse } from "next/server";

import { buildClearedOAuthStateCookie, buildSessionCookie, OAUTH_STATE_COOKIE_NAME } from "../../../../../lib/auth/cookies";
import { exchangeCodeForToken, fetchGitHubUser, fetchGitHubUserEmail } from "../../../../../lib/auth/github-oauth";
import { createSession } from "../../../../../lib/auth/session";
import { findOrCreateUserByGitHub } from "../../../../../lib/db/queries/users";

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName !== name) continue;
    return decodeURIComponent(rawValueParts.join("="));
  }

  return null;
}

function redirectToLogin(request: Request, error: "oauth_cancelled" | "invalid_state" | "github_error"): Response {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 302 });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const error = url.searchParams.get("error");
  if (error === "access_denied") {
    return redirectToLogin(request, "oauth_cancelled");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return redirectToLogin(request, "invalid_state");
  }

  const stateCookie = getCookieValue(request, OAUTH_STATE_COOKIE_NAME);
  if (!stateCookie || stateCookie !== state) {
    return redirectToLogin(request, "invalid_state");
  }

  try {
    const token = await exchangeCodeForToken(code);
    const gitHubUser = await fetchGitHubUser(token);
    const email = await fetchGitHubUserEmail(token);

    const user = await findOrCreateUserByGitHub({
      githubUserId: BigInt(gitHubUser.id),
      githubUsername: gitHubUser.login,
      githubAvatarUrl: gitHubUser.avatar_url,
      email,
    });

    const session = await createSession(user.id);

    const response = NextResponse.redirect(new URL("/projects", request.url), { status: 302 });
    response.cookies.set(buildSessionCookie(session.id));
    response.cookies.set(buildClearedOAuthStateCookie());
    return response;
  } catch {
    return redirectToLogin(request, "github_error");
  }
}

