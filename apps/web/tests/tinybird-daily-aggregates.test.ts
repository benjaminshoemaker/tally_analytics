import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tinybird daily aggregates (Task 4.4.B)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const datasourcePath = path.join(repoRoot, "tinybird/datasources/daily_aggregates.datasource");
  const pipePath = path.join(repoRoot, "tinybird/pipes/daily_aggregates_pipe.pipe");

  it("defines the daily_aggregates datasource as SummingMergeTree", () => {
    expect(fs.existsSync(datasourcePath)).toBe(true);
    const contents = fs.readFileSync(datasourcePath, "utf8");

    expect(contents).toContain("SCHEMA >");
    expect(contents).toContain("`project_id` String");
    expect(contents).toContain("`date` Date");
    expect(contents).toContain("`page_views` UInt64");
    expect(contents).toContain("`sessions` UInt64");
    expect(contents).toContain("`unique_visitors` UInt64");

    expect(contents).toContain('ENGINE "SummingMergeTree"');
    expect(contents).toContain('ENGINE_PARTITION_KEY "toYYYYMM(date)"');
    expect(contents).toContain('ENGINE_SORTING_KEY "project_id, date"');
  });

  it("defines a materialized pipe that populates daily_aggregates from events", () => {
    expect(fs.existsSync(pipePath)).toBe(true);
    const contents = fs.readFileSync(pipePath, "utf8");

    expect(contents).toContain("NODE daily_stats");
    expect(contents).toContain("FROM events");
    expect(contents).toContain("GROUP BY project_id, date");
    expect(contents).toContain("countIf(event_type = 'page_view')");
    expect(contents).toContain("countIf(event_type = 'session_start')");
    expect(contents).toContain("uniqExact(session_id)");
    expect(contents).toContain("TYPE materialized");
    expect(contents).toContain("DATASOURCE daily_aggregates");
  });
});

