import { describe, expect, it, vi } from "vitest";

import { interpretAnalyticsQuestion } from "../lib/analytics/tasks/question";
import type { AnalyticsTaskRecord } from "../lib/analytics/tasks/types";

function makeExistingTask(overrides: Partial<AnalyticsTaskRecord> = {}): AnalyticsTaskRecord {
  return {
    id: "task_existing",
    projectId: "proj_123",
    userId: "user_123",
    status: "pending",
    taskType: "track_completion",
    title: "Track onboarding completion",
    originalQuestion: "How many users finished onboarding after visiting pricing?",
    answerKind: "partial_answer",
    answerSummary: "Need onboarding completion tracking.",
    analyticsGap: "Missing onboarding completion telemetry.",
    eventName: "onboarding_completed",
    triggerDescription: "When a user reaches onboarding completion.",
    propertiesSchema: { required: ["source_page", "plan"] },
    targetSurface: "/onboarding",
    implementationGuidance: null,
    verificationCriteria: {},
    verificationSource: "production_event",
    duplicateFingerprint: "abc123",
    duplicateOfTaskId: null,
    localVerification: null,
    implementationFingerprint: null,
    lastError: null,
    confirmedAt: new Date("2026-05-01T00:00:00.000Z"),
    claimedAt: null,
    implementedAt: null,
    verifiedAt: null,
    cancelledAt: null,
    archivedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    ...overrides,
  };
}

function signalInput(overrides: Partial<{
  pricingPageViews: number;
  eventCounts: Record<string, number>;
  eventProperties: Record<string, string[]>;
}> = {}) {
  return {
    period: "7d" as const,
    window: {
      period: "7d" as const,
      start: "2026-05-01T00:00:00.000Z",
      end: "2026-05-08T00:00:00.000Z",
    },
    pricingPageViews: 34,
    eventCounts: {},
    eventProperties: {},
    ...overrides,
  };
}

describe("analytics question service", () => {
  it("returns answered for pricing visits with no task draft", async () => {
    const result = await interpretAnalyticsQuestion({
      userId: "user_123",
      projectId: "proj_123",
      question: "How many users visited pricing this week?",
      loadSignals: async () => signalInput({ pricingPageViews: 88 }),
    });

    expect(result.kind).toBe("answered");
    expect(result.draft).toBeNull();
    expect(result.existingTask).toBeNull();
    if (result.kind === "answered") {
      expect(result.answer.metrics).toEqual([{ label: "Pricing page views", value: 88 }]);
    }
  });

  it("returns partial_answer plus track_completion draft for onboarding-after-pricing question", async () => {
    const result = await interpretAnalyticsQuestion({
      userId: "user_123",
      projectId: "proj_123",
      question: "How many users finished onboarding after visiting pricing?",
      loadSignals: async () =>
        signalInput({
          pricingPageViews: 55,
          eventCounts: { onboarding_completed: 0 },
        }),
      findDuplicateTask: async () => null,
    });

    expect(result.kind).toBe("partial_answer");
    expect(result.existingTask).toBeNull();
    if (result.kind === "partial_answer") {
      expect(result.draft?.taskType).toBe("track_completion");
      expect(result.draft?.eventName).toBe("onboarding_completed");
      expect(result.draft?.verificationSource).toBe("production_event");
    }
  });

  it("returns cannot_answer_yet plus track_click draft for upgrade CTA question", async () => {
    const result = await interpretAnalyticsQuestion({
      userId: "user_123",
      projectId: "proj_123",
      question: "How many people clicked the upgrade CTA?",
      loadSignals: async () =>
        signalInput({
          eventCounts: { upgrade_cta_clicked: 0 },
        }),
      findDuplicateTask: async () => null,
    });

    expect(result.kind).toBe("cannot_answer_yet");
    expect(result.existingTask).toBeNull();
    if (result.kind === "cannot_answer_yet") {
      expect(result.draft?.taskType).toBe("track_click");
      expect(result.draft?.eventName).toBe("upgrade_cta_clicked");
      expect(result.draft?.verificationSource).toBe("production_event");
    }
  });

  it("returns partial_answer plus add_event_property draft for plan conversion question", async () => {
    const result = await interpretAnalyticsQuestion({
      userId: "user_123",
      projectId: "proj_123",
      question: "Which plan converts best after signup?",
      loadSignals: async () =>
        signalInput({
          eventCounts: { signup_completed: 12 },
          eventProperties: { signup_completed: ["source_page"] },
        }),
      findDuplicateTask: async () => null,
    });

    expect(result.kind).toBe("partial_answer");
    if (result.kind === "partial_answer") {
      expect(result.draft?.taskType).toBe("add_event_property");
      expect(result.draft?.eventName).toBe("signup_completed");
      expect(result.draft?.propertiesSchema).toEqual({ required: ["plan"] });
      expect(result.draft?.verificationSource).toBe("production_event");
    }
  });

  it("returns unsupported for broad tracking requests", async () => {
    const result = await interpretAnalyticsQuestion({
      userId: "user_123",
      projectId: "proj_123",
      question: "Track everything users do in the app",
      loadSignals: async () => signalInput(),
    });

    expect(result.kind).toBe("unsupported");
    expect(result.draft).toBeNull();
    expect(result.existingTask).toBeNull();
  });

  it("returns existingTask instead of a new draft when a duplicate fingerprint exists", async () => {
    const existing = makeExistingTask();
    const finderSpy = vi.fn().mockResolvedValue(existing);

    const result = await interpretAnalyticsQuestion({
      userId: "user_123",
      projectId: "proj_123",
      question: "How many users finished onboarding after visiting pricing?",
      loadSignals: async () =>
        signalInput({
          eventCounts: { onboarding_completed: 0 },
        }),
      findDuplicateTask: finderSpy,
    });

    expect(result.kind).toBe("partial_answer");
    expect(result.draft).toBeNull();
    expect(result.existingTask?.id).toBe("task_existing");
    expect(finderSpy).toHaveBeenCalledTimes(1);
  });
});
