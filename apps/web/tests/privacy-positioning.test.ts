import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.join(__dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(appRoot, relativePath), "utf8");
}

function walkFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return fullPath;
  });
}

describe("privacy positioning regression", () => {
  it("keeps the no-AI-training commitment on launch-critical surfaces", () => {
    const surfaces = [
      "components/marketing/privacy-commitment.tsx",
      "components/marketing/hero.tsx",
      "components/marketing/footer.tsx",
      "app/(marketing)/privacy/page.tsx",
      "app/(marketing)/docs/setup/page.tsx",
    ];

    for (const surface of surfaces) {
      expect(read(surface).toLowerCase(), surface).toContain("train ai");
    }
  });

  it("does not mention PostHog in public marketing copy", () => {
    const roots = [
      path.join(appRoot, "app", "(marketing)"),
      path.join(appRoot, "components", "marketing"),
    ];
    const publicMarketingFiles = roots.flatMap(walkFiles).filter((file) => /\.(ts|tsx|mdx)$/.test(file));

    for (const file of publicMarketingFiles) {
      const sourceWithoutImports = fs
        .readFileSync(file, "utf8")
        .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
      const publicCopy = sourceWithoutImports.match(/(["'`>])[^"'`<>\n]*posthog[^"'`<>\n]*(["'`<])/gi);

      expect(publicCopy, file).toBeNull();
    }
  });
});
