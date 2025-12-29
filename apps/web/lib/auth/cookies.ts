import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "fpa_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function shouldUseSecureCookies(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true;

  try {
    return new URL(appUrl).protocol === "https:";
  } catch {
    return true;
  }
}

export type SessionCookie = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function buildSessionCookie(sessionId: string): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  };
}

export function buildClearedSessionCookie(): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

export function setSessionCookie(sessionId: string): void {
  cookies().set(buildSessionCookie(sessionId));
}

export function clearSessionCookie(): void {
  cookies().set(buildClearedSessionCookie());
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
