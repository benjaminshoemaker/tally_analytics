import { consumeAuthorizationCode } from "../../../../lib/oauth/codes";
import { createOAuthTokenPair, rotateRefreshToken } from "../../../../lib/oauth/tokens";

function oauthError(error: string, status = 400, description?: string): Response {
  return Response.json({ error, error_description: description }, { status });
}

function tokenResponse(pair: {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  scope: string;
}): Response {
  return Response.json({
    access_token: pair.accessToken,
    token_type: pair.tokenType,
    expires_in: pair.expiresIn,
    scope: pair.scope,
    refresh_token: pair.refreshToken,
  });
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const grantType = String(form.get("grant_type") ?? "");
  const clientId = String(form.get("client_id") ?? "");

  if (!clientId) return oauthError("invalid_client", 401);

  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const codeVerifier = String(form.get("code_verifier") ?? "");
    if (!code || !redirectUri || !codeVerifier) return oauthError("invalid_request");

    const consumed = await consumeAuthorizationCode({ code, clientId, redirectUri, codeVerifier });
    if (!consumed) return oauthError("invalid_grant");

    const resource = String(form.get("resource") ?? consumed.resource);
    if (resource !== consumed.resource) return oauthError("invalid_target");

    const pair = await createOAuthTokenPair({
      clientId,
      userId: consumed.userId,
      scope: consumed.scope,
      resource: consumed.resource,
    });

    return tokenResponse(pair);
  }

  if (grantType === "refresh_token") {
    const refreshToken = String(form.get("refresh_token") ?? "");
    if (!refreshToken) return oauthError("invalid_request");

    const pair = await rotateRefreshToken({ refreshToken, clientId });
    if (!pair) return oauthError("invalid_grant");
    return tokenResponse(pair);
  }

  return oauthError("unsupported_grant_type");
}
