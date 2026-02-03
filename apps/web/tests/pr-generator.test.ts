import { describe, expect, it, vi } from "vitest";

let setProjectPullRequestByRepoIdSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", () => ({
  setProjectPullRequestByRepoId: (...args: unknown[]) => {
    if (!setProjectPullRequestByRepoIdSpy) throw new Error("setProjectPullRequestByRepoIdSpy not initialized");
    return setProjectPullRequestByRepoIdSpy(...args);
  },
}));

describe("pr generator", () => {
  it("creates a branch from default branch HEAD", async () => {
    vi.resetModules();
    setProjectPullRequestByRepoIdSpy = vi.fn();

    const reposGet = vi.fn().mockResolvedValue({ data: { default_branch: "main" } });
    const gitGetRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha_main" } } });
    const gitCreateRef = vi.fn().mockResolvedValue(undefined);

    const octokit = {
      repos: { get: reposGet },
      git: { getRef: gitGetRef, createRef: gitCreateRef },
    };

    const { createAnalyticsBranch } = await import("../lib/github/pr-generator");
    await expect(createAnalyticsBranch(octokit as never, { owner: "octo", repo: "repo" })).resolves.toBe(
      "add-fast-pr-analytics",
    );

    expect(reposGet).toHaveBeenCalledWith({ owner: "octo", repo: "repo" });
    expect(gitGetRef).toHaveBeenCalledWith({ owner: "octo", repo: "repo", ref: "heads/main" });
    expect(gitCreateRef).toHaveBeenCalledWith({
      owner: "octo",
      repo: "repo",
      ref: "refs/heads/add-fast-pr-analytics",
      sha: "sha_main",
    });
  });

  it("appends an incrementing suffix when the branch already exists", async () => {
    vi.resetModules();
    setProjectPullRequestByRepoIdSpy = vi.fn();

    const reposGet = vi.fn().mockResolvedValue({ data: { default_branch: "main" } });
    const gitGetRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha_main" } } });
    const gitCreateRef = vi
      .fn()
      .mockRejectedValueOnce({ status: 422 })
      .mockResolvedValueOnce(undefined);

    const octokit = {
      repos: { get: reposGet },
      git: { getRef: gitGetRef, createRef: gitCreateRef },
    };

    const { createAnalyticsBranch } = await import("../lib/github/pr-generator");
    await expect(createAnalyticsBranch(octokit as never, { owner: "octo", repo: "repo" })).resolves.toBe(
      "add-fast-pr-analytics-2",
    );
    expect(gitCreateRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "refs/heads/add-fast-pr-analytics-2" }),
    );
  });

  it("creates component + updates layout in a feature branch", async () => {
    vi.resetModules();
    setProjectPullRequestByRepoIdSpy = vi.fn();

    const defaultBranch = "main";
    const entryPoint = "app/layout.tsx";
    const projectId = "proj_123";

    const reposGet = vi.fn().mockResolvedValue({ data: { default_branch: defaultBranch } });
    const gitGetRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha_main" } } });
    const gitCreateRef = vi.fn().mockResolvedValue(undefined);

    const layoutBefore = [
      "export default function RootLayout({ children }: { children: React.ReactNode }) {",
      "  return (",
      "    <html>",
      "      <body>{children}</body>",
      "    </html>",
      "  );",
      "}",
      "",
    ].join("\\n");

    const reposGetContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "tsconfig.json") throw { status: 404 };
      if (path === entryPoint) {
        return {
          data: {
            type: "file",
            sha: "sha_layout",
            encoding: "base64",
            content: Buffer.from(layoutBefore, "utf8").toString("base64"),
          },
        };
      }
      throw { status: 404 };
    });

    const createOrUpdateFileContents = vi.fn().mockResolvedValue(undefined);

    const octokit = {
      repos: {
        get: reposGet,
        getContent: reposGetContent,
        createOrUpdateFileContents,
      },
      git: { getRef: gitGetRef, createRef: gitCreateRef },
    };

    const { createAnalyticsBranch, commitAnalyticsFiles } = await import("../lib/github/pr-generator");
    const branch = await createAnalyticsBranch(octokit as never, { owner: "octo", repo: "repo" });

	    await commitAnalyticsFiles(octokit as never, {
	      owner: "octo",
	      repo: "repo",
	      branch,
	      defaultBranch,
	      projectId,
	      detection: { framework: "nextjs-app", entryPoint },
	      eventsUrl: "https://events.example.com",
	    });

    const calls = createOrUpdateFileContents.mock.calls as unknown[][];
    expect(calls).toHaveLength(2);

    const componentCall = calls.find((c) => (c[0] as any).path.includes("components/"));
    expect(componentCall?.[0]).toMatchObject({ branch, path: "components/fast-pr-analytics.tsx" });

    const layoutCall = calls.find((c) => (c[0] as any).path === entryPoint);
    expect(layoutCall?.[0]).toMatchObject({ branch, path: entryPoint, sha: "sha_layout" });
    const updatedLayout = Buffer.from((layoutCall?.[0] as any).content, "base64").toString("utf8");
    expect(updatedLayout).toContain("FastPrAnalytics");
    expect(updatedLayout).toContain("<FastPrAnalytics />");
  });

  it("includes sha when analytics component already exists", async () => {
    vi.resetModules();
    setProjectPullRequestByRepoIdSpy = vi.fn();

    const defaultBranch = "main";
    const entryPoint = "app/layout.tsx";
    const projectId = "proj_123";

    const reposGet = vi.fn().mockResolvedValue({ data: { default_branch: defaultBranch } });
    const gitGetRef = vi.fn().mockResolvedValue({ data: { object: { sha: "sha_main" } } });
    const gitCreateRef = vi.fn().mockResolvedValue(undefined);

    const layoutBefore = [
      "export default function RootLayout({ children }: { children: React.ReactNode }) {",
      "  return (",
      "    <html>",
      "      <body>{children}</body>",
      "    </html>",
      "  );",
      "}",
      "",
    ].join("\\n");

    const reposGetContent = vi.fn(async ({ path }: { path: string }) => {
      if (path === "tsconfig.json") throw { status: 404 };
      if (path === "components/fast-pr-analytics.tsx") {
        return {
          data: {
            type: "file",
            sha: "sha_component",
            encoding: "base64",
            content: Buffer.from("// existing component", "utf8").toString("base64"),
          },
        };
      }
      if (path === entryPoint) {
        return {
          data: {
            type: "file",
            sha: "sha_layout",
            encoding: "base64",
            content: Buffer.from(layoutBefore, "utf8").toString("base64"),
          },
        };
      }
      throw { status: 404 };
    });

    const createOrUpdateFileContents = vi.fn().mockResolvedValue(undefined);

    const octokit = {
      repos: {
        get: reposGet,
        getContent: reposGetContent,
        createOrUpdateFileContents,
      },
      git: { getRef: gitGetRef, createRef: gitCreateRef },
    };

    const { createAnalyticsBranch, commitAnalyticsFiles } = await import("../lib/github/pr-generator");
    const branch = await createAnalyticsBranch(octokit as never, { owner: "octo", repo: "repo" });

    await commitAnalyticsFiles(octokit as never, {
      owner: "octo",
      repo: "repo",
      branch,
      defaultBranch,
      projectId,
      detection: { framework: "nextjs-app", entryPoint },
      eventsUrl: "https://events.example.com",
    });

    const calls = createOrUpdateFileContents.mock.calls as unknown[][];
    const componentCall = calls.find((c) => (c[0] as any).path === "components/fast-pr-analytics.tsx");
    expect(componentCall?.[0]).toMatchObject({ sha: "sha_component" });
  });

  it("creates a PR and stores pr_number/pr_url on the project", async () => {
    vi.resetModules();

    setProjectPullRequestByRepoIdSpy = vi.fn().mockResolvedValue(undefined);

    const pullsCreate = vi.fn().mockResolvedValue({ data: { number: 12, html_url: "https://example.com/pr/12" } });
    const octokit = { pulls: { create: pullsCreate, list: vi.fn() } };

    const { openAnalyticsPullRequest } = await import("../lib/github/pr-generator");
    await expect(
      openAnalyticsPullRequest(octokit as never, {
        repoId: 123n,
        owner: "octo",
        repo: "repo",
        branch: "add-fast-pr-analytics",
        defaultBranch: "main",
        projectId: "proj_123",
        entryPoint: "app/layout.tsx",
      }),
    ).resolves.toEqual({ prNumber: 12, prUrl: "https://example.com/pr/12", alreadyExists: false });

    expect(setProjectPullRequestByRepoIdSpy).toHaveBeenCalledWith({
      repoId: 123n,
      prNumber: 12,
      prUrl: "https://example.com/pr/12",
    });
  });

  it("links an existing PR when one already exists for the branch", async () => {
    vi.resetModules();

    setProjectPullRequestByRepoIdSpy = vi.fn().mockResolvedValue(undefined);

    const pullsCreate = vi.fn().mockRejectedValue({ status: 422 });
    const pullsList = vi.fn().mockResolvedValue({
      data: [{ number: 77, html_url: "https://example.com/pr/77" }],
    });
    const octokit = { pulls: { create: pullsCreate, list: pullsList } };

    const { openAnalyticsPullRequest } = await import("../lib/github/pr-generator");
    await expect(
      openAnalyticsPullRequest(octokit as never, {
        repoId: 123n,
        owner: "octo",
        repo: "repo",
        branch: "add-fast-pr-analytics",
        defaultBranch: "main",
        projectId: "proj_123",
        entryPoint: "app/layout.tsx",
      }),
    ).resolves.toEqual({ prNumber: 77, prUrl: "https://example.com/pr/77", alreadyExists: true });
  });
});
