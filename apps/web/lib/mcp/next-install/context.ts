import { mcpRepoContextSchema, type McpRepoContextInput } from "../tools/schemas";

const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;

const LOCKFILE_NAMES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]);
const CONFIG_FILE_NAMES = new Set([
  "tsconfig.json",
  "jsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.cjs",
  "next.config.ts",
]);

export type RepoContextValidationReason =
  | "invalid_schema"
  | "unsupported_framework"
  | "missing_package_json"
  | "missing_entrypoint"
  | "disallowed_file"
  | "request_too_large";

export type ValidatedRepoContext = {
  repo: McpRepoContextInput["repo"] & {
    workspaceRoot: string;
    appRoot: string;
    dependencyTarget: string;
  };
  framework: McpRepoContextInput["framework"] & {
    entrypoint: string;
  };
  files: Record<string, string>;
  packageJsonPath: string;
  entrypointPath: string;
  totalBytes: number;
};

export type RepoContextValidationResult =
  | { ok: true; context: ValidatedRepoContext }
  | { ok: false; reason: RepoContextValidationReason; message: string; path?: string };

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function pathBasename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function hasUrlScheme(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path);
}

function decodePathSegment(segment: string): string | null {
  let decoded = segment;
  for (let i = 0; i < 2; i += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return null;
    }
  }
  return decoded;
}

function normalizeRelativePath(path: string, options: { allowDot?: boolean } = {}): string | null {
  const trimmed = path.trim().replace(/\/+$/, "");
  if (options.allowDot && trimmed === ".") return ".";
  if (!trimmed || trimmed === ".") return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("~")) return null;
  if (trimmed.includes("\\")) return null;
  if (/^[a-z]:[\\/]/i.test(trimmed)) return null;
  if (hasUrlScheme(trimmed)) return null;

  const segments = trimmed.split("/");
  for (const segment of segments) {
    if (!segment) return null;
    const decoded = decodePathSegment(segment);
    if (!decoded || decoded === "." || decoded === "..") return null;
  }

  return segments.join("/");
}

function joinAppPath(appRoot: string, path: string): string {
  return appRoot === "." ? path : `${appRoot}/${path}`;
}

function isEntrypointForFramework(kind: McpRepoContextInput["framework"]["kind"], path: string): boolean {
  if (!/\.(tsx|jsx)$/.test(path)) return false;
  if (kind === "nextjs-app-router") return /(^|\/)(src\/)?app\/layout\.(tsx|jsx)$/.test(path);
  if (kind === "nextjs-pages-router") return /(^|\/)(src\/)?pages\/_app\.(tsx|jsx)$/.test(path);
  return false;
}

export function isNextEntrypointPath(path: string): boolean {
  return /(^|\/)(src\/)?app\/layout\.(tsx|jsx)$/.test(path) || /(^|\/)(src\/)?pages\/_app\.(tsx|jsx)$/.test(path);
}

function isTallyWrapperPath(path: string): boolean {
  return /(^|\/)(src\/)?components\/tally-analytics\.(tsx|jsx)$/.test(path);
}

function isSensitiveOrUnsupportedFile(path: string): boolean {
  const basename = pathBasename(path).toLowerCase();
  if (basename === ".env" || basename.startsWith(".env.")) return true;
  if (LOCKFILE_NAMES.has(basename)) return true;
  if (basename === "id_rsa" || basename === "id_dsa" || basename === "id_ed25519") return true;
  if (/\.(pem|key|p12|pfx)$/i.test(basename)) return true;
  return /credential|secret|private|token/.test(basename);
}

function containsBinaryContent(content: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content);
}

function isAllowedContextPath(path: string, context: { appRoot: string; dependencyTarget: string; entrypoint: string }): boolean {
  if (path === context.dependencyTarget) return true;
  if (path === context.entrypoint) return true;
  if (pathBasename(path) === "package.json") return true;
  if (isNextEntrypointPath(path)) return true;
  if (isTallyWrapperPath(path)) return true;
  if (path === "pnpm-workspace.yaml") return true;

  for (const name of CONFIG_FILE_NAMES) {
    if (path === joinAppPath(context.appRoot, name)) return true;
  }

  return false;
}

function fail(reason: RepoContextValidationReason, message: string, path?: string): RepoContextValidationResult {
  return { ok: false, reason, message, path };
}

export function validateRepoContext(input: unknown): RepoContextValidationResult {
  const parsed = mcpRepoContextSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_schema", "Repo context does not match the MCP input schema");

  const repo = parsed.data.repo;
  const framework = parsed.data.framework;
  const workspaceRoot = normalizeRelativePath(repo.workspaceRoot, { allowDot: true });
  const appRoot = normalizeRelativePath(repo.appRoot, { allowDot: true });
  const dependencyTarget = normalizeRelativePath(repo.dependencyTarget);
  const entrypoint = normalizeRelativePath(framework.entrypoint);

  if (!workspaceRoot) return fail("disallowed_file", "workspaceRoot must be a safe relative path", repo.workspaceRoot);
  if (!appRoot) return fail("disallowed_file", "appRoot must be a safe relative path", repo.appRoot);
  if (!dependencyTarget) return fail("disallowed_file", "dependencyTarget must be a safe relative path", repo.dependencyTarget);
  if (!entrypoint) return fail("disallowed_file", "entrypoint must be a safe relative path", framework.entrypoint);
  if (!dependencyTarget.endsWith("/package.json") && dependencyTarget !== "package.json") {
    return fail("missing_package_json", "dependencyTarget must point to package.json", dependencyTarget);
  }
  if (!isEntrypointForFramework(framework.kind, entrypoint)) {
    return fail("unsupported_framework", "framework.entrypoint is not a supported Next.js TSX/JSX entrypoint", entrypoint);
  }

  const normalizedFiles: Record<string, string> = {};
  let totalBytes = 0;

  for (const [rawPath, rawContent] of Object.entries(parsed.data.files)) {
    const path = normalizeRelativePath(rawPath);
    if (!path) return fail("disallowed_file", "files must use safe relative paths", rawPath);
    if (isSensitiveOrUnsupportedFile(path)) return fail("disallowed_file", "file is not allowed in MCP repo context", path);
    if (!isAllowedContextPath(path, { appRoot, dependencyTarget, entrypoint })) {
      return fail("disallowed_file", "file is outside the MCP repo context allowlist", path);
    }

    const content = rawContent.replace(/\r\n?/g, "\n");
    if (containsBinaryContent(content)) return fail("disallowed_file", "binary file content is not allowed", path);

    const size = byteLength(content);
    if (size > MAX_FILE_BYTES) return fail("request_too_large", "file content exceeds the 64 KB per-file limit", path);

    totalBytes += size;
    if (totalBytes > MAX_TOTAL_BYTES) return fail("request_too_large", "repo context exceeds the 256 KB total limit");
    normalizedFiles[path] = content;
  }

  if (!Object.prototype.hasOwnProperty.call(normalizedFiles, dependencyTarget)) {
    return fail("missing_package_json", "repo context is missing dependencyTarget package.json", dependencyTarget);
  }
  if (!Object.prototype.hasOwnProperty.call(normalizedFiles, entrypoint)) {
    return fail("missing_entrypoint", "repo context is missing framework.entrypoint", entrypoint);
  }

  return {
    ok: true,
    context: {
      repo: {
        ...repo,
        workspaceRoot,
        appRoot,
        dependencyTarget,
      },
      framework: {
        ...framework,
        entrypoint,
      },
      files: normalizedFiles,
      packageJsonPath: dependencyTarget,
      entrypointPath: entrypoint,
      totalBytes,
    },
  };
}
