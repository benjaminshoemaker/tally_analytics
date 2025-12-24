import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tinybird page_views_timeseries pipe (Task 4.5.B)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const pipePath = path.join(repoRoot, "tinybird/pipes/page_views_timeseries.pipe");

  it("returns daily page_view counts in date order for a date range", () => {
    expect(fs.existsSync(pipePath)).toBe(true);
    const contents = fs.readFileSync(pipePath, "utf8");

    expect(contents).toContain("NODE page_views");
    expect(contents).toContain("toDate(timestamp) as date");
    expect(contents).toContain("count() as count");
    expect(contents).toContain("FROM events");
    expect(contents).toContain("AND event_type = 'page_view'");
    expect(contents).toContain("AND timestamp >= {{DateTime(start_date)}}");
    expect(contents).toContain("AND timestamp < {{DateTime(end_date)}}");
    expect(contents).toContain("GROUP BY date");
    expect(contents).toContain("ORDER BY date");
  });
});

