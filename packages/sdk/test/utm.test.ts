import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { captureUTMParams, UTMParams } from "../src/utm";

function installWindow(url: string) {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        href: url,
        search: new URL(url).search,
      },
    },
    configurable: true,
  });
}

describe("Task 1.1.D - UTM Parameter Capture", () => {
  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.window;
  });

  it("captureUTMParams returns object with optional utm_source, utm_medium, utm_campaign, utm_term, utm_content", () => {
    installWindow("https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=shoes&utm_content=banner");

    const result = captureUTMParams();

    expect(result.utm_source).toBe("google");
    expect(result.utm_medium).toBe("cpc");
    expect(result.utm_campaign).toBe("summer");
    expect(result.utm_term).toBe("shoes");
    expect(result.utm_content).toBe("banner");
  });

  it("parses parameters from current URL query string", () => {
    installWindow("https://example.com/page?utm_source=facebook&utm_medium=social");

    const result = captureUTMParams();

    expect(result.utm_source).toBe("facebook");
    expect(result.utm_medium).toBe("social");
    expect(result.utm_campaign).toBeUndefined();
  });

  it("truncates each value to 100 characters maximum", () => {
    const longValue = "a".repeat(150);
    installWindow(`https://example.com/?utm_source=${longValue}&utm_medium=short`);

    const result = captureUTMParams();

    expect(result.utm_source).toBe("a".repeat(100));
    expect(result.utm_source?.length).toBe(100);
    expect(result.utm_medium).toBe("short");
  });

  it("returns empty object if no UTM params present", () => {
    installWindow("https://example.com/page?other=value&foo=bar");

    const result = captureUTMParams();

    expect(result).toEqual({});
    expect(result.utm_source).toBeUndefined();
    expect(result.utm_medium).toBeUndefined();
    expect(result.utm_campaign).toBeUndefined();
    expect(result.utm_term).toBeUndefined();
    expect(result.utm_content).toBeUndefined();
  });

  it("handles SSR gracefully (returns empty object when window undefined)", () => {
    // Ensure window is not defined
    // @ts-expect-error testing undefined
    delete globalThis.window;

    const result = captureUTMParams();

    expect(result).toEqual({});
  });

  it("handles URL without query string", () => {
    installWindow("https://example.com/page");

    const result = captureUTMParams();

    expect(result).toEqual({});
  });

  it("handles partial UTM params", () => {
    installWindow("https://example.com/?utm_source=newsletter");

    const result = captureUTMParams();

    expect(result.utm_source).toBe("newsletter");
    expect(result.utm_medium).toBeUndefined();
    expect(result.utm_campaign).toBeUndefined();
  });

  it("decodes URL-encoded values", () => {
    installWindow("https://example.com/?utm_source=google&utm_campaign=summer%20sale%202025");

    const result = captureUTMParams();

    expect(result.utm_campaign).toBe("summer sale 2025");
  });

  it("handles empty UTM values gracefully", () => {
    installWindow("https://example.com/?utm_source=&utm_medium=cpc");

    const result = captureUTMParams();

    // Empty string is falsy, so it should be excluded
    expect(result.utm_source).toBeUndefined();
    expect(result.utm_medium).toBe("cpc");
  });
});
