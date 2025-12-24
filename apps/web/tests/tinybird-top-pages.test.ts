import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tinybird top_pages pipe (Task 4.5.C)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const pipePath = path.join(repoRoot, "tinybird/pipes/top_pages.pipe");

  it("returns top pages with a percentage, limited to 10", () => {
    expect(fs.existsSync(pipePath)).toBe(true);
    const contents = fs.readFileSync(pipePath, "utf8");

    expect(contents).toContain("NODE top_pages_query");
    expect(contents).toContain("path,");
    expect(contents).toContain("count() as views");
    expect(contents).toContain("percentage");
    expect(contents).toContain("FROM events");
    expect(contents).toContain("GROUP BY path");
    expect(contents).toContain("ORDER BY views DESC");
    expect(contents).toContain("LIMIT 10");
  });
});
