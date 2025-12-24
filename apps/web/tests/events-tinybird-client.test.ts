import { describe, expect, it, vi } from "vitest";

describe("events Tinybird client (Task 4.1.B)", () => {
  it("POSTs NDJSON to /v0/events with Authorization header", async () => {
    const fetchMock = vi.fn(async () => new Response("OK", { status: 200 }));

    const { createTinybirdClient } = await import("../../events/lib/tinybird");
    const client = createTinybirdClient({
      apiUrl: "https://api.us-west-2.aws.tinybird.co",
      token: "p.test-token",
      datasource: "events",
      fetch: fetchMock as any,
      retry: { maxAttempts: 1, baseDelayMs: 0 },
    });

    await client.appendEvents([{ a: 1 }, { b: "two" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as any;

    expect(String(url)).toBe("https://api.us-west-2.aws.tinybird.co/v0/events?name=events&wait=true");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer p.test-token");
    expect(init.headers["Content-Type"]).toBe("application/x-ndjson");
    expect(init.body).toBe('{"a":1}\n{"b":"two"}\n');
  });

  it("retries on 5xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const { createTinybirdClient } = await import("../../events/lib/tinybird");
    const client = createTinybirdClient({
      apiUrl: "https://api.us-west-2.aws.tinybird.co",
      token: "p.test-token",
      datasource: "events",
      fetch: fetchMock as any,
      retry: { maxAttempts: 2, baseDelayMs: 0 },
    });

    await client.appendEvents([{ a: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when apiUrl/token are missing from env", async () => {
    const previousApiUrl = process.env.TINYBIRD_API_URL;
    const previousToken = process.env.TINYBIRD_EVENTS_TOKEN;
    delete process.env.TINYBIRD_API_URL;
    delete process.env.TINYBIRD_EVENTS_TOKEN;

    vi.resetModules();
    const { createTinybirdClientFromEnv } = await import("../../events/lib/tinybird");
    expect(() => createTinybirdClientFromEnv()).toThrow(/TINYBIRD_(API_URL|EVENTS_TOKEN)/);

    if (previousApiUrl === undefined) delete process.env.TINYBIRD_API_URL;
    else process.env.TINYBIRD_API_URL = previousApiUrl;
    if (previousToken === undefined) delete process.env.TINYBIRD_EVENTS_TOKEN;
    else process.env.TINYBIRD_EVENTS_TOKEN = previousToken;
  });
});

