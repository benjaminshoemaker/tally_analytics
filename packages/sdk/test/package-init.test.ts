import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.join(__dirname, "..");
const packageJsonPath = path.join(packageRoot, "package.json");

describe("Task 3.1.A - Package init", () => {
  it("has main/module/types fields", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as Record<
      string,
      unknown
    >;

    expect(pkg.main).toBeTypeOf("string");
    expect(pkg.module).toBeTypeOf("string");
    expect(pkg.types).toBeTypeOf("string");
  });

  it("declares React/Next.js as peerDependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as Record<
      string,
      unknown
    >;

    expect(pkg.peerDependencies).toBeTypeOf("object");
    const peerDependencies = pkg.peerDependencies as Record<string, unknown>;

    expect(peerDependencies.react).toBeTypeOf("string");
    expect(peerDependencies.next).toBeTypeOf("string");
  });

  it("has a tsup config file", () => {
    expect(fs.existsSync(path.join(packageRoot, "tsup.config.ts"))).toBe(true);
  });
});

