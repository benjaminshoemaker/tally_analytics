import { describe, expect, it, vi, beforeEach } from "vitest";

import { getOrCreateVisitorId } from "../src/visitor";

function installCookieDocument(options: { isHttps?: boolean } = {}) {
  const jar = new Map<string, string>();
  const isHttps = options.isHttps ?? true;

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

  Object.defineProperty(globalThis, "location", {
    value: {
      protocol: isHttps ? "https:" : "http:",
    },
    configurable: true,
  });

  return {
    get(name: string) {
      return jar.get(name);
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
    getRawCookie() {
      return (globalThis.document as any).cookie;
    },
    getCookieString(name: string): string | undefined {
      // Get the full cookie string that was set (for verifying attributes)
      return jar.get(name);
    },
  };
}

describe("Task 1.1.C - Visitor ID Manager", () => {
  beforeEach(() => {
    // Reset any existing document/location
    // @ts-expect-error testing cleanup
    delete globalThis.document;
    // @ts-expect-error testing cleanup
    delete globalThis.location;
  });

  it("getOrCreateVisitorId returns { visitorId: string; isReturning: boolean }", () => {
    const cookieJar = installCookieDocument();
    const uuid = "11111111-1111-4111-8111-111111111111";

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

    const result = getOrCreateVisitorId();

    expect(result).toHaveProperty("visitorId");
    expect(result).toHaveProperty("isReturning");
    expect(typeof result.visitorId).toBe("string");
    expect(typeof result.isReturning).toBe("boolean");
  });

  it("creates tally_vid cookie with UUID v4 value on first visit", () => {
    const cookieJar = installCookieDocument();
    const uuid = "22222222-2222-4222-8222-222222222222";

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

    const result = getOrCreateVisitorId();

    expect(result.visitorId).toBe(uuid);
    expect(result.isReturning).toBe(false);
    expect(cookieJar.get("tally_vid")).toBe(uuid);
  });

  it("cookie has 1-year max-age, path=/, SameSite=Lax, Secure on HTTPS", () => {
    // We need to capture the full cookie string that was set
    let setCookieString = "";

    Object.defineProperty(globalThis, "document", {
      value: {
        _cookie: "",
        get cookie() {
          return this._cookie;
        },
        set cookie(value: string) {
          setCookieString = value;
          const [pair] = value.split(";");
          const [name, cookieValue] = pair.split("=");
          this._cookie = `${name}=${cookieValue}`;
        },
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, "location", {
      value: {
        protocol: "https:",
      },
      configurable: true,
    });

    const uuid = "33333333-3333-4333-8333-333333333333";
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

    getOrCreateVisitorId();

    // Verify cookie attributes
    expect(setCookieString).toContain("tally_vid=" + uuid);
    expect(setCookieString).toContain("max-age=31536000"); // 1 year in seconds
    expect(setCookieString).toContain("path=/");
    expect(setCookieString.toLowerCase()).toContain("samesite=lax");
    expect(setCookieString.toLowerCase()).toContain("secure");
  });

  it("does not include Secure on HTTP", () => {
    let setCookieString = "";

    Object.defineProperty(globalThis, "document", {
      value: {
        _cookie: "",
        get cookie() {
          return this._cookie;
        },
        set cookie(value: string) {
          setCookieString = value;
          const [pair] = value.split(";");
          const [name, cookieValue] = pair.split("=");
          this._cookie = `${name}=${cookieValue}`;
        },
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, "location", {
      value: {
        protocol: "http:",
      },
      configurable: true,
    });

    const uuid = "44444444-4444-4444-8444-444444444444";
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

    getOrCreateVisitorId();

    expect(setCookieString.toLowerCase()).not.toContain("secure");
  });

  it("returns isReturning: true when cookie already exists", () => {
    const cookieJar = installCookieDocument();
    const existingId = "55555555-5555-4555-8555-555555555555";

    // Pre-set the cookie
    cookieJar.set("tally_vid", existingId);

    const result = getOrCreateVisitorId();

    expect(result.visitorId).toBe(existingId);
    expect(result.isReturning).toBe(true);
  });

  it("handles SSR gracefully (returns null when document undefined)", () => {
    // Ensure document is not defined
    // @ts-expect-error testing undefined
    delete globalThis.document;

    const result = getOrCreateVisitorId();

    expect(result).toBeNull();
  });

  it("preserves existing visitor ID across multiple calls", () => {
    const cookieJar = installCookieDocument();
    const uuid = "66666666-6666-4666-8666-666666666666";

    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

    const result1 = getOrCreateVisitorId();
    const result2 = getOrCreateVisitorId();

    expect(result1.visitorId).toBe(uuid);
    expect(result1.isReturning).toBe(false);

    expect(result2.visitorId).toBe(uuid);
    expect(result2.isReturning).toBe(true);

    // randomUUID should only be called once (for the first visit)
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
