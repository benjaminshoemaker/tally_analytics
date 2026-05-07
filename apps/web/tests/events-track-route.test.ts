import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const appendEvents = vi.fn(async () => undefined);
const isProjectActive = vi.fn(async () => true);

vi.mock("../../events/lib/tinybird", () => ({
  createTinybirdClientFromEnv: () => ({ appendEvents }),
}));

vi.mock("../../events/lib/project-cache", () => ({
  createProjectCacheFromEnv: () => ({ isProjectActive }),
}));

describe("events track route (Task 4.2.A)", () => {
  const validEvent = {
    project_id: "proj_test",
    session_id: "sess_test",
    event_type: "page_view",
    timestamp: "2025-01-01T00:00:00.000Z",
    url: "https://example.com/",
    path: "/",
  };

  it("accepts 1-10 events and forwards them to Tinybird", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [validEvent] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, received: 1 });
    expect(appendEvents).toHaveBeenCalledTimes(1);
    expect(appendEvents).toHaveBeenCalledWith([validEvent]);
    expect(isProjectActive).toHaveBeenCalledTimes(1);
  });

  it("writes E2E fixture events instead of forwarding to Tinybird when the local sink is enabled", async () => {
    const previousTestMode = process.env.E2E_TEST_MODE;
    const previousScenario = process.env.E2E_EVENTS_FIXTURE_SCENARIO;
    const previousFixtureDir = process.env.E2E_ANALYTICS_FIXTURE_DIR;
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fpa-event-sink-"));

    try {
      process.env.E2E_TEST_MODE = "1";
      process.env.E2E_EVENTS_FIXTURE_SCENARIO = "mcp-self-test";
      process.env.E2E_ANALYTICS_FIXTURE_DIR = fixtureDir;

      vi.resetModules();
      appendEvents.mockClear();
      isProjectActive.mockClear();

      const { POST } = await import("../../events/app/v1/track/route");
      const request = new Request("http://localhost/v1/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [validEvent] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, received: 1, stored: 1 });
      expect(appendEvents).toHaveBeenCalledTimes(0);
      expect(isProjectActive).toHaveBeenCalledTimes(1);

      const eventsPath = path.join(fixtureDir, "mcp-self-test", "events.jsonl");
      const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toMatchObject(validEvent);
    } finally {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
      if (previousTestMode === undefined) delete process.env.E2E_TEST_MODE;
      else process.env.E2E_TEST_MODE = previousTestMode;
      if (previousScenario === undefined) delete process.env.E2E_EVENTS_FIXTURE_SCENARIO;
      else process.env.E2E_EVENTS_FIXTURE_SCENARIO = previousScenario;
      if (previousFixtureDir === undefined) delete process.env.E2E_ANALYTICS_FIXTURE_DIR;
      else process.env.E2E_ANALYTICS_FIXTURE_DIR = previousFixtureDir;
    }
  });

  it("rejects invalid payloads via Zod validation", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");
    const request = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [{ ...validEvent, project_id: 123 }] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(appendEvents).toHaveBeenCalledTimes(0);
    expect(isProjectActive).toHaveBeenCalledTimes(0);
  });

  it("rejects empty batches and batches over 10", async () => {
    vi.resetModules();
    appendEvents.mockClear();
    isProjectActive.mockClear();

    const { POST } = await import("../../events/app/v1/track/route");

    const emptyRequest = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [] }),
    });
    const emptyResponse = await POST(emptyRequest);
    expect(emptyResponse.status).toBe(400);

    const tooManyRequest = new Request("http://localhost/v1/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: Array.from({ length: 11 }, () => validEvent) }),
    });
    const tooManyResponse = await POST(tooManyRequest);
    expect(tooManyResponse.status).toBe(400);

    expect(appendEvents).toHaveBeenCalledTimes(0);
    expect(isProjectActive).toHaveBeenCalledTimes(0);
  });
});
