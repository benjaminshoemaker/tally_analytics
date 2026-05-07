import { createOrReuseMcpProject } from "../../db/queries/projects";
import type { ValidatedRepoContext } from "./context";
import type { NextInstallTarget } from "./detect";

export type InstallProjectReuseResult = Awaited<ReturnType<typeof createOrReuseMcpProject>>;

export async function createOrReuseInstallProject(params: {
  userId: string;
  context: ValidatedRepoContext;
  target: NextInstallTarget;
}): Promise<InstallProjectReuseResult> {
  return createOrReuseMcpProject({
    userId: params.userId,
    repoName: params.context.repo.name,
    packageName: params.target.packageName,
    gitRemote: params.context.repo.gitRemote,
    appRoot: params.target.appRoot,
    framework: params.target.framework,
    packageManager: params.target.packageManager,
  });
}
