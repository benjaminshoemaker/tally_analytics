"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AnalyticsTaskDraft, AnalyticsTaskRecord } from "../analytics/tasks/types";

type ErrorResponse = { error?: string; message?: string };

type AnalyticsTasksListResponse = {
  tasks: AnalyticsTaskRecord[];
};

type ConfirmAnalyticsTaskInput = {
  draft: AnalyticsTaskDraft;
  edits?: {
    title?: string;
    eventName?: string;
    implementationNotes?: string;
  };
};

type TaskActionInput = {
  action: "edit" | "archive" | "reopen" | "cancel";
  title?: string;
  eventName?: string;
  implementationNotes?: string;
};

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("Invalid response body");
  }

  return body as T;
}

export async function fetchAnalyticsTasks(
  projectId: string,
  includeHistory = false,
): Promise<AnalyticsTasksListResponse> {
  const suffix = includeHistory ? "?includeHistory=1" : "";
  return requestJson<AnalyticsTasksListResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analytics/tasks${suffix}`,
    {
      method: "GET",
    },
  );
}

export async function confirmAnalyticsTask(
  projectId: string,
  input: ConfirmAnalyticsTaskInput,
): Promise<{ status: string; task: AnalyticsTaskRecord }> {
  return requestJson<{ status: string; task: AnalyticsTaskRecord }>(
    `/api/projects/${encodeURIComponent(projectId)}/analytics/tasks`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function mutateAnalyticsTask(
  projectId: string,
  taskId: string,
  input: TaskActionInput,
): Promise<{ status: string; task: AnalyticsTaskRecord }> {
  return requestJson<{ status: string; task: AnalyticsTaskRecord }>(
    `/api/projects/${encodeURIComponent(projectId)}/analytics/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deletePendingAnalyticsTask(
  projectId: string,
  taskId: string,
): Promise<{ status: string; task: AnalyticsTaskRecord }> {
  return requestJson<{ status: string; task: AnalyticsTaskRecord }>(
    `/api/projects/${encodeURIComponent(projectId)}/analytics/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
    },
  );
}

export function useAnalyticsTasks(projectId: string, includeHistory = false) {
  return useQuery({
    queryKey: ["analyticsTasks", projectId, includeHistory ? "history" : "active"],
    queryFn: () => fetchAnalyticsTasks(projectId, includeHistory),
    enabled: projectId.length > 0,
  });
}

export function useConfirmAnalyticsTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmAnalyticsTaskInput) => confirmAnalyticsTask(projectId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["analyticsTasks", projectId],
        exact: false,
      });
    },
  });
}

export function useMutateAnalyticsTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; action: TaskActionInput }) =>
      mutateAnalyticsTask(projectId, input.taskId, input.action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["analyticsTasks", projectId],
        exact: false,
      });
    },
  });
}

export function useDeletePendingAnalyticsTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deletePendingAnalyticsTask(projectId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["analyticsTasks", projectId],
        exact: false,
      });
    },
  });
}
