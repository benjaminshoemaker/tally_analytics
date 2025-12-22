import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { githubTokens } from "../../db/schema";
import {
  deleteProjectsByInstallationAndRepoIds,
  deleteProjectsByInstallationId,
  upsertProjectsForRepos,
  type GitHubRepoRef,
} from "../../db/queries/projects";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readInstallationId(payload: Record<string, unknown>): bigint | null {
  const installation = payload.installation;
  if (!isRecord(installation)) return null;
  const id = installation.id;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  return BigInt(id);
}

async function getUserIdForInstallation(installationId: bigint): Promise<string | null> {
  const rows = await db
    .select({ userId: githubTokens.userId })
    .from(githubTokens)
    .where(eq(githubTokens.installationId, installationId));
  return rows[0]?.userId ?? null;
}

function readRepoList(payload: Record<string, unknown>, key: string): GitHubRepoRef[] {
  const raw = payload[key];
  if (!Array.isArray(raw)) return [];
  const repos: GitHubRepoRef[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const fullName = item.full_name;
    if (typeof id === "number" && Number.isFinite(id) && typeof fullName === "string" && fullName.length > 0) {
      repos.push({ id, fullName });
    }
  }
  return repos;
}

export async function handleInstallationWebhook(payload: unknown): Promise<void> {
  if (!isRecord(payload)) return;
  const action = payload.action;
  if (typeof action !== "string") return;

  const installationId = readInstallationId(payload);
  if (!installationId) return;

  if (action === "created") {
    const userId = await getUserIdForInstallation(installationId);
    if (!userId) return;

    const repositories = readRepoList(payload, "repositories");
    await upsertProjectsForRepos({ userId, installationId, repositories });
    return;
  }

  if (action === "deleted") {
    await deleteProjectsByInstallationId(installationId);
  }
}

export async function handleInstallationRepositoriesWebhook(payload: unknown): Promise<void> {
  if (!isRecord(payload)) return;
  const action = payload.action;
  if (typeof action !== "string") return;

  const installationId = readInstallationId(payload);
  if (!installationId) return;

  if (action === "added") {
    const userId = await getUserIdForInstallation(installationId);
    if (!userId) return;

    const repositories = readRepoList(payload, "repositories_added");
    await upsertProjectsForRepos({ userId, installationId, repositories });
    return;
  }

  if (action === "removed") {
    const repositories = readRepoList(payload, "repositories_removed");
    const repoIds = repositories.map((r) => BigInt(r.id));
    await deleteProjectsByInstallationAndRepoIds({ installationId, repoIds });
  }
}

