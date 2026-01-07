import { NextResponse } from "next/server";

import { buildOAuthStateCookie } from "../../../../lib/auth/cookies";
import { buildGitHubAuthUrl, generateOAuthState } from "../../../../lib/auth/github-oauth";

export async function GET(): Promise<Response> {
  const state = generateOAuthState();
  const url = buildGitHubAuthUrl(state);

  const response = NextResponse.redirect(url, { status: 302 });
  response.cookies.set(buildOAuthStateCookie(state));
  return response;
}

