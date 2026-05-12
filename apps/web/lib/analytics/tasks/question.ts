import { buildAnalyticsTaskDuplicateFingerprint } from "./fingerprint";
import type {
  AnalyticsQuestionDraftResult,
  AnalyticsQuestionResult,
  AnalyticsTaskDraft,
  AnalyticsTaskRecord,
  AnalyticsTaskSummary,
  InterpretAnalyticsQuestionInput,
} from "./types";

type AnalyticsPeriod = "24h" | "7d" | "30d";

type QuestionSignals = {
  period: AnalyticsPeriod;
  window: {
    period: AnalyticsPeriod;
    start: string;
    end: string;
  };
  pricingPageViews: number;
  eventCounts: Record<string, number>;
  eventProperties: Record<string, string[]>;
};

type QuestionPattern =
  | "pricing_visits"
  | "onboarding_after_pricing"
  | "upgrade_cta_clicks"
  | "plan_conversion_after_signup"
  | "unsupported";

const DEFAULT_PERIOD: AnalyticsPeriod = "7d";

function normalizeQuestion(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookup(value: string): string {
  return normalizeQuestion(value).toLowerCase();
}

function parseQuestionPeriod(value: string | undefined): AnalyticsPeriod {
  if (value === "24h" || value === "7d" || value === "30d") return value;
  return DEFAULT_PERIOD;
}

function questionPattern(question: string): QuestionPattern {
  const lower = normalizeLookup(question);

  if (lower.includes("track everything") || lower.includes("everything users do")) {
    return "unsupported";
  }

  if (lower.includes("onboarding") && lower.includes("pricing") && lower.includes("after")) {
    return "onboarding_after_pricing";
  }

  if (lower.includes("pricing") && lower.includes("visit")) {
    return "pricing_visits";
  }

  if (lower.includes("upgrade") && (lower.includes("cta") || lower.includes("click"))) {
    return "upgrade_cta_clicks";
  }

  if (lower.includes("plan") && lower.includes("convert") && lower.includes("signup")) {
    return "plan_conversion_after_signup";
  }

  return "unsupported";
}

function draftTrackOnboardingCompletion(): AnalyticsTaskDraft {
  return {
    taskType: "track_completion",
    title: "Track onboarding completion",
    eventName: "onboarding_completed",
    triggerDescription: "When a user reaches the completed onboarding state.",
    propertiesSchema: {
      required: ["source_page", "plan"],
    },
    targetSurface: "/onboarding",
    implementationGuidance:
      "Emit `onboarding_completed` once per completed onboarding flow and include the source page and selected plan.",
    verificationCriteria: {
      productionEvent: "onboarding_completed",
      requiredProperties: ["source_page", "plan"],
      environment: "production",
    },
    verificationSource: "production_event",
  };
}

function draftTrackUpgradeCtaClick(): AnalyticsTaskDraft {
  return {
    taskType: "track_click",
    title: "Track upgrade CTA clicks",
    eventName: "upgrade_cta_clicked",
    triggerDescription: "When a user clicks an upgrade call-to-action button.",
    propertiesSchema: {
      required: ["surface", "plan"],
    },
    targetSurface: "/pricing",
    implementationGuidance:
      "Emit `upgrade_cta_clicked` on each CTA click and capture the UI surface and targeted plan.",
    verificationCriteria: {
      productionEvent: "upgrade_cta_clicked",
      requiredProperties: ["surface", "plan"],
      environment: "production",
    },
    verificationSource: "production_event",
  };
}

function draftAddPlanToSignupCompleted(): AnalyticsTaskDraft {
  return {
    taskType: "add_event_property",
    title: "Add plan property to signup_completed",
    eventName: "signup_completed",
    triggerDescription: "When signup completes, include the selected plan in the event payload.",
    propertiesSchema: {
      required: ["plan"],
    },
    targetSurface: "/signup",
    implementationGuidance:
      "Keep the existing `signup_completed` event and add a `plan` property to every production payload.",
    verificationCriteria: {
      productionEvent: "signup_completed",
      requiredProperties: ["plan"],
      environment: "production",
    },
    verificationSource: "production_event",
  };
}

function asTaskSummary(task: AnalyticsTaskRecord): AnalyticsTaskSummary {
  return {
    id: task.id,
    status: task.status,
    taskType: task.taskType,
    title: task.title,
    eventName: task.eventName,
    triggerDescription: task.triggerDescription,
    propertiesSchema: task.propertiesSchema,
    targetSurface: task.targetSurface,
    verificationCriteria: task.verificationCriteria,
    verificationSource: task.verificationSource,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function defaultSignalsLoader(params: {
  userId: string;
  projectId: string;
  period: AnalyticsPeriod;
  now: Date;
}): Promise<QuestionSignals> {
  const service = await import("../service");
  const dataWindow = service.resolveAnalyticsDataWindow(params.period, params.now);
  const defaultWindow = {
    period: params.period,
    start: dataWindow.start.toISOString(),
    end: dataWindow.end.toISOString(),
  };

  let pricingPageViews = 0;
  let window = defaultWindow;

  const overview = await service.getProjectOverview({
    userId: params.userId,
    projectId: params.projectId,
    period: params.period,
    now: params.now,
  });
  if (overview.status === "ok" || overview.status === "no_events") {
    const pricing = overview.topPages.find(
      (page) => page.path === "/pricing" || page.path.startsWith("/pricing/"),
    );
    pricingPageViews = pricing?.views ?? 0;
    const dataWindowFromOverview = overview.provenance.dataWindow;
    if (dataWindowFromOverview) {
      window = {
        period: dataWindowFromOverview.period,
        start: dataWindowFromOverview.start,
        end: dataWindowFromOverview.end,
      };
    }
  }

  const eventCounts: Record<string, number> = {};
  const eventProperties: Record<string, string[]> = {};
  const events = await service.listEvents({
    userId: params.userId,
    projectId: params.projectId,
    period: params.period,
    now: params.now,
  });
  if (events.status === "ok" || events.status === "no_events") {
    for (const event of events.events) {
      const key = normalizeLookup(event.eventName);
      eventCounts[key] = event.count;
      eventProperties[key] = event.commonProperties.map((property) => normalizeLookup(property));
    }
  }

  if ((eventCounts.signup_completed ?? 0) > 0) {
    const signupSchema = await service.getEventSchema({
      userId: params.userId,
      projectId: params.projectId,
      period: params.period,
      eventName: "signup_completed",
      now: params.now,
    });
    if (signupSchema.status === "ok") {
      eventProperties.signup_completed = signupSchema.event.properties.map((property) =>
        normalizeLookup(property.name),
      );
    }
  }

  return {
    period: params.period,
    window,
    pricingPageViews,
    eventCounts,
    eventProperties,
  };
}

function questionMetricsWindow(signals: QuestionSignals): { period: string; start: string; end: string } {
  return {
    period: signals.window.period,
    start: signals.window.start,
    end: signals.window.end,
  };
}

function answeredResult(params: {
  summary: string;
  metrics: Array<{ label: string; value: string | number }>;
  signals: QuestionSignals;
}): AnalyticsQuestionResult {
  return {
    kind: "answered",
    answer: {
      summary: params.summary,
      metrics: params.metrics,
      window: questionMetricsWindow(params.signals),
    },
    draft: null,
    existingTask: null,
  };
}

async function withDuplicateCheck(params: {
  userId: string;
  projectId: string;
  question: string;
  result: AnalyticsQuestionDraftResult;
  findDuplicateTask?: (args: {
    userId: string;
    projectId: string;
    duplicateFingerprint: string;
  }) => Promise<AnalyticsTaskRecord | null>;
}): Promise<AnalyticsQuestionResult> {
  let finder = params.findDuplicateTask;
  if (!finder) {
    const queries = await import("./queries");
    finder = queries.findActiveTaskByDuplicateFingerprint;
  }

  const duplicateFingerprint = buildAnalyticsTaskDuplicateFingerprint({
    originalQuestion: params.question,
    taskType: params.result.draft.taskType,
    eventName: params.result.draft.eventName,
    triggerDescription: params.result.draft.triggerDescription,
    targetSurface: params.result.draft.targetSurface ?? null,
    propertiesSchema: params.result.draft.propertiesSchema,
  });

  const existingTask = await finder({
    userId: params.userId,
    projectId: params.projectId,
    duplicateFingerprint,
  });

  if (!existingTask) {
    return params.result;
  }

  return {
    kind: params.result.kind,
    answer: params.result.answer,
    draft: null,
    existingTask: asTaskSummary(existingTask),
  };
}

export async function interpretAnalyticsQuestion(
  input: InterpretAnalyticsQuestionInput & {
    loadSignals?: (params: {
      userId: string;
      projectId: string;
      period: AnalyticsPeriod;
      now: Date;
    }) => Promise<QuestionSignals>;
    findDuplicateTask?: (args: {
      userId: string;
      projectId: string;
      duplicateFingerprint: string;
    }) => Promise<AnalyticsTaskRecord | null>;
  },
): Promise<AnalyticsQuestionResult> {
  const now = input.now ?? new Date();
  const normalizedQuestion = normalizeQuestion(input.question);

  if (!normalizedQuestion) {
    return {
      kind: "unsupported",
      answer: {
        summary: "Please ask a specific analytics question for this project.",
        narrowingPrompt: "Try a scoped question such as pricing visits, onboarding completion, or upgrade CTA clicks.",
      },
      draft: null,
      existingTask: null,
    };
  }

  const boundedQuestion = normalizedQuestion.slice(0, 500);
  const period = parseQuestionPeriod(input.period);
  const signalsLoader = input.loadSignals ?? defaultSignalsLoader;
  const signals = await signalsLoader({
    userId: input.userId,
    projectId: input.projectId,
    period,
    now,
  });

  const pattern = questionPattern(boundedQuestion);

  if (pattern === "unsupported") {
    return {
      kind: "unsupported",
      answer: {
        summary: "That request is broader than the current dashboard task flow supports.",
        narrowingPrompt: "Ask for one measurable action, click, or completion event.",
      },
      draft: null,
      existingTask: null,
    };
  }

  if (pattern === "pricing_visits") {
    return answeredResult({
      summary: `Pricing page visits are available for the selected ${signals.period} window.`,
      metrics: [{ label: "Pricing page views", value: signals.pricingPageViews }],
      signals,
    });
  }

  if (pattern === "onboarding_after_pricing") {
    const hasOnboardingCompletion = (signals.eventCounts.onboarding_completed ?? 0) > 0;
    if (hasOnboardingCompletion) {
      return answeredResult({
        summary: "Onboarding completion telemetry exists and can be used with pricing-page traffic.",
        metrics: [{ label: "Onboarding completions", value: signals.eventCounts.onboarding_completed }],
        signals,
      });
    }

    return withDuplicateCheck({
      userId: input.userId,
      projectId: input.projectId,
      question: boundedQuestion,
      findDuplicateTask: input.findDuplicateTask,
      result: {
        kind: "partial_answer",
        answer: {
          summary: "Pricing visits are visible, but onboarding completion is not fully instrumented yet.",
          limitation: "Tally cannot confirm how many users finished onboarding after visiting pricing.",
        },
        draft: draftTrackOnboardingCompletion(),
        existingTask: null,
      },
    });
  }

  if (pattern === "upgrade_cta_clicks") {
    const upgradeClickCount = signals.eventCounts.upgrade_cta_clicked ?? 0;
    if (upgradeClickCount > 0) {
      return answeredResult({
        summary: "Upgrade CTA click tracking is already present.",
        metrics: [{ label: "Upgrade CTA clicks", value: upgradeClickCount }],
        signals,
      });
    }

    return withDuplicateCheck({
      userId: input.userId,
      projectId: input.projectId,
      question: boundedQuestion,
      findDuplicateTask: input.findDuplicateTask,
      result: {
        kind: "cannot_answer_yet",
        answer: {
          summary: "Upgrade CTA click tracking has not been observed for this project yet.",
          limitation: "Without a dedicated click event, Tally cannot answer this question from production data.",
        },
        draft: draftTrackUpgradeCtaClick(),
        existingTask: null,
      },
    });
  }

  const signupCompletedCount = signals.eventCounts.signup_completed ?? 0;
  const signupProperties = new Set(signals.eventProperties.signup_completed ?? []);
  const hasPlanProperty = signupProperties.has("plan");

  if (signupCompletedCount > 0 && hasPlanProperty) {
    return answeredResult({
      summary: "Signup conversion by plan is already instrumented.",
      metrics: [{ label: "signup_completed events", value: signupCompletedCount }],
      signals,
    });
  }

  return withDuplicateCheck({
    userId: input.userId,
    projectId: input.projectId,
    question: boundedQuestion,
    findDuplicateTask: input.findDuplicateTask,
    result: {
      kind: "partial_answer",
      answer: {
        summary: "Signup completion exists, but plan-level conversion detail is missing.",
        limitation: "Tally needs a `plan` property on `signup_completed` to answer this reliably.",
      },
      draft: draftAddPlanToSignupCompleted(),
      existingTask: null,
    },
  });
}
