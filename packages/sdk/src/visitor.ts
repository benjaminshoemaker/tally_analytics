const VISITOR_COOKIE_NAME = "tally_vid";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

export interface VisitorIdResult {
  visitorId: string;
  isReturning: boolean;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix))
    ?.slice(prefix.length);

  return cookie ?? null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;

  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${name}=${value}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax${secure}`;
}

export function getOrCreateVisitorId(): VisitorIdResult | null {
  // SSR guard
  if (typeof document === "undefined") {
    return null;
  }

  const existingId = getCookie(VISITOR_COOKIE_NAME);

  if (existingId) {
    return {
      visitorId: existingId,
      isReturning: true,
    };
  }

  const visitorId = crypto.randomUUID();
  setCookie(VISITOR_COOKIE_NAME, visitorId);

  return {
    visitorId,
    isReturning: false,
  };
}
