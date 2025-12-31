import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let cookieGetSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (...args: unknown[]) => {
      if (!cookieGetSpy) throw new Error("cookieGetSpy not initialized");
      return cookieGetSpy(...args);
    },
  }),
}));

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
  },
}));

describe("marketing pricing page", () => {
  it("renders Free, Pro, and Team tiers with event limits", async () => {
    vi.resetModules();

    cookieGetSpy = vi.fn().mockReturnValue(null);
    selectSpy = vi.fn();

    const { default: PricingPage } = await import("../app/(marketing)/pricing/page");
    const element = await PricingPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Team");

    expect(html).toContain("10,000 events/mo");
    expect(html).toContain("100,000 events/mo");
    expect(html).toContain("1,000,000 events/mo");
  });

  it("renders a feature comparison section", async () => {
    vi.resetModules();
    cookieGetSpy = vi.fn().mockReturnValue(null);
    selectSpy = vi.fn();

    const { default: PricingPage } = await import("../app/(marketing)/pricing/page");
    const element = await PricingPage();
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Compare plans");
    expect(html).toContain("Projects");
    expect(html).toContain("Retention");
    expect(html).toContain("Support");
  });

  it("renders checkout CTAs when a free user is logged in", async () => {
    vi.resetModules();

    cookieGetSpy = vi.fn().mockReturnValue({ value: "sess_123" });

    const sessionWhereSpy = vi.fn().mockResolvedValue([{ userId: "u1", expiresAt: new Date("2030-01-01T00:00:00.000Z") }]);
    const sessionFromSpy = vi.fn(() => ({ where: sessionWhereSpy }));

    const userWhereSpy = vi.fn().mockResolvedValue([{ plan: "free" }]);
    const userFromSpy = vi.fn(() => ({ where: userWhereSpy }));

    selectSpy = vi
      .fn()
      .mockImplementationOnce(() => ({ from: sessionFromSpy }))
      .mockImplementationOnce(() => ({ from: userFromSpy }));

    const { default: PricingPage } = await import("../app/(marketing)/pricing/page");
    const element = await PricingPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('action="/api/stripe/checkout"');
  });
});
