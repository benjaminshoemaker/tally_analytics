import {
  analyzePackageJson,
  detectMonorepo,
  detectNextRouter,
  fetchPackageJson,
  type DetectedFramework,
  type OctokitLike,
} from "./detection";

export type FrameworkDetectionError =
  | "no_package_json"
  | "unsupported_framework"
  | "monorepo_detected"
  | "entry_point_not_found";

export type FrameworkDetectionResult = {
  framework: DetectedFramework;
  entryPoint: string | null;
  existingAnalytics: string[];
  isMonorepo: boolean;
  error: FrameworkDetectionError | null;
};

export async function detectFramework(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  options?: { ref?: string },
): Promise<FrameworkDetectionResult> {
  const packageJson = await fetchPackageJson(octokit, owner, repo, options);
  if (!packageJson) {
    return {
      framework: null,
      entryPoint: null,
      existingAnalytics: [],
      isMonorepo: false,
      error: "no_package_json",
    };
  }

  const { nextVersion, existingAnalytics } = analyzePackageJson(packageJson);
  if (!nextVersion) {
    return {
      framework: null,
      entryPoint: null,
      existingAnalytics,
      isMonorepo: false,
      error: "unsupported_framework",
    };
  }

  const isMonorepo = await detectMonorepo(octokit, owner, repo, packageJson, options);
  if (isMonorepo) {
    return {
      framework: null,
      entryPoint: null,
      existingAnalytics,
      isMonorepo: true,
      error: "monorepo_detected",
    };
  }

  const router = await detectNextRouter(octokit, owner, repo, options);
  if (!router.framework || !router.entryPoint) {
    return {
      framework: null,
      entryPoint: null,
      existingAnalytics,
      isMonorepo: false,
      error: "entry_point_not_found",
    };
  }

  return {
    framework: router.framework,
    entryPoint: router.entryPoint,
    existingAnalytics,
    isMonorepo: false,
    error: null,
  };
}

