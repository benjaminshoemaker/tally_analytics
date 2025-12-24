import { describe, expect, it, vi } from "vitest";

let redirectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    if (!redirectSpy) throw new Error("redirectSpy not initialized");
    return redirectSpy(...args);
  },
}));

describe("/dashboard page", () => {
  it("redirects to /projects", async () => {
    vi.resetModules();
    redirectSpy = vi.fn();

    const { default: DashboardPage } = await import("../app/dashboard/page");
    DashboardPage();
    expect(redirectSpy).toHaveBeenCalledWith("/projects");
  });
});
