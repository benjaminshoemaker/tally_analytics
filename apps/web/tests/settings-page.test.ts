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

describe("/settings page", () => {
  it("renders email, plan, and a logout form", async () => {
    vi.resetModules();

    cookieGetSpy = vi.fn().mockReturnValue({ value: "sess_123" });

    const sessionWhereSpy = vi.fn().mockResolvedValue([{ userId: "u1", expiresAt: new Date("2030-01-01T00:00:00.000Z") }]);
    const sessionFromSpy = vi.fn(() => ({ where: sessionWhereSpy }));

    const userWhereSpy = vi.fn().mockResolvedValue([{ email: "u1@example.com", plan: "free" }]);
    const userFromSpy = vi.fn(() => ({ where: userWhereSpy }));

    selectSpy = vi
      .fn()
      .mockImplementationOnce(() => ({ from: sessionFromSpy }))
      .mockImplementationOnce(() => ({ from: userFromSpy }));

    const { default: SettingsPage } = await import("../app/(dashboard)/settings/page");

    const element = await SettingsPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Account settings");
    expect(html).toContain("u1@example.com");
    expect(html).toContain("free");
    expect(html).toContain('action="/api/auth/logout"');
  });
});

