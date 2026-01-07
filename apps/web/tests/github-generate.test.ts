import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let setProjectStatusByRepoIdSpy: ReturnType<typeof vi.fn> | undefined;
let getInstallationOctokitSpy: ReturnType<typeof vi.fn> | undefined;
let createAnalyticsBranchSpy: ReturnType<typeof vi.fn> | undefined;
let commitAnalyticsFilesSpy: ReturnType<typeof vi.fn> | undefined;
let openAnalyticsPullRequestSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", () => ({
  setProjectStatusByRepoId: (...args: unknown[]) => {
    if (!setProjectStatusByRepoIdSpy) throw new Error("setProjectStatusByRepoIdSpy not initialized");
    return setProjectStatusByRepoIdSpy(...args);
  },
}));

vi.mock("../lib/github/app", () => ({
  getInstallationOctokit: (...args: unknown[]) => {
    if (!getInstallationOctokitSpy) throw new Error("getInstallationOctokitSpy not initialized");
    return getInstallationOctokitSpy(...args);
  },
}));

vi.mock("../lib/github/pr-generator", () => ({
  createAnalyticsBranch: (...args: unknown[]) => {
    if (!createAnalyticsBranchSpy) throw new Error("createAnalyticsBranchSpy not initialized");
    return createAnalyticsBranchSpy(...args);
  },
  commitAnalyticsFiles: (...args: unknown[]) => {
    if (!commitAnalyticsFilesSpy) throw new Error("commitAnalyticsFilesSpy not initialized");
    return commitAnalyticsFilesSpy(...args);
  },
  openAnalyticsPullRequest: (...args: unknown[]) => {
    if (!openAnalyticsPullRequestSpy) throw new Error("openAnalyticsPullRequestSpy not initialized");
    return openAnalyticsPullRequestSpy(...args);
  },
}));

