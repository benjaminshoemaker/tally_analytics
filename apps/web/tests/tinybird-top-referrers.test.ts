import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("legacy Tinybird top_referrers pipe reference", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const pipePath = path.join(repoRoot, "tinybird/pipes/top_referrers.pipe");

  it("keeps the legacy top referrers pipe definition readable", () => {
    expect(fs.existsSync(pipePath)).toBe(true);
    const contents = fs.readFileSync(pipePath, "utf8");

    expect(contents).toContain("NODE top_referrers_query");
    expect(contents).toContain("domain(referrer)");
    expect(contents).toContain("if(referrer = '', 'Direct'");
    expect(contents).toContain("percentage");
    expect(contents).toContain("GROUP BY referrer_host");
    expect(contents).toContain("ORDER BY count DESC");
    expect(contents).toContain("LIMIT 10");
  });
});
