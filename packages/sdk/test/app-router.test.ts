import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.join(__dirname, "..");

describe("Task 3.3.A - App Router component", () => {
  it("implements a Suspense-wrapped component using usePathname/useSearchParams", () => {
    const filePath = path.join(packageRoot, "src", "react", "app-router.tsx");
    expect(fs.existsSync(filePath)).toBe(true);

    const src = fs.readFileSync(filePath, "utf8");
    expect(src).toContain("'use client'");
    expect(src).toContain("usePathname");
    expect(src).toContain("useSearchParams");
    expect(src).toContain("Suspense");
    expect(src).toContain("trackPageView");
  });

  it("exports the component from src/index.ts", () => {
    const indexPath = path.join(packageRoot, "src", "index.ts");
    const src = fs.readFileSync(indexPath, "utf8");
    expect(src).toContain("export { AnalyticsAppRouter }");
  });
});

