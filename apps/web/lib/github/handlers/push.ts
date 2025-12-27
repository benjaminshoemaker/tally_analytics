import { getProjectStatusByRepoId } from "../../db/queries/projects";
import { analyzeRepository } from "../analyze";

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

function readRepo(payload: Record<string, unknown>): { id: bigint; fullName: string; defaultBranch: string } | null {
  const repository = payload.repository;
  if (!isRecord(repository)) return null;

  const id = repository.id;
  const fullName = repository.full_name;
  const defaultBranch = repository.default_branch;

  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  if (typeof fullName !== "string" || fullName.length === 0) return null;
  if (typeof defaultBranch !== "string" || defaultBranch.length === 0) return null;

  return { id: BigInt(id), fullName, defaultBranch };
}

function readRef(payload: Record<string, unknown>): string | null {
  const ref = payload.ref;
  if (typeof ref !== "string" || ref.length === 0) return null;
  return ref;
}

function isDeletedPush(payload: Record<string, unknown>): boolean {
  return payload.deleted === true;
}

export async function handlePushWebhook(payload: unknown): Promise<void> {
  if (!isRecord(payload)) return;
  if (isDeletedPush(payload)) return;

  const installationId = readInstallationId(payload);
  if (!installationId) return;

  const repo = readRepo(payload);
  if (!repo) return;

  const ref = readRef(payload);
  if (!ref) return;
  if (ref !== `refs/heads/${repo.defaultBranch}`) return;

  const status = await getProjectStatusByRepoId({ repoId: repo.id });
  if (status !== "unsupported") return;

  await analyzeRepository({
    repoId: repo.id,
    repoFullName: repo.fullName,
    installationId,
  });
}

