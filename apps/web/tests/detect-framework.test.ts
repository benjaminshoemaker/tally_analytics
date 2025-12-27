import { describe, expect, it, vi } from "vitest";

function fileResponse(): { data: { type: string; encoding: string; content: string } } {
  return { data: { type: "file", encoding: "base64", content: "" } };
}

describe("detectFramework", () => {
  it("returns an error when package.json is missing", async () => {
    vi.resetModules();

    const getContent = vi.fn().mockRejectedValue({ status: 404 });
    const octokit = { repos: { getContent } };

    const { detectFramework } = await import("../lib/github/detect-framework");
    await expect(detectFramework(octokit, "octo", "repo")).resolves.toEqual({
      framework: null,
      entryPoint: null,
      existingAnalytics: [],
      isMonorepo: false,
      error: "no_package_json",
    });
  });

  it("returns unsupported_framework when Next.js is not present", async () => {
    vi.resetModules();

    const pkg = { dependencies: { react: "^18.0.0" } };
    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "package.json") {
        return {
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(JSON.stringify(pkg), "utf8").toString("base64"),
          },
        };
      }
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectFramework } = await import("../lib/github/detect-framework");
    await expect(detectFramework(octokit, "octo", "repo")).resolves.toMatchObject({
      framework: null,
      entryPoint: null,
      error: "unsupported_framework",
    });
  });

  it("returns monorepo_detected when workspaces are present", async () => {
    vi.resetModules();

    const pkg = { dependencies: { next: "^14.0.0" }, workspaces: ["packages/*"] };
    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "package.json") {
        return {
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(JSON.stringify(pkg), "utf8").toString("base64"),
          },
        };
      }
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectFramework } = await import("../lib/github/detect-framework");
    await expect(detectFramework(octokit, "octo", "repo")).resolves.toMatchObject({
      framework: null,
      entryPoint: null,
      isMonorepo: true,
      error: "monorepo_detected",
    });
  });

  it("does not treat pnpm-workspace.yaml with only '.' as a monorepo", async () => {
    vi.resetModules();

    const pkg = { dependencies: { next: "^14.0.0" } };
    const workspace = "packages:\n  - .\n";

    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "package.json") {
        return {
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(JSON.stringify(pkg), "utf8").toString("base64"),
          },
        };
      }
      if (path === "pnpm-workspace.yaml") {
        return {
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(workspace, "utf8").toString("base64"),
          },
        };
      }
      if (path === "app/layout.tsx") return fileResponse();
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectFramework } = await import("../lib/github/detect-framework");
    await expect(detectFramework(octokit, "octo", "repo")).resolves.toMatchObject({
      framework: "nextjs-app",
      entryPoint: "app/layout.tsx",
      isMonorepo: false,
      error: null,
    });
  });

  it("returns entry_point_not_found when Next.js exists but no router entry point is found", async () => {
    vi.resetModules();

    const pkg = { dependencies: { next: "^14.0.0" } };
    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "package.json") {
        return {
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(JSON.stringify(pkg), "utf8").toString("base64"),
          },
        };
      }
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectFramework } = await import("../lib/github/detect-framework");
    await expect(detectFramework(octokit, "octo", "repo")).resolves.toMatchObject({
      framework: null,
      entryPoint: null,
      error: "entry_point_not_found",
    });
  });

  it("returns nextjs-app when app/layout exists", async () => {
    vi.resetModules();

    const pkg = { dependencies: { next: "^14.0.0", "@vercel/analytics": "^1.0.0" } };
    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "package.json") {
        return {
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(JSON.stringify(pkg), "utf8").toString("base64"),
          },
        };
      }
      if (path === "app/layout.tsx") return fileResponse();
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectFramework } = await import("../lib/github/detect-framework");
    await expect(detectFramework(octokit, "octo", "repo")).resolves.toEqual({
      framework: "nextjs-app",
      entryPoint: "app/layout.tsx",
      existingAnalytics: ["@vercel/analytics"],
      isMonorepo: false,
      error: null,
    });
  });
});
