const SESSION_COOKIE_NAME = "fpa_sid";
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

type StoredSession = {
  sessionId: string;
  lastActivity: number;
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix))
    ?.slice(prefix.length);

  return cookie ? cookie : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;

  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; secure"
      : "";

  document.cookie = `${name}=${value}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; samesite=lax${secure}`;
}

function readStoredSession(rawCookieValue: string): StoredSession | null {
  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed = JSON.parse(decoded) as Partial<StoredSession>;
    if (!parsed.sessionId || typeof parsed.lastActivity !== "number") return null;
    return { sessionId: parsed.sessionId, lastActivity: parsed.lastActivity };
  } catch {
    return null;
  }
}

export function getOrCreateSessionId(): string {
  if (typeof document === "undefined") return "";

  const now = Date.now();
  const existing = getCookie(SESSION_COOKIE_NAME);

  if (existing) {
    const stored = readStoredSession(existing);
    if (stored) {
      const elapsed = now - stored.lastActivity;
      if (elapsed < SESSION_DURATION_MS) {
        setCookie(
          SESSION_COOKIE_NAME,
          encodeURIComponent(
            JSON.stringify({ sessionId: stored.sessionId, lastActivity: now }),
          ),
        );
        return stored.sessionId;
      }
    }
  }

  const sessionId = crypto.randomUUID();
  setCookie(
    SESSION_COOKIE_NAME,
    encodeURIComponent(JSON.stringify({ sessionId, lastActivity: now })),
  );
  return sessionId;
}

