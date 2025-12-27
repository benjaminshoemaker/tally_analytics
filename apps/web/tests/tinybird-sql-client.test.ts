import { describe, expect, it, vi } from "vitest";

import { tinybirdSql } from "../lib/tinybird/client";

describe("tinybirdSql()", () => {
  it("adds FORMAT JSON when missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    try {
      await tinybirdSql({ apiUrl: "https://api.example.tinybird.co", token: "tb_token" }, "SELECT 1");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as unknown as [
        string,
        { method: string; headers: Record<string, string>; body: URLSearchParams },
      ];

      expect(url).toBe("https://api.example.tinybird.co/v0/sql");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer tb_token");
      expect(init.headers["content-type"]).toBe("application/x-www-form-urlencoded");
      expect(init.body.get("q")).toContain("FORMAT JSON");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("does not double-append FORMAT when already present", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    try {
      await tinybirdSql(
        { apiUrl: "https://api.example.tinybird.co", token: "tb_token" },
        "SELECT 1 FORMAT JSON",
      );

      const [, init] = fetchSpy.mock.calls[0] as unknown as [
        string,
        { body: URLSearchParams },
      ];

      expect(init.body.get("q")?.match(/FORMAT JSON/gi)?.length).toBe(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("includes response status and error details on failure", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );

    try {
      await expect(
        tinybirdSql({ apiUrl: "https://api.example.tinybird.co", token: "tb_token" }, "SELECT 1"),
      ).rejects.toThrow(/Tinybird SQL request failed \(403\): Forbidden/);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
