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

