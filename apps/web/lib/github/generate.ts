import { setProjectStatusByRepoId } from "../db/queries/projects";

import { getInstallationOctokit } from "./app";
import type { FrameworkDetectionResult } from "./detect-framework";
import { commitAnalyticsFiles, createAnalyticsBranch, openAnalyticsPullRequest } from "./pr-generator";

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

export function deriveEventsUrlFromAppUrl(appUrl: string): string | null {
  try {
    const url = new URL(appUrl);

    const hostname = url.hostname;
    const labels = hostname.split(".").filter(Boolean);
    if (labels.length < 2) return null;

    if (!hostname.startsWith("events.")) {
      if (labels.length === 2) {
        url.hostname = `events.${hostname}`;
      } else {
        labels[0] = "events";
        url.hostname = labels.join(".");
      }
    }

    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getEventsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_EVENTS_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && appUrl.length > 0) {
    const derived = deriveEventsUrlFromAppUrl(appUrl);
    if (derived) return derived;
  }

  return "https://events.productname.com";
}

export async function generatePullRequestForDetection(params: {
  repoId: bigint;
  repoFullName: string;
  installationId: bigint;
  projectId: string;
  detection: FrameworkDetectionResult;
}): Promise<void> {
  const repo = parseRepoFullName(params.repoFullName);
  if (!repo) {
    await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
    return;
  }

  if (!params.detection.framework || !params.detection.entryPoint) {
    await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
    return;
  }

  try {
    console.info("generate: starting", { repo: params.repoFullName, repoId: params.repoId.toString() });

    const installationId = toSafeNumber(params.installationId);
    const octokit = await getInstallationOctokit(installationId);

    const branch = await createAnalyticsBranch(octokit, { owner: repo.owner, repo: repo.repo });
    const { data: repoData } = await octokit.repos.get({ owner: repo.owner, repo: repo.repo });
    const defaultBranch = repoData.default_branch as string;

    await commitAnalyticsFiles(octokit, {
      owner: repo.owner,
      repo: repo.repo,
      branch,
      defaultBranch,
      projectId: params.projectId,
      detection: { framework: params.detection.framework, entryPoint: params.detection.entryPoint },
      eventsUrl: getEventsUrl(),
    });

    await openAnalyticsPullRequest(octokit, {
      repoId: params.repoId,
      owner: repo.owner,
      repo: repo.repo,
      branch,
      defaultBranch,
      projectId: params.projectId,
      entryPoint: params.detection.entryPoint,
    });

    console.info("generate: completed", { repo: params.repoFullName, repoId: params.repoId.toString(), branch });
  } catch (error) {
    console.error("generate: failed", { repo: params.repoFullName, repoId: params.repoId.toString(), error });
    await setProjectStatusByRepoId({ repoId: params.repoId, status: "analysis_failed" });
  }
}
