import { validateRepoContext } from "./context";
import { detectNextInstallTarget, type NextInstallTarget } from "./detect";
import { createOrReuseInstallProject } from "./project-reuse";

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
    }
  | {
      status: "unsupported";
      reason:
        | "unsupported_framework"
        | "ambiguous_app_root"
        | "multiple_matching_projects"
        | "disallowed_file"
        | "request_too_large"
        | "patch_not_confident";
      message?: string;
    }
  | {
      status: "needs_context";
      missingFiles: string[];
    };

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

  return {
    status: "ready",
    projectId: project.projectId,
    dashboardUrl: project.dashboardUrl,
    projectCreated: project.created,
    target: detection.target,
  };
}
