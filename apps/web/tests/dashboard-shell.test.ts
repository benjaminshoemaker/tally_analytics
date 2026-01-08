import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let redirectSpy: ReturnType<typeof vi.fn> | undefined;
let getUserFromSessionSpy: ReturnType<typeof vi.fn> | undefined;
let getUserByIdSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    if (!redirectSpy) throw new Error("redirectSpy not initialized");
    return redirectSpy(...args);
  },
  usePathname: () => "/projects",
}));

vi.mock("../lib/auth/get-user", () => ({
  getUserFromSession: (...args: unknown[]) => {
    if (!getUserFromSessionSpy) throw new Error("getUserFromSessionSpy not initialized");
    return getUserFromSessionSpy(...args);
  },
}));

vi.mock("../lib/db/queries/users", () => ({
  getUserById: (...args: unknown[]) => {
    if (!getUserByIdSpy) throw new Error("getUserByIdSpy not initialized");
    return getUserByIdSpy(...args);
  },
}));

describe("dashboard shell layout", () => {
  it("renders navigation and passes user info to the header", async () => {
    vi.resetModules();
    redirectSpy = vi.fn();
    getUserFromSessionSpy = vi.fn().mockResolvedValue({ id: "u1", email: "test@example.com" });
    getUserByIdSpy = vi.fn().mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      githubUsername: "emriedel",
      githubAvatarUrl: "https://example/avatar.png",
    });

    const { default: DashboardLayout } = await import("../app/(dashboard)/layout");
    const element = await DashboardLayout({ children: React.createElement("div", null, "Hello dashboard") });
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("Projects");
    expect(html).toContain('href="/projects"');
    expect(html).toContain("Settings");
    expect(html).toContain('href="/settings"');
    expect(html).toContain("user-dropdown-trigger");
    expect(html).toContain("emriedel");
    expect(html).toContain("Hello dashboard");
  });

  it("falls back to email when githubUsername is null", async () => {
    vi.resetModules();
    redirectSpy = vi.fn();
    getUserFromSessionSpy = vi.fn().mockResolvedValue({ id: "u1", email: "test@example.com" });
    getUserByIdSpy = vi.fn().mockResolvedValue({
      id: "u1",
      email: "test@example.com",
      githubUsername: null,
      githubAvatarUrl: null,
    });

    const { default: DashboardLayout } = await import("../app/(dashboard)/layout");
    const element = await DashboardLayout({ children: React.createElement("div", null, "Child") });
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("test@example.com");
  });

  it("redirects to /login when there is no session user", async () => {
    vi.resetModules();
    redirectSpy = vi.fn();
    getUserFromSessionSpy = vi.fn().mockResolvedValue(null);
    getUserByIdSpy = vi.fn();

    const { default: DashboardLayout } = await import("../app/(dashboard)/layout");
    await DashboardLayout({ children: React.createElement("div", null, "Child") });
    expect(redirectSpy).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the session user record is missing", async () => {
    vi.resetModules();
    redirectSpy = vi.fn();
    getUserFromSessionSpy = vi.fn().mockResolvedValue({ id: "u1", email: "test@example.com" });
    getUserByIdSpy = vi.fn().mockResolvedValue(null);

    const { default: DashboardLayout } = await import("../app/(dashboard)/layout");
    await DashboardLayout({ children: React.createElement("div", null, "Child") });
    expect(redirectSpy).toHaveBeenCalledWith("/login");
  });
});
