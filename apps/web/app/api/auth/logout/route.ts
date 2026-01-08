import { NextResponse } from "next/server";

import { buildClearedSessionCookie, getSessionIdFromRequest } from "../../../../lib/auth/cookies";
import { destroySession } from "../../../../lib/auth/session";

export async function POST(request: Request): Promise<Response> {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId) {
    await destroySession(sessionId);
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(buildClearedSessionCookie());
  return response;
}
