import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.join(__dirname, "..");

describe("Task 3.4.A - README", () => {
  it("documents installation, quick start, API, and DNT behavior", () => {
    const readmePath = path.join(packageRoot, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);

    const src = fs.readFileSync(readmePath, "utf8");
    expect(src).toContain("## Installation");
    expect(src).toContain("## Quick start");
    expect(src).toContain("App Router");
    expect(src).toContain("Pages Router");
    expect(src).toContain("## API");
    expect(src).toContain("init");
    expect(src).toContain("trackPageView");
    expect(src).toContain("identify");
    expect(src).toContain("Do Not Track");
  });
});

