import { z } from "zod";

export const analyticsStatusSchema = z.enum([
  "ok",
  "no_projects",
  "no_events",
  "partial_data",
  "insufficient_data",
  "no_match",
  "multiple_matches",
  "invalid_period",
  "invalid_limit",
  "invalid_since",
  "invalid_goal",
  "invalid_event_name",
  "invalid_steps",
  "invalid_repo_context",
  "project_not_found",
  "unauthorized",
  "service_error",
]);

const rawOptional = z.unknown().optional();
const projectIdSchema = z.string().trim().min(1);

export const analyticsCommonOutputSchema = z
  .object({
    status: analyticsStatusSchema,
    summary: z.string(),
  })
  .passthrough();

export const listProjectsInputSchema = z.object({
  limit: rawOptional,
});
export const listProjectsOutputSchema = analyticsCommonOutputSchema;

export const resolveProjectInputSchema = z.object({
  repo: z
    .object({
      name: z.string().optional(),
      packageName: z.string().nullable().optional(),
      gitRemote: z.string().nullable().optional(),
      workspaceRoot: rawOptional,
      appRoot: rawOptional,
      packageManager: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
export const resolveProjectOutputSchema = analyticsCommonOutputSchema;

export const projectPeriodInputSchema = z.object({
  projectId: projectIdSchema,
  period: rawOptional,
});

export const getProjectOverviewInputSchema = projectPeriodInputSchema;
export const getProjectOverviewOutputSchema = analyticsCommonOutputSchema;

export const getSessionsSummaryInputSchema = projectPeriodInputSchema;
export const getSessionsSummaryOutputSchema = analyticsCommonOutputSchema;

export const getTopPagesInputSchema = projectPeriodInputSchema.extend({
  limit: rawOptional,
});
export const getTopPagesOutputSchema = analyticsCommonOutputSchema;

export const getTopReferrersInputSchema = projectPeriodInputSchema.extend({
  limit: rawOptional,
});
export const getTopReferrersOutputSchema = analyticsCommonOutputSchema;

export const getLiveEventsInputSchema = z.object({
  projectId: projectIdSchema,
  limit: rawOptional,
  since: rawOptional,
});
export const getLiveEventsOutputSchema = analyticsCommonOutputSchema;

export const listEventsInputSchema = projectPeriodInputSchema.extend({
  limit: rawOptional,
});
export const listEventsOutputSchema = analyticsCommonOutputSchema;

export const getEventSchemaInputSchema = projectPeriodInputSchema.extend({
  eventName: rawOptional,
  limit: rawOptional,
});
export const getEventSchemaOutputSchema = analyticsCommonOutputSchema;

export const getPathsToEventInputSchema = projectPeriodInputSchema.extend({
  targetEvent: rawOptional,
  maxSteps: rawOptional,
  limit: rawOptional,
});
export const getPathsToEventOutputSchema = analyticsCommonOutputSchema;

export const suggestNextEventsInputSchema = projectPeriodInputSchema.extend({
  goal: rawOptional,
});
export const suggestNextEventsOutputSchema = analyticsCommonOutputSchema.extend({
  createsPendingTasks: z.literal(false).optional(),
});

export const analyticsToolSchemas = {
  listProjects: {
    inputSchema: listProjectsInputSchema,
    outputSchema: listProjectsOutputSchema,
  },
  resolveProject: {
    inputSchema: resolveProjectInputSchema,
    outputSchema: resolveProjectOutputSchema,
  },
  listEvents: {
    inputSchema: listEventsInputSchema,
    outputSchema: listEventsOutputSchema,
  },
  getEventSchema: {
    inputSchema: getEventSchemaInputSchema,
    outputSchema: getEventSchemaOutputSchema,
  },
  getPathsToEvent: {
    inputSchema: getPathsToEventInputSchema,
    outputSchema: getPathsToEventOutputSchema,
  },
  getProjectOverview: {
    inputSchema: getProjectOverviewInputSchema,
    outputSchema: getProjectOverviewOutputSchema,
  },
  getLiveEvents: {
    inputSchema: getLiveEventsInputSchema,
    outputSchema: getLiveEventsOutputSchema,
  },
  getSessionsSummary: {
    inputSchema: getSessionsSummaryInputSchema,
    outputSchema: getSessionsSummaryOutputSchema,
  },
  getTopPages: {
    inputSchema: getTopPagesInputSchema,
    outputSchema: getTopPagesOutputSchema,
  },
  getTopReferrers: {
    inputSchema: getTopReferrersInputSchema,
    outputSchema: getTopReferrersOutputSchema,
  },
  suggestNextEvents: {
    inputSchema: suggestNextEventsInputSchema,
    outputSchema: suggestNextEventsOutputSchema,
  },
} as const;

export type ListProjectsInput = z.infer<typeof listProjectsInputSchema>;
export type ResolveProjectInput = z.infer<typeof resolveProjectInputSchema>;
export type ProjectPeriodInput = z.infer<typeof projectPeriodInputSchema>;
export type GetLiveEventsInput = z.infer<typeof getLiveEventsInputSchema>;
export type GetEventSchemaInput = z.infer<typeof getEventSchemaInputSchema>;
export type GetPathsToEventInput = z.infer<typeof getPathsToEventInputSchema>;
export type SuggestNextEventsInput = z.infer<typeof suggestNextEventsInputSchema>;
