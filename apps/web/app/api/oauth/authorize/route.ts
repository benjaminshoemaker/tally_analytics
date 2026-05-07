import { validateSession } from "../../../../lib/auth/session";
import { createAuthorizationCode } from "../../../../lib/oauth/codes";
import { getOAuthClient } from "../../../../lib/oauth/clients";
import {
  assertValidPkce,
  isRedirectUriRegistered,
  normalizeOAuthScope,
  validateResourceUrl,
} from "../../../../lib/oauth/validation";

function redirectWithParams(redirectUri: string, params: Record<string, string>): Response {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return Response.redirect(url.toString(), 302);
}

function authorizeReturnPath(requestUrl: URL): string {
  return `${requestUrl.pathname}${requestUrl.search}`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const responseType = url.searchParams.get("response_type") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const resource = url.searchParams.get("resource") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "";

  const client = clientId ? await getOAuthClient(clientId) : null;
  if (!client || !redirectUri || !isRedirectUriRegistered({ redirectUri, registeredRedirectUris: client.redirectUris })) {
    return Response.json({ error: "invalid_client" }, { status: 400 });
  }

  if (responseType !== "code") {
    return redirectWithParams(redirectUri, { error: "unsupported_response_type", state });
  }

  let scope: string;
  let normalizedResource: string;
  try {
    scope = normalizeOAuthScope(url.searchParams.get("scope"));
    normalizedResource = validateResourceUrl(resource);
    assertValidPkce({ codeChallenge, codeChallengeMethod });
  } catch (error) {
    return redirectWithParams(redirectUri, {
      error: "invalid_request",
      error_description: error instanceof Error ? error.message : "Invalid authorization request",
      state,
    });
  }

  const session = await validateSession(request);
  if (!session) {
    const loginUrl = new URL("/api/auth/github", url.origin);
    loginUrl.searchParams.set("return_to", authorizeReturnPath(url));
    return Response.redirect(loginUrl.toString(), 302);
  }

  const authorizationCode = await createAuthorizationCode({
    clientId,
    userId: session.userId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    resource: normalizedResource,
  });

  return redirectWithParams(redirectUri, { code: authorizationCode.code, state });
}
