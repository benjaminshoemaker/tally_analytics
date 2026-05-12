// @vitest-environment jsdom
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AnalyticsQuestionResult from "../components/dashboard/analytics-tasks/analytics-question-result";
import AskTallyPanel from "../components/dashboard/analytics-tasks/ask-tally-panel";
import PendingTaskList from "../components/dashboard/analytics-tasks/pending-task-list";
import TaskDraftCard from "../components/dashboard/analytics-tasks/task-draft-card";
import TaskStatusBadge from "../components/dashboard/analytics-tasks/task-status-badge";
import type { AnalyticsTaskDraft, AnalyticsTaskRecord } from "../lib/analytics/tasks/types";

function makeDraft(overrides: Partial<AnalyticsTaskDraft> = {}): AnalyticsTaskDraft {
  return {
    originalQuestion: "How many users clicked pricing CTA?",
    answerKind: "cannot_answer_yet",
    answerSummary: "Missing click event.",
    analyticsGap: "No click event.",
    taskType: "track_click",
    title: "Track pricing CTA clicks",
    eventName: "pricing_cta_clicked",
    triggerDescription: "When user clicks pricing CTA.",
    propertiesSchema: { required: ["surface"] },
    targetSurface: "/pricing",
    implementationGuidance: "Track in button handler.",
    verificationCriteria: { productionEvent: "pricing_cta_clicked" },
    verificationSource: "production_event",
    ...overrides,
  };
}

