import path from "node:path";

import {
  insertAnalyticsIntoAppRouterLayout,
  insertAnalyticsIntoPagesRouterApp,
} from "../../github/templates/insert-analytics";
import type { NextInstallTarget } from "./detect";

export const TALLY_ANALYTICS_BASENAME = "tally-analytics";
export const TALLY_ANALYTICS_COMPONENT = "TallyAnalytics";
export const TALLY_ANALYTICS_HOOK = "useTallyAnalytics";

export type WrapperPaths = {
  wrapperFilePath: string;
  wrapperImportPath: string;
  extension: ".tsx" | ".jsx";
};

export function resolveTallyWrapperPaths(target: Pick<NextInstallTarget, "entrypointPath">): WrapperPaths {
  const extension = target.entrypointPath.endsWith(".jsx") ? ".jsx" : ".tsx";
  const entrypointDir = path.posix.dirname(target.entrypointPath);
  const usesSrcRoot = /(^|\/)src\/(app|pages)\//.test(target.entrypointPath);
  const appRootPrefix = usesSrcRoot
    ? target.entrypointPath.slice(0, target.entrypointPath.indexOf("src/"))
    : target.entrypointPath.replace(/(?:src\/)?(?:app\/layout|pages\/_app)\.(tsx|jsx)$/, "");
  const wrapperFilePath = `${appRootPrefix}${usesSrcRoot ? "src/" : ""}components/${TALLY_ANALYTICS_BASENAME}${extension}`;
  const relativeImport = path.posix.relative(entrypointDir, wrapperFilePath).replace(/\.(tsx|jsx)$/, "");
  const wrapperImportPath = relativeImport.startsWith(".") ? relativeImport : `./${relativeImport}`;

  return { wrapperFilePath, wrapperImportPath, extension };
}

export function renderTallyWrapper(params: { router: NextInstallTarget["router"]; projectId: string }): string {
  if (params.router === "app") {
    return `'use client';

import { AnalyticsAppRouter, init } from '@tally-analytics/sdk';

init({ projectId: '${params.projectId}' });

export function ${TALLY_ANALYTICS_COMPONENT}() {
  return <AnalyticsAppRouter />;
}
`;
  }

  return `import { init, useAnalyticsPagesRouter } from '@tally-analytics/sdk';

init({ projectId: '${params.projectId}' });

export function ${TALLY_ANALYTICS_HOOK}() {
  useAnalyticsPagesRouter();
}
`;
}

export function insertTallyIntoEntrypoint(params: {
  target: Pick<NextInstallTarget, "router">;
  content: string;
  wrapperImportPath: string;
}): string {
  if (params.target.router === "app") {
    return insertAnalyticsIntoAppRouterLayout({
      content: params.content,
      importPath: params.wrapperImportPath,
      componentName: TALLY_ANALYTICS_COMPONENT,
    });
  }

  return insertAnalyticsIntoPagesRouterApp({
    content: params.content,
    importPath: params.wrapperImportPath,
    hookName: TALLY_ANALYTICS_HOOK,
  });
}
