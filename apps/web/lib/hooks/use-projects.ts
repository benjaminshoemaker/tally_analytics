"use client";

import { useQuery } from "@tanstack/react-query";

export const PROJECT_LIST_REFETCH_INTERVAL_MS = 10_000;

export type ProjectSource = "github_app" | "mcp_codex";

export type ProjectActions = {
  canRegenerate: boolean;
};

export type ProjectsListItem = {
  id: string;
  displayName: string;
  source: ProjectSource;
  githubRepoFullName: string | null;
  status: string;
  prUrl: string | null;
  detectedFramework: string | null;
  eventsThisMonth: number;
  lastEventAt: string | null;
  createdAt: string;
  actions: ProjectActions;
};

export type ProjectsListResponse = { projects: ProjectsListItem[] };

type ErrorResponse = { error?: string; message?: string };

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

export async function fetchProjects(): Promise<ProjectsListResponse> {
  const response = await fetch("/api/projects", { method: "GET", headers: { accept: "application/json" } });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  }

  if (!body || typeof body !== "object") throw new Error("Invalid response body");

  return body as ProjectsListResponse;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    refetchInterval: PROJECT_LIST_REFETCH_INTERVAL_MS,
  });
}
