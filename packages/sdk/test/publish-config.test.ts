import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.join(__dirname, "..");

describe("Task 3.4.B - Publish config", () => {
  it("configures publish metadata and files", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(pkg.version).toBe("0.1.0");
    expect(pkg.publishConfig).toBeTypeOf("object");
    expect(fs.existsSync(path.join(packageRoot, ".npmignore"))).toBe(true);
    expect(fs.existsSync(path.join(packageRoot, "CHANGELOG.md"))).toBe(true);
  });
});

