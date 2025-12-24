import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.join(__dirname, "..");

describe("Task 3.3.B - Pages Router hook", () => {
  it("implements a hook using useRouter and routeChangeComplete cleanup", () => {
    const filePath = path.join(packageRoot, "src", "react", "pages-router.tsx");
    expect(fs.existsSync(filePath)).toBe(true);

    const src = fs.readFileSync(filePath, "utf8");
    expect(src).toContain("useRouter");
    expect(src).toContain("routeChangeComplete");
    expect(src).toContain(".on(");
    expect(src).toContain(".off(");
  });

  it("exports the hook from src/index.ts", () => {
    const indexPath = path.join(packageRoot, "src", "index.ts");
    const src = fs.readFileSync(indexPath, "utf8");
    expect(src).toContain("export { useAnalyticsPagesRouter }");
  });
});

