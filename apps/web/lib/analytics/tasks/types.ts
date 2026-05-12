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