describe("github generate", () => {
  let previousDatabaseUrl: string | undefined;
  let previousEventsUrl: string | undefined;
  let previousAppUrl: string | undefined;

  beforeEach(() => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    previousEventsUrl = process.env.NEXT_PUBLIC_EVENTS_URL;
    previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  });

  afterEach(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousEventsUrl === undefined) delete process.env.NEXT_PUBLIC_EVENTS_URL;
    else process.env.NEXT_PUBLIC_EVENTS_URL = previousEventsUrl;
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  describe("deriveEventsUrlFromAppUrl", () => {
    it("prepends events subdomain to root domain", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://example.com")).toBe("https://events.example.com");
    });

    it("replaces app subdomain with events", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://app.example.com")).toBe("https://events.example.com");
    });

    it("replaces any first subdomain with events", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://dashboard.example.com")).toBe("https://events.example.com");
    });

    it("preserves events subdomain if already present", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://events.example.com")).toBe("https://events.example.com");
    });

    it("strips pathname, query and hash", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://app.example.com/some/path?query=1#hash")).toBe("https://events.example.com");
    });

    it("strips trailing slash", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://example.com/")).toBe("https://events.example.com");
    });

    it("returns null for invalid URL", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("not a url")).toBeNull();
    });

    it("returns null for single-label hostname", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://localhost")).toBeNull();
    });

    it("handles multi-level subdomains", async () => {
      vi.resetModules();
      const { deriveEventsUrlFromAppUrl } = await import("../lib/github/generate");
      expect(deriveEventsUrlFromAppUrl("https://app.staging.example.com")).toBe("https://events.staging.example.com");
    });
  });

  describe("generatePullRequestForDetection", () => {
    it("sets status to analysis_failed when repo name is invalid", async () => {
      vi.resetModules();
      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
      getInstallationOctokitSpy = vi.fn();
      createAnalyticsBranchSpy = vi.fn();
      commitAnalyticsFilesSpy = vi.fn();
      openAnalyticsPullRequestSpy = vi.fn();

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "invalid-repo-name",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: "app/layout.tsx",
          existingAnalytics: [],
          isMonorepo: false,
          error: null,
        },
      });

      expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({
        repoId: BigInt(123),
        status: "analysis_failed",
      });
      expect(getInstallationOctokitSpy).not.toHaveBeenCalled();
    });

    it("sets status to analysis_failed when detection has no framework", async () => {
      vi.resetModules();
      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
      getInstallationOctokitSpy = vi.fn();
      createAnalyticsBranchSpy = vi.fn();
      commitAnalyticsFilesSpy = vi.fn();
      openAnalyticsPullRequestSpy = vi.fn();

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: null,
          entryPoint: null,
          existingAnalytics: [],
          isMonorepo: false,
          error: "unsupported_framework",
        },
      });

      expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({
        repoId: BigInt(123),
        status: "analysis_failed",
      });
    });

    it("sets status to analysis_failed when detection has no entry point", async () => {
      vi.resetModules();
      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
      getInstallationOctokitSpy = vi.fn();
      createAnalyticsBranchSpy = vi.fn();
      commitAnalyticsFilesSpy = vi.fn();
      openAnalyticsPullRequestSpy = vi.fn();

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: null,
          existingAnalytics: [],
          isMonorepo: false,
          error: "entry_point_not_found",
        },
      });

      expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({
        repoId: BigInt(123),
        status: "analysis_failed",
      });
    });

    it("successfully generates PR when all parameters are valid", async () => {
      vi.resetModules();
      process.env.NEXT_PUBLIC_EVENTS_URL = "https://events.example.com";

      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);

      const mockOctokit = {
        repos: {
          get: vi.fn().mockResolvedValue({ data: { default_branch: "main" } }),
        },
      };
      getInstallationOctokitSpy = vi.fn().mockResolvedValue(mockOctokit);
      createAnalyticsBranchSpy = vi.fn().mockResolvedValue("add-fast-pr-analytics");
      commitAnalyticsFilesSpy = vi.fn().mockResolvedValue({ componentFilePath: "components/fast-pr-analytics.tsx" });
      openAnalyticsPullRequestSpy = vi.fn().mockResolvedValue({ prNumber: 1, prUrl: "https://github.com/owner/repo/pull/1" });

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: "app/layout.tsx",
          existingAnalytics: [],
          isMonorepo: false,
          error: null,
        },
      });

      expect(getInstallationOctokitSpy).toHaveBeenCalledWith(456);
      expect(createAnalyticsBranchSpy).toHaveBeenCalledWith(mockOctokit, { owner: "owner", repo: "repo" });
      expect(commitAnalyticsFilesSpy).toHaveBeenCalledWith(
        mockOctokit,
        expect.objectContaining({
          owner: "owner",
          repo: "repo",
          branch: "add-fast-pr-analytics",
          defaultBranch: "main",
          projectId: "proj_123",
          detection: expect.objectContaining({
            framework: "nextjs-app",
            entryPoint: "app/layout.tsx",
          }),
          eventsUrl: "https://events.example.com",
        }),
      );
      expect(openAnalyticsPullRequestSpy).toHaveBeenCalled();
    });

    it("sets status to analysis_failed when PR generation throws", async () => {
      vi.resetModules();
      process.env.NEXT_PUBLIC_EVENTS_URL = "https://events.example.com";

      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
      getInstallationOctokitSpy = vi.fn().mockRejectedValue(new Error("Installation not found"));
      createAnalyticsBranchSpy = vi.fn();
      commitAnalyticsFilesSpy = vi.fn();
      openAnalyticsPullRequestSpy = vi.fn();

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: "app/layout.tsx",
          existingAnalytics: [],
          isMonorepo: false,
          error: null,
        },
      });

      expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({
        repoId: BigInt(123),
        status: "analysis_failed",
      });
    });

    it("handles repo names with extra slashes", async () => {
      vi.resetModules();
      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);
      getInstallationOctokitSpy = vi.fn();
      createAnalyticsBranchSpy = vi.fn();
      commitAnalyticsFilesSpy = vi.fn();
      openAnalyticsPullRequestSpy = vi.fn();

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo/extra",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: "app/layout.tsx",
          existingAnalytics: [],
          isMonorepo: false,
          error: null,
        },
      });

      expect(setProjectStatusByRepoIdSpy).toHaveBeenCalledWith({
        repoId: BigInt(123),
        status: "analysis_failed",
      });
    });

    it("uses fallback events URL when env vars are not set", async () => {
      vi.resetModules();
      delete process.env.NEXT_PUBLIC_EVENTS_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);

      const mockOctokit = {
        repos: {
          get: vi.fn().mockResolvedValue({ data: { default_branch: "main" } }),
        },
      };
      getInstallationOctokitSpy = vi.fn().mockResolvedValue(mockOctokit);
      createAnalyticsBranchSpy = vi.fn().mockResolvedValue("add-fast-pr-analytics");
      commitAnalyticsFilesSpy = vi.fn().mockResolvedValue({ componentFilePath: "components/fast-pr-analytics.tsx" });
      openAnalyticsPullRequestSpy = vi.fn().mockResolvedValue({ prNumber: 1, prUrl: "https://github.com/owner/repo/pull/1" });

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: "app/layout.tsx",
          existingAnalytics: [],
          isMonorepo: false,
          error: null,
        },
      });

      expect(commitAnalyticsFilesSpy).toHaveBeenCalledWith(
        mockOctokit,
        expect.objectContaining({
          eventsUrl: "https://events.productname.com",
        }),
      );
    });

    it("derives events URL from app URL when explicit events URL is not set", async () => {
      vi.resetModules();
      delete process.env.NEXT_PUBLIC_EVENTS_URL;
      process.env.NEXT_PUBLIC_APP_URL = "https://app.myproduct.io";

      setProjectStatusByRepoIdSpy = vi.fn().mockResolvedValue(undefined);

      const mockOctokit = {
        repos: {
          get: vi.fn().mockResolvedValue({ data: { default_branch: "main" } }),
        },
      };
      getInstallationOctokitSpy = vi.fn().mockResolvedValue(mockOctokit);
      createAnalyticsBranchSpy = vi.fn().mockResolvedValue("add-fast-pr-analytics");
      commitAnalyticsFilesSpy = vi.fn().mockResolvedValue({ componentFilePath: "components/fast-pr-analytics.tsx" });
      openAnalyticsPullRequestSpy = vi.fn().mockResolvedValue({ prNumber: 1, prUrl: "https://github.com/owner/repo/pull/1" });

      const { generatePullRequestForDetection } = await import("../lib/github/generate");
      await generatePullRequestForDetection({
        repoId: BigInt(123),
        repoFullName: "owner/repo",
        installationId: BigInt(456),
        projectId: "proj_123",
        detection: {
          framework: "nextjs-app",
          entryPoint: "app/layout.tsx",
          existingAnalytics: [],
          isMonorepo: false,
          error: null,
        },
      });

      expect(commitAnalyticsFilesSpy).toHaveBeenCalledWith(
        mockOctokit,
        expect.objectContaining({
          eventsUrl: "https://events.myproduct.io",
        }),
      );
    });
  });
});
