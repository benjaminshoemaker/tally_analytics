import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "./lib/auth/get-user";

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.delete("token");
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname;
  const user = await getUserFromRequest(request);

  if (user) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return redirectToLogin(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/projects/:path*"],
};

