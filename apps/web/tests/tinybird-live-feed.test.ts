import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("legacy Tinybird live_feed pipe reference", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const pipePath = path.join(repoRoot, "tinybird/pipes/live_feed.pipe");

  it("keeps the legacy recent-events pipe definition readable", () => {
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
