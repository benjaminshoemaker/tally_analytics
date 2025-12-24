import { describe, expect, it, vi } from "vitest";

import { getOrCreateSessionId } from "../src/session";

function installCookieDocument() {
  const jar = new Map<string, string>();

  Object.defineProperty(globalThis, "document", {
    value: {
      get cookie() {
        return Array.from(jar.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join("; ");
      },
      set cookie(value: string) {
        const [pair] = value.split(";");
        const [name, cookieValue] = pair.split("=");
        jar.set(name.trim(), (cookieValue ?? "").trim());
      },
    },
    configurable: true,
  });

  return {
    get(name: string) {
      return jar.get(name);
    },
  };
}

describe("Task 3.2.A - Session management", () => {
  it("generates a UUID session ID", () => {
    const cookieJar = installCookieDocument();
    const uuid = "11111111-1111-4111-8111-111111111111";

    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);
    const sessionId = getOrCreateSessionId();
    spy.mockRestore();

    expect(sessionId).toBe(uuid);
    expect(cookieJar.get("fpa_sid")).toBeTruthy();
  });

  it("stores session in a first-party cookie", () => {
    const cookieJar = installCookieDocument();
    const uuid = "22222222-2222-4222-8222-222222222222";

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);
    getOrCreateSessionId();

    const raw = cookieJar.get("fpa_sid");
    expect(raw).toBeTruthy();
    expect(decodeURIComponent(raw!)).toContain(uuid);
  });

  it("reuses the same session within 30 minutes of inactivity", () => {
    installCookieDocument();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "33333333-3333-4333-8333-333333333333",
    );

    const s1 = getOrCreateSessionId();

    vi.setSystemTime(new Date("2025-01-01T00:29:00.000Z"));
    const s2 = getOrCreateSessionId();

    expect(s2).toBe(s1);

    vi.useRealTimers();
  });

  it("creates a new session after 30 minutes of inactivity", () => {
    installCookieDocument();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const uuid1 = "44444444-4444-4444-8444-444444444444";
    const uuid2 = "55555555-5555-4555-8555-555555555555";
    const spy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce(uuid1)
      .mockReturnValueOnce(uuid2);

    const s1 = getOrCreateSessionId();
    vi.setSystemTime(new Date("2025-01-01T00:31:00.000Z"));
    const s2 = getOrCreateSessionId();

    expect(s1).toBe(uuid1);
    expect(s2).toBe(uuid2);

    spy.mockRestore();
    vi.useRealTimers();
  });
});

