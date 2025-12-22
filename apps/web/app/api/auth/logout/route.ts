import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionIdFromRequest } from "../../../../lib/auth/cookies";
import { destroySession } from "../../../../lib/auth/session";

export async function POST(request: Request): Promise<Response> {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId) {
    await destroySession(sessionId);
  } else {
    clearSessionCookie();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

