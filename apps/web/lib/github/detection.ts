type GitHubContentFile = {
  type: "file";
  encoding?: string;
  content?: string;
};

type GitHubContentResponse = { data: GitHubContentFile | { type: string } | unknown };

export type OctokitLike = {
  repos: {
    getContent: (params: { owner: string; repo: string; path: string; ref?: string }) => Promise<GitHubContentResponse>;
  };
};

export type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: unknown;
};

export type PackageJsonAnalysis = {
  nextVersion: string | null;
  existingAnalytics: string[];
  hasWorkspaces: boolean;
};

export type DetectedFramework = "nextjs-app" | "nextjs-pages" | null;

export type RouterDetectionResult = {
  framework: DetectedFramework;
  entryPoint: string | null;
};

const ANALYTICS_PACKAGES = [
  "posthog-js",
  "posthog-node",
  "@amplitude/analytics-browser",
  "mixpanel-browser",
  "@segment/analytics-next",
  "@vercel/analytics",
  "plausible-tracker",
  "@google-analytics/data",
  "ga-4-react",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.status === 404;
}

function decodeGitHubFileContent(file: GitHubContentFile): string | null {
  if (!file.content) return null;
  if (!file.encoding || file.encoding === "base64") {
    return Buffer.from(file.content, "base64").toString("utf8");
  }
  return null;
}

export async function fetchPackageJson(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  options?: { ref?: string },
): Promise<PackageJson | null> {
  try {
    const response = await octokit.repos.getContent({ owner, repo, path: "package.json", ref: options?.ref });
    const data = response.data;
    if (!isRecord(data) || data.type !== "file") return null;
    const content = decodeGitHubFileContent(data as GitHubContentFile);
    if (!content) return null;
    return JSON.parse(content) as PackageJson;
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

export function analyzePackageJson(packageJson: PackageJson): PackageJsonAnalysis {
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const allDeps = { ...dependencies, ...devDependencies };

  const nextVersion = typeof allDeps.next === "string" ? allDeps.next : null;
  const existingAnalytics = ANALYTICS_PACKAGES.filter((name) => typeof allDeps[name] === "string");
  const hasWorkspaces = Array.isArray(packageJson.workspaces) || (isRecord(packageJson.workspaces) && packageJson.workspaces);

  return { nextVersion, existingAnalytics: [...existingAnalytics], hasWorkspaces: Boolean(hasWorkspaces) };
}

export async function fileExists(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  path: string,
  options?: { ref?: string },
): Promise<boolean> {
  try {
    const response = await octokit.repos.getContent({ owner, repo, path, ref: options?.ref });
    const data = response.data;
    return isRecord(data) && data.type === "file";
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

export async function findFirstExistingPath(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  paths: string[],
  options?: { ref?: string },
): Promise<string | null> {
  for (const path of paths) {
    if (await fileExists(octokit, owner, repo, path, options)) return path;
  }
  return null;
}

const APP_ROUTER_ENTRYPOINT_CANDIDATES = [
  "app/layout.tsx",
  "app/layout.jsx",
  "app/layout.js",
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "src/app/layout.js",
];

const PAGES_ROUTER_ENTRYPOINT_CANDIDATES = [
  "pages/_app.tsx",
  "pages/_app.jsx",
  "pages/_app.js",
  "src/pages/_app.tsx",
  "src/pages/_app.jsx",
  "src/pages/_app.js",
];

export async function detectNextRouter(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  options?: { ref?: string },
): Promise<RouterDetectionResult> {
  const appEntryPoint = await findFirstExistingPath(
    octokit,
    owner,
    repo,
    APP_ROUTER_ENTRYPOINT_CANDIDATES,
    options,
  );
  if (appEntryPoint) return { framework: "nextjs-app", entryPoint: appEntryPoint };

  const pagesEntryPoint = await findFirstExistingPath(
    octokit,
    owner,
    repo,
    PAGES_ROUTER_ENTRYPOINT_CANDIDATES,
    options,
  );
  if (pagesEntryPoint) return { framework: "nextjs-pages", entryPoint: pagesEntryPoint };

  return { framework: null, entryPoint: null };
}
