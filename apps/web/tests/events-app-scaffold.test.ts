import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listRouteFiles(fullPath));
    else if (entry.isFile() && entry.name === "route.ts") files.push(fullPath);
  }

  return files;
}

describe("events app scaffolding (Task 4.1.A)", () => {
  const repoRoot = path.resolve(__dirname, "../../..");

  it("creates the expected minimal Next.js app files", () => {
    expect(fs.existsSync(path.join(repoRoot, "apps/events/package.json"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "apps/events/next.config.js"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "apps/events/tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "apps/events/app/layout.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "apps/events/app/v1/track/route.ts"))).toBe(true);
  });

  it("does not include a UI route like app/page.tsx (only API routes)", () => {
    const appDir = path.join(repoRoot, "apps/events/app");
    expect(fs.existsSync(path.join(appDir, "page.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "page.jsx"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "page.ts"))).toBe(false);
    expect(fs.existsSync(path.join(appDir, "page.js"))).toBe(false);

    const routeFiles = listRouteFiles(appDir).map((p) => path.relative(appDir, p));
    expect(routeFiles).toEqual(["v1/track/route.ts"]);
  });

  it("is configured as a Next.js app with a build script (Vercel-compatible)", () => {
    const pkg = readJson(path.join(repoRoot, "apps/events/package.json")) as any;
    expect(pkg.private).toBe(true);
    expect(pkg.scripts?.build).toBe("next build");
    expect(pkg.scripts?.start).toBe("next start");
    expect(pkg.dependencies?.next).toBeDefined();
  });
});
