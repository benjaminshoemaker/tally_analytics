import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tinybird top_referrers pipe (Task 4.5.D)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const pipePath = path.join(repoRoot, "tinybird/pipes/top_referrers.pipe");

  it("returns top 10 referrer hosts, mapping empty referrer to Direct", () => {
    expect(fs.existsSync(pipePath)).toBe(true);
    const contents = fs.readFileSync(pipePath, "utf8");

    expect(contents).toContain("NODE top_referrers");
    expect(contents).toContain("extractURLHost(referrer)");
    expect(contents).toContain("if(referrer = '', 'Direct'");
    expect(contents).toContain("percentage");
    expect(contents).toContain("GROUP BY referrer_host");
    expect(contents).toContain("ORDER BY count DESC");
    expect(contents).toContain("LIMIT 10");
  });
});

