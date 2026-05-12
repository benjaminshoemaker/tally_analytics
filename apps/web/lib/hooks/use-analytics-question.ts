"use client";

import { useMutation } from "@tanstack/react-query";

import type { AnalyticsPeriod } from "../analytics/periods";
import type { AnalyticsQuestionResult } from "../analytics/tasks/types";

type ErrorResponse = { error?: string; message?: string };

export type AskAnalyticsQuestionInput = {
  question: string;
  period?: AnalyticsPeriod;
};

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

export async function askAnalyticsQuestion(
  projectId: string,
  input: AskAnalyticsQuestionInput,
): Promise<AnalyticsQuestionResult> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/analytics/questions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("Invalid response body");
  }

  return body as AnalyticsQuestionResult;
}

export function useAnalyticsQuestion(projectId: string) {
  return useMutation({
    mutationKey: ["analyticsQuestion", projectId],
    mutationFn: (input: AskAnalyticsQuestionInput) => askAnalyticsQuestion(projectId, input),
  });
}
