import path from "node:path";

export const ANALYTICS_COMPONENT_FILE_BASENAME = "fast-pr-analytics";

export function hasAtAlias(tsconfig: unknown): boolean {
  if (!tsconfig || typeof tsconfig !== "object") return false;
  const compilerOptions = (tsconfig as Record<string, unknown>).compilerOptions;
  if (!compilerOptions || typeof compilerOptions !== "object") return false;
  const paths = (compilerOptions as Record<string, unknown>).paths;
  if (!paths || typeof paths !== "object") return false;
  return Object.prototype.hasOwnProperty.call(paths, "@/*");
}

export function resolveAnalyticsPaths(params: {
  entryPointPath: string;
  useAtAlias?: boolean;
}): { componentFilePath: string; importPath: string } {
  const usesSrcRoot = params.entryPointPath.startsWith("src/");
  const componentFilePath = usesSrcRoot
    ? `src/components/${ANALYTICS_COMPONENT_FILE_BASENAME}.tsx`
    : `components/${ANALYTICS_COMPONENT_FILE_BASENAME}.tsx`;

  if (params.useAtAlias) {
    return { componentFilePath, importPath: `@/components/${ANALYTICS_COMPONENT_FILE_BASENAME}` };
  }

  const entryPointDir = path.posix.dirname(params.entryPointPath);
  const rel = path.posix.relative(entryPointDir, componentFilePath).replace(/\.tsx$/, "");
  const importPath = rel.startsWith(".") ? rel : `./${rel}`;
  return { componentFilePath, importPath };
}
