import { renderAppRouterAnalyticsComponent } from "./templates/app-router";
import { renderPagesRouterAnalyticsHook } from "./templates/pages-router";
import { hasAtAlias, resolveAnalyticsPaths } from "./templates/paths";
import { insertAnalyticsIntoAppRouterLayout, insertAnalyticsIntoPagesRouterApp } from "./templates/insert-analytics";
import { setProjectPullRequestByRepoId } from "../db/queries/projects";

type OctokitResponse<T> = { data: T };

type RepoResponse = OctokitResponse<{ default_branch: string }>;
type RefResponse = OctokitResponse<{ object: { sha: string } }>;

type ContentFileResponse = OctokitResponse<{
  type: "file";
  sha: string;
  encoding?: string;
  content?: string;
}>;

export type PrOctokitLike = {
  repos: {
    get: (params: { owner: string; repo: string }) => Promise<RepoResponse>;
    getContent: (params: { owner: string; repo: string; path: string; ref?: string }) => Promise<ContentFileResponse>;
    createOrUpdateFileContents: (params: {
      owner: string;
      repo: string;
      branch: string;
      path: string;
      message: string;
      content: string;
      sha?: string;
    }) => Promise<unknown>;
  };
  git: {
    getRef: (params: { owner: string; repo: string; ref: string }) => Promise<RefResponse>;
    createRef: (params: { owner: string; repo: string; ref: string; sha: string }) => Promise<unknown>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBranchExistsError(error: unknown): boolean {
  return isRecord(error) && error.status === 422;
}

const BRANCH_PREFIX = "add-fast-pr-analytics";

export async function createAnalyticsBranch(
  octokit: PrOctokitLike,
  params: { owner: string; repo: string },
): Promise<string> {
  const { data: repoData } = await octokit.repos.get({ owner: params.owner, repo: params.repo });
  const defaultBranch = repoData.default_branch;

  const { data: ref } = await octokit.git.getRef({
    owner: params.owner,
    repo: params.repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = ref.object.sha;

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const branchName = suffix === 1 ? BRANCH_PREFIX : `${BRANCH_PREFIX}-${suffix}`;
    try {
      await octokit.git.createRef({
        owner: params.owner,
        repo: params.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });
      return branchName;
    } catch (error) {
      if (isBranchExistsError(error)) continue;
      throw error;
    }
  }

  throw new Error(`Failed to create a unique analytics branch after 999 attempts (prefix: ${BRANCH_PREFIX})`);
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.status === 404;
}

async function fetchJsonFileIfExists(
  octokit: PrOctokitLike,
  params: { owner: string; repo: string; path: string; ref?: string },
): Promise<unknown | null> {
  try {
    const response = await octokit.repos.getContent(params);
    const file = response.data;
    if (file.type !== "file" || !file.content) return null;
    const text = Buffer.from(file.content, "base64").toString("utf8");
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function fetchTextFile(
  octokit: PrOctokitLike,
  params: { owner: string; repo: string; path: string; ref?: string },
): Promise<{ sha: string; content: string }> {
  const response = await octokit.repos.getContent(params);
  const file = response.data;
  const content = file.content ? Buffer.from(file.content, "base64").toString("utf8") : "";
  return { sha: file.sha, content };
}

function encodeBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

export async function commitAnalyticsFiles(
  octokit: PrOctokitLike,
  params: {
    owner: string;
    repo: string;
    branch: string;
    defaultBranch: string;
    projectId: string;
    detection: { framework: "nextjs-app" | "nextjs-pages"; entryPoint: string };
    eventsUrl: string;
  },
): Promise<{ componentFilePath: string }> {
  const tsconfig =
    (await fetchJsonFileIfExists(octokit, {
      owner: params.owner,
      repo: params.repo,
      path: "tsconfig.json",
      ref: params.defaultBranch,
    })) ??
    (await fetchJsonFileIfExists(octokit, {
      owner: params.owner,
      repo: params.repo,
      path: "jsconfig.json",
      ref: params.defaultBranch,
    }));

  const useAtAlias = tsconfig ? hasAtAlias(tsconfig) : false;
  const paths = resolveAnalyticsPaths({ entryPointPath: params.detection.entryPoint, useAtAlias });

  const componentContent =
    params.detection.framework === "nextjs-app"
      ? renderAppRouterAnalyticsComponent({ projectId: params.projectId, eventsUrl: params.eventsUrl })
      : renderPagesRouterAnalyticsHook({ projectId: params.projectId, eventsUrl: params.eventsUrl });

  await octokit.repos.createOrUpdateFileContents({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    path: paths.componentFilePath,
    message: `Add Fast PR Analytics component`,
    content: encodeBase64(componentContent),
  });

  const entryPointFile = await fetchTextFile(octokit, {
    owner: params.owner,
    repo: params.repo,
    path: params.detection.entryPoint,
    ref: params.defaultBranch,
  });

  const updatedEntryPointContent =
    params.detection.framework === "nextjs-app"
      ? insertAnalyticsIntoAppRouterLayout({
          content: entryPointFile.content,
          importPath: paths.importPath,
          componentName: "FastPrAnalytics",
        })
      : insertAnalyticsIntoPagesRouterApp({
          content: entryPointFile.content,
          importPath: paths.importPath,
          hookName: "useFastPrAnalytics",
        });

  await octokit.repos.createOrUpdateFileContents({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    path: params.detection.entryPoint,
    message: `Add Fast PR Analytics to ${params.detection.entryPoint}`,
    content: encodeBase64(updatedEntryPointContent),
    sha: entryPointFile.sha,
  });

  return { componentFilePath: paths.componentFilePath };
}

type PullResponse = OctokitResponse<{ number: number; html_url: string }>;
type PullListResponse = OctokitResponse<Array<{ number: number; html_url: string }>>;

export type PullsOctokitLike = {
  pulls: {
    create: (params: {
      owner: string;
      repo: string;
      title: string;
      head: string;
      base: string;
      body: string;
    }) => Promise<PullResponse>;
    list: (params: { owner: string; repo: string; head: string; state: "open" | "closed" | "all" }) => Promise<PullListResponse>;
  };
};

function generatePrBody(params: { projectId: string; entryPoint: string }): string {
  return [
    "This PR adds Fast PR Analytics for automatic page view tracking.",
    "",
    "## Changes",
    `- Added analytics component in \`components/fast-pr-analytics.tsx\``,
    `- Added initialization in \`${params.entryPoint}\``,
    "",
    "## What happens next",
    "1. Review and merge this PR",
    "2. Deploy via your normal process",
    `3. Visit ${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.productname.com"}/projects/${params.projectId} to see your analytics`,
  ].join("\n");
}

export async function openAnalyticsPullRequest(
  octokit: PullsOctokitLike,
  params: {
    repoId: bigint;
    owner: string;
    repo: string;
    branch: string;
    defaultBranch: string;
    projectId: string;
    entryPoint: string;
  },
): Promise<{ prNumber: number; prUrl: string; alreadyExists: boolean }> {
  const title = "Add Fast PR Analytics";
  const body = generatePrBody({ projectId: params.projectId, entryPoint: params.entryPoint });

  try {
    const { data: pr } = await octokit.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title,
      head: params.branch,
      base: params.defaultBranch,
      body,
    });

    await setProjectPullRequestByRepoId({ repoId: params.repoId, prNumber: pr.number, prUrl: pr.html_url });
    return { prNumber: pr.number, prUrl: pr.html_url, alreadyExists: false };
  } catch (error) {
    if (!isBranchExistsError(error)) throw error;

    const { data: prs } = await octokit.pulls.list({
      owner: params.owner,
      repo: params.repo,
      head: `${params.owner}:${params.branch}`,
      state: "open",
    });
    const existing = prs[0];
    if (!existing) throw new Error(`PR already exists for branch ${params.branch}, but no open PR was found`);

    await setProjectPullRequestByRepoId({ repoId: params.repoId, prNumber: existing.number, prUrl: existing.html_url });
    return { prNumber: existing.number, prUrl: existing.html_url, alreadyExists: true };
  }
}
