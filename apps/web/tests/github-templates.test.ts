import { describe, expect, it } from "vitest";

describe("github templates", () => {
  it("renders an App Router analytics component with required features", async () => {
    const { renderAppRouterAnalyticsComponent } = await import("../lib/github/templates/app-router");
    const code = renderAppRouterAnalyticsComponent({ projectId: "proj_123", eventsUrl: "https://events.example.com" });

    expect(code).toContain("'use client'");
    expect(code).toContain("export function FastPrAnalytics()");
    expect(code).toContain("usePathname");
    expect(code).toContain("useSearchParams");
    expect(code).toContain("event_type: 'session_start'");
    expect(code).toContain("event_type: 'page_view'");
    expect(code).toContain("navigator.doNotTrack === '1'");
    expect(code).toContain("const PROJECT_ID = 'proj_123'");
  });

  it("renders a Pages Router analytics hook with required features", async () => {
    const { renderPagesRouterAnalyticsHook } = await import("../lib/github/templates/pages-router");
    const code = renderPagesRouterAnalyticsHook({ projectId: "proj_123", eventsUrl: "https://events.example.com" });

    expect(code).toContain("useRouter");
    expect(code).toContain("export function useFastPrAnalytics()");
    expect(code).toContain("routeChangeComplete");
    expect(code).toContain("return () =>");
    expect(code).toContain("event_type: 'session_start'");
    expect(code).toContain("event_type: 'page_view'");
    expect(code).toContain("navigator.doNotTrack === '1'");
  });
});
