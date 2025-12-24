import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tinybird events datasource (Task 4.4.A)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const datasourcePath = path.join(repoRoot, "tinybird/datasources/events.datasource");

  it("defines the events datasource schema + retention", () => {
    expect(fs.existsSync(datasourcePath)).toBe(true);
    const contents = fs.readFileSync(datasourcePath, "utf8");

    expect(contents).toContain("SCHEMA >");
    expect(contents).toContain("`project_id` String `json:$.project_id`");
    expect(contents).toContain("`session_id` String `json:$.session_id`");
    expect(contents).toContain("`event_type` LowCardinality(String) `json:$.event_type`");
    expect(contents).toContain("`timestamp` DateTime64(3) `json:$.timestamp`");
    expect(contents).toContain("`country` Nullable(String) `json:$.country`");
    expect(contents).toContain("`city` Nullable(String) `json:$.city`");

    expect(contents).toContain("ENGINE MergeTree");
    expect(contents).toContain("ENGINE_PARTITION_KEY toYYYYMM(timestamp)");
    expect(contents).toContain("ENGINE_SORTING_KEY project_id, timestamp");
    expect(contents).toContain("ENGINE_TTL toDateTime(timestamp) + INTERVAL 90 DAY");
  });
});
