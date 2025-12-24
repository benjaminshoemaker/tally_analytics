import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import Providers from "../lib/providers";
import { fetchProject } from "../lib/hooks/use-project";

describe("dashboard data fetching", () => {
  it("renders a React Query provider wrapper", () => {
    const html = renderToStaticMarkup(
      React.createElement(Providers, { children: React.createElement("div", null, "Hello") }),
    );
    expect(html).toContain("Hello");
  });

  it("fetchProject calls /api/projects/:id and returns JSON", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ project: { id: "proj_test" } }),
    } as unknown as Response);

    try {
      const result = await fetchProject("proj_test");
      expect(fetchSpy).toHaveBeenCalledWith("/api/projects/proj_test", expect.any(Object));
      expect(result).toEqual({ project: { id: "proj_test" } });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("fetchProject throws a helpful error on non-2xx responses", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as unknown as Response);

    try {
      await expect(fetchProject("proj_test")).rejects.toThrow("Unauthorized");
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

