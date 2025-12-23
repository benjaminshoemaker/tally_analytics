import { describe, expect, it, vi } from "vitest";

describe("github detection - package.json analysis", () => {
  it("fetchPackageJson fetches and parses package.json via GitHub API", async () => {
    vi.resetModules();

    const pkg = { dependencies: { next: "^14.2.0" } };
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: "file",
        encoding: "base64",
        content: Buffer.from(JSON.stringify(pkg), "utf8").toString("base64"),
      },
    });
    const octokit = { repos: { getContent } };

    const { fetchPackageJson } = await import("../lib/github/detection");
    await expect(fetchPackageJson(octokit, "octo", "repo")).resolves.toEqual(pkg);
    expect(getContent).toHaveBeenCalledWith({ owner: "octo", repo: "repo", path: "package.json" });
  });

  it("fetchPackageJson returns null when package.json is not found", async () => {
    vi.resetModules();

    const getContent = vi.fn().mockRejectedValue({ status: 404 });
    const octokit = { repos: { getContent } };

    const { fetchPackageJson } = await import("../lib/github/detection");
    await expect(fetchPackageJson(octokit, "octo", "repo")).resolves.toBeNull();
  });

  it("analyzePackageJson detects Next.js and existing analytics packages", async () => {
    vi.resetModules();

    const { analyzePackageJson } = await import("../lib/github/detection");

    const result = analyzePackageJson({
      dependencies: { next: "^15.0.0", "@vercel/analytics": "^1.0.0" },
      devDependencies: { "posthog-js": "^1.0.0" },
    });

    expect(result.nextVersion).toBe("^15.0.0");
    expect(result.existingAnalytics.sort()).toEqual(["@vercel/analytics", "posthog-js"].sort());
  });
});

describe("github detection - router detection", () => {
  it("detects App Router when app/layout exists", async () => {
    vi.resetModules();

    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "src/app/layout.tsx") return { data: { type: "file", content: "", encoding: "base64" } };
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectNextRouter } = await import("../lib/github/detection");
    await expect(detectNextRouter(octokit, "octo", "repo")).resolves.toEqual({
      framework: "nextjs-app",
      entryPoint: "src/app/layout.tsx",
    });
  });

  it("detects Pages Router when pages/_app exists and app router does not", async () => {
    vi.resetModules();

    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "pages/_app.tsx") return { data: { type: "file", content: "", encoding: "base64" } };
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectNextRouter } = await import("../lib/github/detection");
    await expect(detectNextRouter(octokit, "octo", "repo")).resolves.toEqual({
      framework: "nextjs-pages",
      entryPoint: "pages/_app.tsx",
    });
  });

  it("prefers App Router when both app/layout and pages/_app exist", async () => {
    vi.resetModules();

    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "app/layout.tsx") return { data: { type: "file", content: "", encoding: "base64" } };
      if (path === "pages/_app.tsx") return { data: { type: "file", content: "", encoding: "base64" } };
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectNextRouter } = await import("../lib/github/detection");
    await expect(detectNextRouter(octokit, "octo", "repo")).resolves.toEqual({
      framework: "nextjs-app",
      entryPoint: "app/layout.tsx",
    });
  });
});

describe("github detection - monorepo detection", () => {
  it("detectMonorepo returns true when package.json has workspaces", async () => {
    vi.resetModules();

    const getContent = vi.fn();
    const octokit = { repos: { getContent } };

    const { detectMonorepo } = await import("../lib/github/detection");
    await expect(detectMonorepo(octokit, "octo", "repo", { workspaces: ["packages/*"] })).resolves.toBe(true);
    expect(getContent).not.toHaveBeenCalled();
  });

  it("detectMonorepo returns true when pnpm-workspace.yaml exists", async () => {
    vi.resetModules();

    const getContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "pnpm-workspace.yaml") return { data: { type: "file", content: "", encoding: "base64" } };
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectMonorepo } = await import("../lib/github/detection");
    await expect(detectMonorepo(octokit, "octo", "repo", {})).resolves.toBe(true);
  });

  it("detectMonorepo returns false when no indicators are present", async () => {
    vi.resetModules();

    const getContent = vi.fn(async () => {
      throw { status: 404 };
    });
    const octokit = { repos: { getContent } };

    const { detectMonorepo } = await import("../lib/github/detection");
    await expect(detectMonorepo(octokit, "octo", "repo", {})).resolves.toBe(false);
  });
});
