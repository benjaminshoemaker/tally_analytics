import { registerOAuthClient } from "../../../../lib/oauth/clients";

type RegisterRequestBody = {
  redirect_uris?: unknown;
  client_name?: unknown;
  scope?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
};

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry) => typeof entry === "string")) return null;
  return value;
}

export async function POST(request: Request): Promise<Response> {
  let body: RegisterRequestBody;
  try {
    body = (await request.json()) as RegisterRequestBody;
  } catch {
    return Response.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const redirectUris = stringArray(body.redirect_uris);
  if (!redirectUris) return Response.json({ error: "invalid_client_metadata" }, { status: 400 });

  try {
    const registered = await registerOAuthClient({
      redirectUris,
      clientName: typeof body.client_name === "string" ? body.client_name : null,
      scope: typeof body.scope === "string" ? body.scope : null,
      grantTypes: stringArray(body.grant_types) ?? null,
      responseTypes: stringArray(body.response_types) ?? null,
    });

    return Response.json(
      {
        client_id: registered.clientId,
        client_id_issued_at: registered.clientIdIssuedAt,
        redirect_uris: registered.redirectUris,
        grant_types: registered.grantTypes,
        response_types: registered.responseTypes,
        scope: registered.scope,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: error instanceof Error ? error.message : undefined },
      { status: 400 },
    );
  }
}
