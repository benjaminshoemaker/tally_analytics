export const TALLY_SDK_PACKAGE = "@tally-analytics/sdk";
export const TALLY_SDK_VERSION = "^0.1.0";

export type PackageJsonEditResult = {
  content: string;
  changed: boolean;
};

type PackageJsonObject = {
  dependencies?: Record<string, string>;
  [key: string]: unknown;
};

export function addTallySdkDependency(packageJsonContent: string): PackageJsonEditResult {
  const parsed = JSON.parse(packageJsonContent) as PackageJsonObject;
  const dependencies = { ...(parsed.dependencies ?? {}) };

  if (dependencies[TALLY_SDK_PACKAGE] === TALLY_SDK_VERSION) {
    return { content: `${JSON.stringify(parsed, null, 2)}\n`, changed: false };
  }

  dependencies[TALLY_SDK_PACKAGE] = dependencies[TALLY_SDK_PACKAGE] ?? TALLY_SDK_VERSION;
  const updated = {
    ...parsed,
    dependencies,
  };

  return {
    content: `${JSON.stringify(updated, null, 2)}\n`,
    changed: true,
  };
}
