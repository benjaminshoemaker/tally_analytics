import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("tinybird client", () => {
  let previousApiUrl: string | undefined;
  let previousToken: string | undefined;

  beforeEach(() => {
    previousApiUrl = process.env.TINYBIRD_API_URL;
    previousToken = process.env.TINYBIRD_ADMIN_TOKEN;
  });

  afterEach(() => {
    if (previousApiUrl === undefined) delete process.env.TINYBIRD_API_URL;
    else process.env.TINYBIRD_API_URL = previousApiUrl;
    if (previousToken === undefined) delete process.env.TINYBIRD_ADMIN_TOKEN;
    else process.env.TINYBIRD_ADMIN_TOKEN = previousToken;
    vi.restoreAllMocks();
  });

  describe("createTinybirdClientFromEnv", () => {
    it("creates a client from environment variables", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co/";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      const { createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      expect(client.apiUrl).toBe("https://api.tinybird.co");
      expect(client.token).toBe("p.token123");
    });

    it("strips trailing slashes from API URL", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co///";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      const { createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      expect(client.apiUrl).toBe("https://api.tinybird.co");
    });

    it("throws when TINYBIRD_API_URL is missing", async () => {
      vi.resetModules();
      delete process.env.TINYBIRD_API_URL;
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      const { createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      expect(() => createTinybirdClientFromEnv()).toThrow("Missing required environment variable: TINYBIRD_API_URL");
    });

    it("throws when TINYBIRD_ADMIN_TOKEN is missing", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      delete process.env.TINYBIRD_ADMIN_TOKEN;

      const { createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      expect(() => createTinybirdClientFromEnv()).toThrow("Missing required environment variable: TINYBIRD_ADMIN_TOKEN");
    });
  });

  describe("tinybirdPipe", () => {
    it("fetches data from a pipe endpoint", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      const mockResponse = { data: [{ count: 10 }, { count: 20 }] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const { tinybirdPipe, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();
      const result = await tinybirdPipe<{ count: number }>(client, "my_pipe", { projectId: "proj_123", limit: 10 });

      expect(result.data).toEqual([{ count: 10 }, { count: 20 }]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.tinybird.co/v0/pipes/my_pipe.json"),
        expect.objectContaining({
          headers: { Authorization: "Bearer p.token123" },
        }),
      );
    });

    it("includes query parameters in the URL", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      const { tinybirdPipe, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();
      await tinybirdPipe(client, "analytics", { projectId: "proj_123", limit: 50 });

      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("projectId=proj_123");
      expect(url).toContain("limit=50");
    });

    it("throws on non-ok response", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: "Bad request" })),
      });

      const { tinybirdPipe, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      await expect(tinybirdPipe(client, "my_pipe", {})).rejects.toThrow("Tinybird pipe request failed (400): Bad request");
    });

    it("throws when response is not valid JSON", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("not json"),
      });

      const { tinybirdPipe, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      await expect(tinybirdPipe(client, "my_pipe", {})).rejects.toThrow("Tinybird pipe request failed (200): not json");
    });

    it("throws when data is not an array", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ data: "not an array" })),
      });

      const { tinybirdPipe, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      await expect(tinybirdPipe(client, "my_pipe", {})).rejects.toThrow("Tinybird pipe request failed");
    });
  });

  describe("tinybirdSql", () => {
    it("executes a SQL query and returns data", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      const mockResponse = { data: [{ name: "page1", views: 100 }] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();
      const result = await tinybirdSql<{ name: string; views: number }>(client, "SELECT * FROM events");

      expect(result.data).toEqual([{ name: "page1", views: 100 }]);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.tinybird.co/v0/sql",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer p.token123",
            "content-type": "application/x-www-form-urlencoded",
          },
        }),
      );
    });

    it("appends FORMAT JSON when not present", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();
      await tinybirdSql(client, "SELECT count() FROM events");

      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const bodyParams = new URLSearchParams(options.body);
      expect(bodyParams.get("q")).toContain("FORMAT JSON");
    });

    it("does not append FORMAT JSON when already present", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();
      await tinybirdSql(client, "SELECT count() FROM events FORMAT JSONEachRow");

      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const bodyParams = new URLSearchParams(options.body);
      const query = bodyParams.get("q");
      expect(query).toContain("FORMAT JSONEachRow");
      expect(query?.match(/FORMAT/g)?.length).toBe(1);
    });

    it("strips trailing semicolons from query", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();
      await tinybirdSql(client, "SELECT count() FROM events;  ");

      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const bodyParams = new URLSearchParams(options.body);
      const query = bodyParams.get("q");
      expect(query).not.toContain(";");
    });

    it("throws on non-ok response", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal server error"),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      await expect(tinybirdSql(client, "SELECT * FROM events")).rejects.toThrow(
        "Tinybird SQL request failed (500): Internal server error",
      );
    });

    it("throws when response is not valid JSON", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("invalid json {"),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      await expect(tinybirdSql(client, "SELECT * FROM events")).rejects.toThrow("Tinybird SQL request failed");
    });

    it("includes error details from response in exception", async () => {
      vi.resetModules();
      process.env.TINYBIRD_API_URL = "https://api.tinybird.co";
      process.env.TINYBIRD_ADMIN_TOKEN = "p.token123";

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: "Syntax error in query" })),
      });

      const { tinybirdSql, createTinybirdClientFromEnv } = await import("../lib/tinybird/client");
      const client = createTinybirdClientFromEnv();

      await expect(tinybirdSql(client, "SELEC * FROM events")).rejects.toThrow("Syntax error in query");
    });
  });
});
