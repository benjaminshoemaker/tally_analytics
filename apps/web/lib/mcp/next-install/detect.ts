import type { ValidatedRepoContext } from "./context";
import { isNextEntrypointPath } from "./context";

export type NextInstallTarget = {
  framework: "nextjs-app-router" | "nextjs-pages-router";
  router: "app" | "pages";
  appRoot: string;
  packageJsonPath: string;
  packageName: string | null;
  entrypointPath: string;
  usesSrcDir: boolean;
  packageManager: "pnpm" | "npm" | "yarn" | "bun";
};

export type NextInstallDetectionResult =
  | { status: "ready"; target: NextInstallTarget }
  | {
      status: "unsupported";
      reason: "unsupported_framework" | "ambiguous_app_root" | "missing_package_json" | "missing_entrypoint";
      message: string;
    };

type ParsedPackageJson = {
  name?: unknown;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
};

function parsePackageJson(content: string): ParsedPackageJson | null {
  try {
    const parsed = JSON.parse(content) as ParsedPackageJson;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function hasNextDependency(packageJson: ParsedPackageJson): boolean {
  return (
    typeof packageJson.dependencies?.next === "string" ||
    typeof packageJson.devDependencies?.next === "string"
  );
}

function packageJsonPaths(context: ValidatedRepoContext): string[] {
  return Object.keys(context.files).filter((path) => path === "package.json" || path.endsWith("/package.json"));
}

function otherNextEntrypoints(context: ValidatedRepoContext): string[] {
  return Object.keys(context.files).filter(
    (path) => path !== context.entrypointPath && isNextEntrypointPath(path),
  );
}

export function detectNextInstallTarget(context: ValidatedRepoContext): NextInstallDetectionResult {
  const packageContent = context.files[context.packageJsonPath];
  if (packageContent === undefined) {
    return { status: "unsupported", reason: "missing_package_json", message: "Missing package.json context" };
  }

  const entrypointContent = context.files[context.entrypointPath];
  if (entrypointContent === undefined) {
    return { status: "unsupported", reason: "missing_entrypoint", message: "Missing Next.js entrypoint context" };
  }

  const packageJson = parsePackageJson(packageContent);
  if (!packageJson || !hasNextDependency(packageJson)) {
    return { status: "unsupported", reason: "unsupported_framework", message: "Target package is not a Next.js app" };
  }

  const extraPackageJsons = packageJsonPaths(context).filter((path) => path !== context.packageJsonPath);
  if (context.repo.appRoot === "." && extraPackageJsons.length > 0) {
    return {
      status: "unsupported",
      reason: "ambiguous_app_root",
      message: "Multiple package.json files were supplied without an explicit app root",
    };
  }

  if (otherNextEntrypoints(context).length > 0) {
    return {
      status: "unsupported",
      reason: "ambiguous_app_root",
      message: "Both App Router and Pages Router entrypoints were supplied",
    };
  }

  const router = context.framework.kind === "nextjs-app-router" ? "app" : "pages";
  return {
    status: "ready",
    target: {
      framework: context.framework.kind,
      router,
      appRoot: context.repo.appRoot,
      packageJsonPath: context.packageJsonPath,
      packageName: typeof packageJson.name === "string" ? packageJson.name : null,
      entrypointPath: context.entrypointPath,
      usesSrcDir: /(^|\/)src\/(app|pages)\//.test(context.entrypointPath),
      packageManager: context.repo.packageManager,
    },
  };
}
