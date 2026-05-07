import { NextResponse } from "next/server";

import {
  buildClearedOAuthReturnToCookie,
  buildOAuthReturnToCookie,
  buildOAuthStateCookie,
  normalizeSafeReturnTo,
} from "../../../../lib/auth/cookies";
import { buildGitHubAuthUrl, generateOAuthState } from "../../../../lib/auth/github-oauth";

export async function GET(request: Request): Promise<Response> {
  const state = generateOAuthState();
  const url = buildGitHubAuthUrl(state);
  const returnTo = normalizeSafeReturnTo(new URL(request.url).searchParams.get("return_to"));

  const response = NextResponse.redirect(url, { status: 302 });
  response.cookies.set(buildOAuthStateCookie(state));
  response.cookies.set(returnTo ? buildOAuthReturnToCookie(returnTo) : buildClearedOAuthReturnToCookie());
  return response;
}
