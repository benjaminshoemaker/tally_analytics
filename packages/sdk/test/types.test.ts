import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.join(__dirname, "..");

describe("Task 3.1.B - Type definitions", () => {
  it("defines InitOptions, EventType, AnalyticsEvent", () => {
    const typesPath = path.join(packageRoot, "src", "types.ts");
    expect(fs.existsSync(typesPath)).toBe(true);

    const src = fs.readFileSync(typesPath, "utf8");
    expect(src).toContain("export interface InitOptions");
    expect(src).toContain("export type EventType");
    expect(src).toContain("export interface AnalyticsEvent");
  });

  it("exports types from src/index.ts", () => {
    const indexPath = path.join(packageRoot, "src", "index.ts");
    const src = fs.readFileSync(indexPath, "utf8");
    expect(src).toContain("export type");
    expect(src).toContain("from \"./types\"");
  });
});

describe("Task 2.2.A - V2 event fields in AnalyticsEvent", () => {
  it("includes V2 engagement and attribution fields", () => {
    const typesPath = path.join(packageRoot, "src", "types.ts");
    const src = fs.readFileSync(typesPath, "utf8");

    // Engagement metrics
    expect(src).toContain("engagement_time_ms");
    expect(src).toContain("scroll_depth");

    // Visitor tracking
    expect(src).toContain("visitor_id");
    expect(src).toContain("is_returning");

    // UTM parameters
    expect(src).toContain("utm_source");
    expect(src).toContain("utm_medium");
    expect(src).toContain("utm_campaign");
    expect(src).toContain("utm_term");
    expect(src).toContain("utm_content");

    // CTA tracking
    expect(src).toContain("cta_clicks");
  });

  it("V2 fields are optional (marked with ?)", () => {
    const typesPath = path.join(packageRoot, "src", "types.ts");
    const src = fs.readFileSync(typesPath, "utf8");

    // All V2 fields should be optional
    expect(src).toMatch(/engagement_time_ms\?:/);
    expect(src).toMatch(/scroll_depth\?:/);
    expect(src).toMatch(/visitor_id\?:/);
    expect(src).toMatch(/is_returning\?:/);
    expect(src).toMatch(/utm_source\?:/);
    expect(src).toMatch(/utm_medium\?:/);
    expect(src).toMatch(/utm_campaign\?:/);
    expect(src).toMatch(/utm_term\?:/);
    expect(src).toMatch(/utm_content\?:/);
    expect(src).toMatch(/cta_clicks\?:/);
  });
});