function makeTask(status: AnalyticsTaskRecord["status"], id: string): AnalyticsTaskRecord {
  return {
    id,
    projectId: "proj_123",
    userId: "user_123",
    status,
    taskType: "track_click",
    title: `Task ${id}`,
    originalQuestion: "How many users clicked pricing CTA?",
    answerKind: "cannot_answer_yet",
    answerSummary: "Missing click event.",
    analyticsGap: "No click event.",
    eventName: "pricing_cta_clicked",
    triggerDescription: "When user clicks pricing CTA.",
    propertiesSchema: {},
    targetSurface: "/pricing",
    implementationGuidance: null,
    verificationCriteria: {},
    verificationSource: "production_event",
    duplicateFingerprint: null,
    duplicateOfTaskId: null,
    localVerification: null,
    implementationFingerprint: null,
    lastError: null,
    confirmedAt: null,
    claimedAt: null,
    implementedAt: null,
    verifiedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  };
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe("analytics task components", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders answered question content with metrics", () => {
    render(
      React.createElement(AnalyticsQuestionResult, {
        result: {
          kind: "answered",
          answer: {
            summary: "Pricing page visits are available.",
            metrics: [{ label: "Pricing page views", value: 42 }],
            window: { period: "7d", start: "2026-05-01T00:00:00.000Z", end: "2026-05-08T00:00:00.000Z" },
          },
          draft: null,
          existingTask: null,
        },
      }),
    );

    expect(screen.getByText("Pricing page visits are available.")).toBeTruthy();
    expect(screen.getByText("Pricing page views")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("supports draft edit and dismiss, and disables add-task when draft is invalid", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();

    render(
      React.createElement(TaskDraftCard, {
        draft: makeDraft(),
        onConfirm,
        onDismiss,
      }),
    );

    const addButton = screen.getByRole("button", { name: /add task to queue/i });
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    const eventInput = screen.getByLabelText("Event name") as HTMLInputElement;
    const addButtonEl = addButton as HTMLButtonElement;

    expect(addButtonEl.disabled).toBe(false);

    await user.clear(titleInput);
    expect(addButtonEl.disabled).toBe(true);

    await user.type(titleInput, "Track upgrade CTA clicks");
    expect(addButtonEl.disabled).toBe(false);

    await user.clear(eventInput);
    await user.type(eventInput, "bad event name");
    expect(addButtonEl.disabled).toBe(true);

    await user.clear(eventInput);
    await user.type(eventInput, "upgrade_cta_clicked");
    expect(addButtonEl.disabled).toBe(false);

    await user.click(addButton);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Track upgrade CTA clicks",
        eventName: "upgrade_cta_clicked",
      }),
    );

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders distinguishable status copy across local implementation outcomes", () => {
    render(
      React.createElement(PendingTaskList, {
        tasks: [
          makeTask("implemented_locally", "task_impl"),
          makeTask("awaiting_deploy", "task_wait"),
          makeTask("verified", "task_verified"),
          makeTask("failed", "task_failed"),
          makeTask("cancelled", "task_cancelled"),
          makeTask("archived", "task_archived"),
        ],
      }),
    );

    expect(screen.getByText("Implemented locally")).toBeTruthy();
    expect(screen.getByText("Awaiting deploy")).toBeTruthy();
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Failed")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("Archived")).toBeTruthy();
  });

  it("uses aria-live polite for question result updates and explicit status copy", () => {
    const { container } = render(
      React.createElement(AnalyticsQuestionResult, {
        result: {
          kind: "partial_answer",
          answer: {
            summary: "Partial answer",
            limitation: "Missing onboarding completion data.",
          },
          draft: makeDraft(),
          existingTask: null,
        },
      }),
    );

    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).toBeTruthy();

    render(React.createElement(TaskStatusBadge, { status: "implemented_locally" }));
    expect(screen.getByText("Implemented locally")).toBeTruthy();
  });

  it("refreshes task list after confirming a draft task in Ask Tally panel", async () => {
    const user = userEvent.setup();
    const tasksResponse = { tasks: [] as AnalyticsTaskRecord[] };
    const refreshedTasksResponse = { tasks: [makeTask("pending", "task_pending")] };
    let tasksGetCalls = 0;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();

      if (url.includes("/analytics/tasks") && method === "GET") {
        tasksGetCalls += 1;
        return {
          ok: true,
          json: async () => (tasksGetCalls === 1 ? tasksResponse : refreshedTasksResponse),
        } as unknown as Response;
      }

      if (url.includes("/analytics/questions") && method === "POST") {
        return {
          ok: true,
          json: async () => ({
            kind: "cannot_answer_yet",
            answer: {
              summary: "Upgrade CTA click tracking has not been observed for this project yet.",
              limitation: "Without a dedicated click event, Tally cannot answer this question from production data.",
            },
            draft: makeDraft(),
            existingTask: null,
          }),
        } as unknown as Response;
      }

      if (url.includes("/analytics/tasks") && method === "POST") {
        return {
          ok: true,
          json: async () => ({ status: "created", task: makeTask("pending", "task_pending") }),
        } as unknown as Response;
      }

      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });

    const queryClient = createQueryClient();

    render(
      React.createElement(QueryClientProvider, {
        client: queryClient,
        children: React.createElement(AskTallyPanel, { projectId: "proj_123" }),
      }),
    );

    await user.type(screen.getByLabelText("Question"), "How many people clicked the upgrade CTA?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    await waitFor(() => expect(screen.getByText("Proposed task")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /add task to queue/i }));

    await waitFor(() => {
      expect(tasksGetCalls).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => expect(screen.getByText("Task task_pending")).toBeTruthy());

    expect(fetchSpy).toHaveBeenCalled();
  });

  it("does not show a task draft or task-confirm POST when question result is answered", async () => {
    const user = userEvent.setup();
    let confirmPostCalls = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();

      if (url.includes("/analytics/tasks") && method === "GET") {
        return {
          ok: true,
          json: async () => ({ tasks: [] }),
        } as unknown as Response;
      }

      if (url.includes("/analytics/questions") && method === "POST") {
        return {
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
        } as unknown as Response;
      }

      if (url.includes("/analytics/tasks") && method === "POST") {
        confirmPostCalls += 1;
        return {
          ok: true,
          json: async () => ({ status: "created", task: makeTask("pending", "task_unexpected") }),
        } as unknown as Response;
      }

      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });

    render(
      React.createElement(QueryClientProvider, {
        client: createQueryClient(),
        children: React.createElement(AskTallyPanel, { projectId: "proj_123" }),
      }),
    );

    await user.type(screen.getByLabelText("Question"), "How many users visited pricing this week?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    await waitFor(() => expect(screen.getByText("Pricing page visits are available.")).toBeTruthy());
    expect(screen.queryByText("Proposed task")).toBeNull();
    expect(screen.queryByTestId("add-task-to-queue")).toBeNull();
    expect(confirmPostCalls).toBe(0);
  });

  it("dismisses a proposed draft without task confirmation persistence", async () => {
    const user = userEvent.setup();
    let confirmPostCalls = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();

      if (url.includes("/analytics/tasks") && method === "GET") {
        return {
          ok: true,
          json: async () => ({ tasks: [] }),
        } as unknown as Response;
      }

      if (url.includes("/analytics/questions") && method === "POST") {
        return {
          ok: true,
          json: async () => ({
            kind: "cannot_answer_yet",
            answer: {
              summary: "Need a dedicated event before Tally can answer this.",
              limitation: "No click event has been observed in production.",
            },
            draft: makeDraft(),
            existingTask: null,
          }),
        } as unknown as Response;
      }

      if (url.includes("/analytics/tasks") && method === "POST") {
        confirmPostCalls += 1;
        return {
          ok: true,
          json: async () => ({ status: "created", task: makeTask("pending", "task_unexpected") }),
        } as unknown as Response;
      }

      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });

    render(
      React.createElement(QueryClientProvider, {
        client: createQueryClient(),
        children: React.createElement(AskTallyPanel, { projectId: "proj_123" }),
      }),
    );

    await user.type(screen.getByLabelText("Question"), "How many people clicked the upgrade CTA?");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    await waitFor(() => expect(screen.getByText("Proposed task")).toBeTruthy());
    await user.click(screen.getByTestId("dismiss-task-draft"));
    await waitFor(() => expect(screen.queryByText("Proposed task")).toBeNull());
    expect(confirmPostCalls).toBe(0);
  });

  it("keeps ask and task controls keyboard reachable across the dashboard flow", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();

      if (url.includes("/analytics/tasks") && method === "GET") {
        return {
          ok: true,
          json: async () => ({
            tasks: [
              makeTask("pending", "task_pending"),
              makeTask("failed", "task_failed"),
            ],
          }),
        } as unknown as Response;
      }

      if (url.includes("/analytics/questions") && method === "POST") {
        return {
          ok: true,
          json: async () => ({
            kind: "cannot_answer_yet",
            answer: {
              summary: "Need tracking first.",
              limitation: "No qualifying event exists yet.",
            },
            draft: makeDraft(),
            existingTask: null,
          }),
        } as unknown as Response;
      }

      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });

    render(
      React.createElement(QueryClientProvider, {
        client: createQueryClient(),
        children: React.createElement(AskTallyPanel, { projectId: "proj_123" }),
      }),
    );

    await user.type(screen.getByLabelText("Question"), "How many people clicked the upgrade CTA?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => expect(screen.getByText("Proposed task")).toBeTruthy());

    const askInput = screen.getByTestId("ask-tally-input");
    const askButton = screen.getByRole("button", { name: "Ask" });
    const titleInput = screen.getByLabelText("Title");
    const eventNameInput = screen.getByLabelText("Event name");
    const notesInput = screen.getByLabelText("Implementation notes");
    const addButton = screen.getByTestId("add-task-to-queue");
    const dismissButton = screen.getByTestId("dismiss-task-draft");
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    const reopenButton = screen.getByRole("button", { name: "Reopen" });
    const archiveButton = screen.getByRole("button", { name: "Archive" });

    askInput.focus();
    expect(document.activeElement).toBe(askInput);

    await user.tab();
    expect(document.activeElement).toBe(askButton);
    await user.tab();
    expect(document.activeElement).toBe(titleInput);
    await user.tab();
    expect(document.activeElement).toBe(eventNameInput);
    await user.tab();
    expect(document.activeElement).toBe(notesInput);
    await user.tab();
    expect(document.activeElement).toBe(addButton);
    await user.tab();
    expect(document.activeElement).toBe(dismissButton);
    await user.tab();
    expect(document.activeElement).toBe(deleteButton);
    await user.tab();
    expect(document.activeElement).toBe(reopenButton);
    await user.tab();
    expect(document.activeElement).toBe(archiveButton);
  });
});
