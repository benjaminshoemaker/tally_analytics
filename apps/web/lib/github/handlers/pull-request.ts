import { updateProjectStatusForPullRequestClosed } from "../../db/queries/projects";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function handlePullRequestWebhook(payload: unknown): Promise<void> {
  if (!isRecord(payload)) return;
  const action = payload.action;
  if (action !== "closed") return;

  const pullRequest = payload.pull_request;
  const repository = payload.repository;
  if (!isRecord(pullRequest) || !isRecord(repository)) return;

  const prNumber = pullRequest.number;
  const merged = pullRequest.merged;
  const repoId = repository.id;

  if (typeof prNumber !== "number" || !Number.isInteger(prNumber)) return;
  if (typeof merged !== "boolean") return;
  if (typeof repoId !== "number" || !Number.isFinite(repoId)) return;

  const status = merged ? "active" : "pr_closed";
  await updateProjectStatusForPullRequestClosed({ repoId: BigInt(repoId), prNumber, status });
}

