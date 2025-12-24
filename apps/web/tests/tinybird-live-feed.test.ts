import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tinybird live_feed pipe (Task 4.5.A)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const pipePath = path.join(repoRoot, "tinybird/pipes/live_feed.pipe");

  it("defines a recent-events query with relative_time and parameters", () => {
    expect(fs.existsSync(pipePath)).toBe(true);
    const contents = fs.readFileSync(pipePath, "utf8");

    expect(contents).toContain("NODE live_events");
    expect(contents).toContain("formatReadableTimeDelta(now() - timestamp) as relative_time");
    expect(contents).toContain("FROM events");
    expect(contents).toContain("WHERE project_id = {{String(project_id, '')}}");
    expect(contents).toContain("AND timestamp > {{DateTime(since");
    expect(contents).toContain("LIMIT {{Int32(limit");
  });
});

