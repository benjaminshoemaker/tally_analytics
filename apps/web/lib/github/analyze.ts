import { getProjectIdByRepoId, setProjectStatusByRepoId, updateProjectDetectionByRepoId } from "../db/queries/projects";

import { getInstallationOctokit } from "./app";
import { detectFramework } from "./detect-framework";
import { generatePullRequestForDetection } from "./generate";

function toSafeNumber(value: bigint): number {
  const asNumber = Number(value);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error(`Installation ID is too large to safely convert to number: ${value.toString()}`);
  }
  return asNumber;
}

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } | null {
  const [owner, repo, ...rest] = repoFullName.split("/");
  if (!owner || !repo || rest.length > 0) return null;
  return { owner, repo };
}

export async function analyzeRepository(params: {
  repoId: bigint;
  repoFullName: string;
  installationId: bigint;
}): Promise<void> {
  await setProjectStatusByRepoId({ repoId: params.repoId, status: "analyzing" });

  const parsed = parseRepoFullName(params.repoFullName);
  if (!parsed) {
    await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
    return;
  }

  try {
    const installationId = toSafeNumber(params.installationId);
    const octokit = await getInstallationOctokit(installationId);
    const result = await detectFramework(octokit as never, parsed.owner, parsed.repo);

    await updateProjectDetectionByRepoId({
      repoId: params.repoId,
      detectedFramework: result.framework,
      detectedAnalytics: result.existingAnalytics,
    });

    if (result.error === "unsupported_framework" || result.error === "monorepo_detected") {
      await setProjectStatusByRepoId({ repoId: params.repoId, status: "unsupported" });
      return;
    }

    if (result.error) {
      await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
      return;
    }

    const projectId = await getProjectIdByRepoId(params.repoId);
    if (!projectId) {
      await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
      return;
    }

    await generatePullRequestForDetection({
      repoId: params.repoId,
      repoFullName: params.repoFullName,
      installationId: params.installationId,
      projectId,
      detection: result,
    });
  } catch {
    await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
  }
}
