"use client";

import { useQuery } from "@tanstack/react-query";

export type ProjectDetailResponse = Record<string, unknown>;

type ErrorResponse = { error?: string; message?: string };

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

export async function fetchProject(projectId: string): Promise<ProjectDetailResponse> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  }

  if (!body || typeof body !== "object") {
    throw new Error("Invalid response body");
  }

  return body as ProjectDetailResponse;
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: projectId.length > 0,
  });
}

