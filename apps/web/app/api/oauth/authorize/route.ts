import { validateSession } from "../../../../lib/auth/session";
import { getUserById } from "../../../../lib/db/queries/users";
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

const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostnameFromHostHeader(hostHeader: string | null): string | null {
  if (!hostHeader) return null;

  try {
    return new URL(`http://${hostHeader}`).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return null;
  }
}

async function resolveE2EAutoAuthorizeUserId(request: Request): Promise<
  | { status: "disabled" }
  | { status: "forbidden"; reason: string }
  | { status: "authorized"; userId: string }
> {
  if (process.env.E2E_TEST_MODE !== "1") return { status: "disabled" };
  if (process.env.NODE_ENV === "production") return { status: "forbidden", reason: "production" };

  const hostname = hostnameFromHostHeader(request.headers.get("host"));
  if (!hostname || !LOCALHOSTS.has(hostname)) {
    return { status: "forbidden", reason: "non_localhost_host" };
  }

  const userId = process.env.E2E_MCP_AUTH_USER_ID;
  if (!userId) return { status: "forbidden", reason: "missing_user_id" };

  try {
    const user = await getUserById(userId);
    if (!user) return { status: "forbidden", reason: "unknown_user_id" };
  } catch {
    return { status: "forbidden", reason: "user_lookup_failed" };
  }

  return { status: "authorized", userId };
}

function e2eForbidden(reason: string): Response {
  console.warn("MCP OAuth E2E auto-authorize blocked", { reason });
  return Response.json({ error: "e2e_auto_authorize_forbidden" }, { status: 403 });
}

async function createCodeRedirect(params: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  resource: string;
  state: string;
}): Promise<Response> {
  const authorizationCode = await createAuthorizationCode({
    clientId: params.clientId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    scope: params.scope,
    resource: params.resource,
  });

  return redirectWithParams(params.redirectUri, { code: authorizationCode.code, state: params.state });
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

  const e2eAutoAuthorize = await resolveE2EAutoAuthorizeUserId(request);
  if (e2eAutoAuthorize.status === "forbidden") {
    return e2eForbidden(e2eAutoAuthorize.reason);
  }
  if (e2eAutoAuthorize.status === "authorized") {
    return createCodeRedirect({
      clientId,
      userId: e2eAutoAuthorize.userId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
      resource: normalizedResource,
      state,
    });
  }

  const session = await validateSession(request);
  if (!session) {
    const loginUrl = new URL("/api/auth/github", url.origin);
    loginUrl.searchParams.set("return_to", authorizeReturnPath(url));
    return Response.redirect(loginUrl.toString(), 302);
  }

  return createCodeRedirect({
    clientId,
    userId: session.userId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    resource: normalizedResource,
    state,
  });
}
