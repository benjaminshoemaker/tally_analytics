// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AnalyticsQuestionResult from "../components/dashboard/analytics-tasks/analytics-question-result";
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

describe("analytics task components", () => {
  afterEach(() => cleanup());

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

  it("renders task list statuses for pending queue rows", () => {
    render(
      React.createElement(PendingTaskList, {
        tasks: [
          makeTask("pending", "task_pending"),
          makeTask("implemented_locally", "task_impl"),
          makeTask("awaiting_deploy", "task_wait"),
          makeTask("verified", "task_verified"),
          makeTask("failed", "task_failed"),
        ],
      }),
    );

    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("Implemented locally")).toBeTruthy();
    expect(screen.getByText("Awaiting deploy")).toBeTruthy();
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Failed")).toBeTruthy();
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
});
