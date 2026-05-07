import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "fpa_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const OAUTH_STATE_COOKIE_NAME = "oauth_state";
export const OAUTH_STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60;
export const OAUTH_RETURN_TO_COOKIE_NAME = "oauth_return_to";
export const OAUTH_RETURN_TO_COOKIE_MAX_AGE_SECONDS = 10 * 60;

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
  expires?: Date;
};

export type OAuthStateCookie = {
  name: typeof OAUTH_STATE_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  expires?: Date;
};

export type OAuthReturnToCookie = {
  name: typeof OAUTH_RETURN_TO_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  expires?: Date;
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
    expires: new Date(0),
  };
}

export function buildOAuthStateCookie(state: string): OAuthStateCookie {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  };
}

export function buildClearedOAuthStateCookie(): OAuthStateCookie {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

function hasUnsafePathSegment(rawPath: string): boolean {
  if (rawPath.includes("\\")) return true;

  for (const segment of rawPath.split("/")) {
    let decoded = segment;
    for (let i = 0; i < 2; i += 1) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        return true;
      }
    }
    if (decoded === "." || decoded === "..") return true;
  }

  return false;
}

export function normalizeSafeReturnTo(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;

  const rawPath = trimmed.split(/[?#]/, 1)[0] ?? "";
  if (hasUnsafePathSegment(rawPath)) return null;

  try {
    const base = new URL("http://tally.local");
    const parsed = new URL(trimmed, base);
    if (parsed.origin !== base.origin) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function buildOAuthReturnToCookie(returnTo: string): OAuthReturnToCookie {
  return {
    name: OAUTH_RETURN_TO_COOKIE_NAME,
    value: returnTo,
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_RETURN_TO_COOKIE_MAX_AGE_SECONDS,
  };
}

export function buildClearedOAuthReturnToCookie(): OAuthReturnToCookie {
  return {
    name: OAUTH_RETURN_TO_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
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

export function getOAuthReturnToFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  return normalizeSafeReturnTo(cookies[OAUTH_RETURN_TO_COOKIE_NAME]);
}
