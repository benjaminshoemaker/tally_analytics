import { metadataCorsHeaders, protectedResourceMetadata } from "../../../lib/oauth/metadata";

export function GET(): Response {
  return Response.json(protectedResourceMetadata(), { headers: metadataCorsHeaders() });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: metadataCorsHeaders() });
}
