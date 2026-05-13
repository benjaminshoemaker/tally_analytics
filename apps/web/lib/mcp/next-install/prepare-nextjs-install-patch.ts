import { validateRepoContext } from "./context";
import { detectNextInstallTarget, type NextInstallTarget } from "./detect";
import { addTallySdkDependency, TALLY_SDK_PACKAGE } from "./package-json";
import { createOrReuseInstallProject } from "./project-reuse";
import {
  insertTallyIntoEntrypoint,
  renderTallyWrapper,
  resolveTallyWrapperPaths,
  TALLY_ANALYTICS_COMPONENT,
  TALLY_ANALYTICS_HOOK,
} from "./templates";
import { unifiedDiff } from "./unified-diff";

export type PrepareNextjsInstallPatchParams = {
  userId: string;
  input: unknown;
};

export type PrepareNextjsInstallPatchResult =
  | {
      status: "ready";
      projectId: string;
      dashboardUrl: string;
      projectCreated: boolean;
      target: NextInstallTarget;
      patchFormat: "unified_diff_v1";
      unifiedDiff: string;
      filesChanged: string[];
      packageInstallCommand: string;
      verification: string[];
    }
  | {
      status: "unsupported";
      reason:
        | "unsupported_framework"
        | "ambiguous_app_root"
        | "multiple_matching_projects"
        | "disallowed_file"
        | "request_too_large"
        | "patch_not_confident"
        | "existing_integration_conflict";
      message?: string;
    }
  | { status: "needs_context"; missingFiles: string[] }
  | { status: "already_installed"; projectId: string; dashboardUrl: string; unifiedDiff: "" };

function packageInstallCommand(packageManager: NextInstallTarget["packageManager"]): string {
  if (packageManager === "pnpm") return "pnpm install";
  if (packageManager === "yarn") return "yarn install";
  if (packageManager === "bun") return "bun install";
  return "npm install";
}

function verificationChecklist(installCommand: string): string[] {
  return [
    "Apply the unified diff with git apply --check before git apply.",
    `Run ${installCommand}. Do not substitute another package manager.`,
    "Run the app's typecheck/build command.",
    "Deploy the app.",
    "Visit one or two pages.",
    "Open the dashboard URL and confirm events appear.",
  ];
}

function hasTallySdkDependency(packageJsonContent: string): boolean {
  try {
    const parsed = JSON.parse(packageJsonContent) as { dependencies?: Record<string, string> };
    return typeof parsed.dependencies?.[TALLY_SDK_PACKAGE] === "string";
  } catch {
    return false;
  }
}

function isAlreadyInstalled(params: {
  packageJsonContent: string;
  wrapperContent: string | undefined;
  entrypointContent: string;
  projectId: string;
  router: NextInstallTarget["router"];
}): boolean {
  const expectedSymbol = params.router === "app" ? TALLY_ANALYTICS_COMPONENT : TALLY_ANALYTICS_HOOK;
  return (
    hasTallySdkDependency(params.packageJsonContent) &&
    typeof params.wrapperContent === "string" &&
    params.wrapperContent.includes(`projectId: '${params.projectId}'`) &&
    params.entrypointContent.includes(expectedSymbol)
  );
}

function hasExistingTallyIntegration(params: {
  packageJsonContent: string;
  wrapperContent: string | undefined;
  entrypointContent: string;
}): boolean {
  return (
    hasTallySdkDependency(params.packageJsonContent) ||
    typeof params.wrapperContent === "string" ||
    params.entrypointContent.includes(TALLY_ANALYTICS_COMPONENT) ||
    params.entrypointContent.includes(TALLY_ANALYTICS_HOOK) ||
    params.entrypointContent.includes("@tally-analytics/sdk")
  );
}

export async function prepareNextjsInstallPatch(
  params: PrepareNextjsInstallPatchParams,
): Promise<PrepareNextjsInstallPatchResult> {
  const validated = validateRepoContext(params.input);
  if (!validated.ok) {
    if (validated.reason === "missing_package_json" && validated.path) {
      return { status: "needs_context", missingFiles: [validated.path] };
    }
    if (validated.reason === "missing_entrypoint" && validated.path) {
      return { status: "needs_context", missingFiles: [validated.path] };
    }
    if (validated.reason === "request_too_large") {
      return { status: "unsupported", reason: "request_too_large", message: validated.message };
    }
    return { status: "unsupported", reason: "disallowed_file", message: validated.message };
  }

  const detection = detectNextInstallTarget(validated.context);
  if (detection.status === "unsupported") {
    if (detection.reason === "missing_package_json") {
      return { status: "needs_context", missingFiles: [validated.context.packageJsonPath] };
    }
    if (detection.reason === "missing_entrypoint") {
      return { status: "needs_context", missingFiles: [validated.context.entrypointPath] };
    }
    return { status: "unsupported", reason: detection.reason, message: detection.message };
  }

  const project = await createOrReuseInstallProject({
    userId: params.userId,
    context: validated.context,
    target: detection.target,
  });

  if (project.status === "unsupported") {
    return { status: "unsupported", reason: project.reason };
  }

  const packageJsonContent = validated.context.files[detection.target.packageJsonPath] ?? "";
  const entrypointContent = validated.context.files[detection.target.entrypointPath] ?? "";
  const paths = resolveTallyWrapperPaths(detection.target);
  const wrapperContent = validated.context.files[paths.wrapperFilePath];

  if (
    isAlreadyInstalled({
      packageJsonContent,
      wrapperContent,
      entrypointContent,
      projectId: project.projectId,
      router: detection.target.router,
    })
  ) {
    return { status: "already_installed", projectId: project.projectId, dashboardUrl: project.dashboardUrl, unifiedDiff: "" };
  }

  if (hasExistingTallyIntegration({ packageJsonContent, wrapperContent, entrypointContent })) {
    return {
      status: "unsupported",
      reason: "existing_integration_conflict",
      message: "Existing Tally integration is present but does not match the current project",
    };
  }

  const packageEdit = addTallySdkDependency(packageJsonContent);
  const installCommand = packageInstallCommand(detection.target.packageManager);
  const renderedWrapper = renderTallyWrapper({ router: detection.target.router, projectId: project.projectId });
  const updatedEntrypoint = insertTallyIntoEntrypoint({
    target: detection.target,
    content: entrypointContent,
    wrapperImportPath: paths.wrapperImportPath,
  });
  const filesChanged = [detection.target.packageJsonPath, paths.wrapperFilePath, detection.target.entrypointPath];
  const patch = unifiedDiff([
    { path: detection.target.packageJsonPath, oldContent: packageJsonContent, newContent: packageEdit.content },
    { path: paths.wrapperFilePath, oldContent: null, newContent: renderedWrapper },
    { path: detection.target.entrypointPath, oldContent: entrypointContent, newContent: updatedEntrypoint },
  ]);

  return {
    status: "ready",
    projectId: project.projectId,
    dashboardUrl: project.dashboardUrl,
    projectCreated: project.created,
    target: detection.target,
    patchFormat: "unified_diff_v1",
    unifiedDiff: patch,
    filesChanged,
    packageInstallCommand: installCommand,
    verification: verificationChecklist(installCommand),
  };
}
