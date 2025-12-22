import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "fpa_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function setSessionCookie(sessionId: string): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (!rawName) continue;
    const rawValue = rawValueParts.join("=");
    parsed[rawName] = decodeURIComponent(rawValue ?? "");
  }
  return parsed;
}

export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  const value = cookies[SESSION_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : null;
}

