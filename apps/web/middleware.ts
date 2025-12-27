import { NextRequest, NextResponse } from "next/server";

import { getSessionIdFromRequest } from "./lib/auth/cookies";

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.delete("token");
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname;
  const sessionId = getSessionIdFromRequest(request);

  if (sessionId) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return redirectToLogin(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*", "/api/projects/:path*"],
};
