// @vitest-environment jsdom
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAnalyticsQuestion } from "../lib/hooks/use-analytics-question";
import {
  useAnalyticsTasks,
  useConfirmAnalyticsTask,
} from "../lib/hooks/use-analytics-tasks";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
}

function makeDraft() {
  return {
    originalQuestion: "How many users clicked pricing CTA?",
    answerKind: "cannot_answer_yet" as const,
    answerSummary: "Missing click event.",
    analyticsGap: "No click event.",
    taskType: "track_click" as const,
    title: "Track pricing CTA clicks",
    eventName: "pricing_cta_clicked",
    triggerDescription: "When user clicks pricing CTA.",
    propertiesSchema: { required: ["surface"] },
    targetSurface: "/pricing",
    implementationGuidance: "Track in button handler.",
    verificationCriteria: { productionEvent: "pricing_cta_clicked" },
    verificationSource: "production_event" as const,
  };
}

describe("analytics task hooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads analytics tasks successfully", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ tasks: [{ id: "task_123", status: "pending" }] }),
    } as unknown as Response);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useAnalyticsTasks("proj_123"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/projects/proj_123/analytics/tasks",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.current.data?.tasks[0]).toMatchObject({ id: "task_123", status: "pending" });
  });

  it("surfaces API errors from task queries", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as unknown as Response);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useAnalyticsTasks("proj_123"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("Unauthorized");
  });

  it("submits questions through the question mutation hook", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        kind: "answered",
        answer: {
          summary: "Pricing page visits are available.",
          metrics: [{ label: "Pricing page views", value: 42 }],
          window: { period: "7d", start: "2026-05-01T00:00:00.000Z", end: "2026-05-08T00:00:00.000Z" },
        },
        draft: null,
        existingTask: null,
      }),
    } as unknown as Response);

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useAnalyticsQuestion("proj_123"), {
      wrapper,
    });

    await act(async () => {
      const response = await result.current.mutateAsync({
        question: "How many users visited pricing this week?",
      });
      expect(response.kind).toBe("answered");
    });
  });

  it("invalidates task queries after confirming a task", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "created", task: { id: "task_123", status: "pending" } }),
    } as unknown as Response);

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useConfirmAnalyticsTask("proj_123"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        draft: makeDraft(),
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["analyticsTasks", "proj_123"],
      exact: false,
    });
  });
});
