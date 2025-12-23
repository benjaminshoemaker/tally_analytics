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

