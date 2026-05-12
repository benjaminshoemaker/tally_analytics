export const analyticsTaskStatuses = [
  "pending",
  "in_progress",
  "implemented_locally",
  "awaiting_deploy",
  "verified",
  "failed",
  "cancelled",
  "archived",
  "duplicate",
] as const;

export type AnalyticsTaskStatus = (typeof analyticsTaskStatuses)[number];

export const analyticsTaskTypes = ["track_completion", "track_click", "add_event_property"] as const;
export type AnalyticsTaskType = (typeof analyticsTaskTypes)[number];

export const analyticsAnswerKinds = ["answered", "partial_answer", "cannot_answer_yet", "unsupported"] as const;
export type AnalyticsAnswerKind = (typeof analyticsAnswerKinds)[number];

export type AnalyticsTaskActorType = "user" | "agent" | "system";

export type AnalyticsTaskDuplicateFingerprintInput = {
  originalQuestion: string;
  taskType: AnalyticsTaskType;
  eventName: string;
  triggerDescription: string;
  targetSurface?: string | null;
  propertiesSchema?: Record<string, unknown> | null;
};

export type CreatePendingAnalyticsTaskInput = {
  projectId: string;
  userId: string;
  taskType: AnalyticsTaskType;
  title: string;
  originalQuestion: string;
  answerKind: AnalyticsAnswerKind;
  answerSummary?: string | null;
  analyticsGap?: string | null;
  eventName: string;
  triggerDescription: string;
  propertiesSchema?: Record<string, unknown> | null;
  targetSurface?: string | null;
  implementationGuidance?: string | null;
  verificationCriteria?: Record<string, unknown> | null;
  verificationSource?: "production_event";
};

export type CreateAnalyticsTaskStatusEventInput = {
  taskId: string;
  projectId: string;
  userId: string;
  fromStatus: AnalyticsTaskStatus | null;
  toStatus: AnalyticsTaskStatus;
  actorType: AnalyticsTaskActorType;
  actorId?: string | null;
  reason?: string | null;
  details?: Record<string, unknown> | null;
};

export type AnalyticsTaskRecord = {
  id: string;
  projectId: string;
  userId: string;
  status: AnalyticsTaskStatus;
  taskType: AnalyticsTaskType;
  title: string;
  originalQuestion: string;
  answerKind: AnalyticsAnswerKind;
  answerSummary: string | null;
  analyticsGap: string | null;
  eventName: string;
  triggerDescription: string;
  propertiesSchema: Record<string, unknown>;
  targetSurface: string | null;
  implementationGuidance: string | null;
  verificationCriteria: Record<string, unknown>;
  verificationSource: "production_event";
  duplicateFingerprint: string | null;
  duplicateOfTaskId: string | null;
  localVerification: Record<string, unknown> | null;
  implementationFingerprint: string | null;
  lastError: string | null;
  confirmedAt: Date | null;
  claimedAt: Date | null;
  implementedAt: Date | null;
  verifiedAt: Date | null;
  cancelledAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AnalyticsTaskStatusEventRecord = {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  fromStatus: AnalyticsTaskStatus | null;
  toStatus: AnalyticsTaskStatus;
  actorType: AnalyticsTaskActorType;
  actorId: string | null;
  reason: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
};

export type AnalyticsTaskVerificationCommand = {
  command: string;
  exitCode: number;
  summary?: string;
};

export type AnalyticsTaskLocalEventEvidence = {
  eventName: string;
  properties?: Record<string, unknown>;
};

export type TransitionAnalyticsTaskInput = {
  taskId: string;
  userId: string;
  projectId?: string;
  toStatus: AnalyticsTaskStatus;
  actorType: AnalyticsTaskActorType;
  actorId?: string | null;
  reason?: string | null;
  changedFiles?: string[];
  verificationCommands?: AnalyticsTaskVerificationCommand[];
  localEventEvidence?: AnalyticsTaskLocalEventEvidence[];
  implementationFingerprint?: string | null;
  errorSummary?: string | null;
  now?: Date;
};

export type TransitionAnalyticsTaskResult = {
  status: "transitioned" | "idempotent";
  task: AnalyticsTaskRecord;
  statusEvent: AnalyticsTaskStatusEventRecord | null;
};

export type AnalyticsTaskDraft = {
  originalQuestion: string;
  answerKind: "partial_answer" | "cannot_answer_yet";
  answerSummary: string;
  analyticsGap: string;
  taskType: AnalyticsTaskType;
  title: string;
  eventName: string;
  triggerDescription: string;
  propertiesSchema: Record<string, unknown>;
  targetSurface?: string | null;
  implementationGuidance?: string | null;
  verificationCriteria: Record<string, unknown>;
  verificationSource: "production_event";
};

export type AnalyticsTaskSummary = Pick<
  AnalyticsTaskRecord,
  | "id"
  | "status"
  | "taskType"
  | "title"
  | "eventName"
  | "triggerDescription"
  | "propertiesSchema"
  | "targetSurface"
  | "verificationCriteria"
  | "verificationSource"
  | "createdAt"
  | "updatedAt"
>;

export type InterpretAnalyticsQuestionInput = {
  userId: string;
  projectId: string;
  question: string;
  period?: "24h" | "7d" | "30d";
  now?: Date;
};

export type AnalyticsQuestionAnsweredResult = {
  kind: "answered";
  answer: {
    summary: string;
    metrics: Array<{ label: string; value: string | number }>;
    window: { period: string; start: string; end: string };
  };
  draft: null;
  existingTask: null;
};

export type AnalyticsQuestionDraftResult = {
  kind: "partial_answer" | "cannot_answer_yet";
  answer: {
    summary: string;
    limitation: string;
  };
  draft: AnalyticsTaskDraft;
  existingTask: null;
};

export type AnalyticsQuestionExistingTaskResult = {
  kind: "partial_answer" | "cannot_answer_yet";
  answer: {
    summary: string;
    limitation: string;
  };
  draft: null;
  existingTask: AnalyticsTaskSummary;
};

export type AnalyticsQuestionUnsupportedResult = {
  kind: "unsupported";
  answer: {
    summary: string;
    narrowingPrompt?: string;
  };
  draft: null;
  existingTask: null;
};

export type AnalyticsQuestionResult =
  | AnalyticsQuestionAnsweredResult
  | AnalyticsQuestionDraftResult
  | AnalyticsQuestionExistingTaskResult
  | AnalyticsQuestionUnsupportedResult;
