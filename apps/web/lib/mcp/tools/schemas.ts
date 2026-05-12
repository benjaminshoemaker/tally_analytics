import { z } from "zod";

export const packageManagerSchema = z.enum(["pnpm", "npm", "yarn", "bun"]);

export const mcpRepoContextSchema = z.object({
  repo: z.object({
    name: z.string().trim().min(1).max(255),
    gitRemote: z.string().trim().max(500).nullable().optional(),
    workspaceRoot: z.string().trim().min(1).default("."),
    appRoot: z.string().trim().min(1).default("."),
    packageManager: packageManagerSchema,
    dependencyTarget: z.string().trim().min(1),
  }),
  framework: z.object({
    kind: z.enum(["nextjs-app-router", "nextjs-pages-router"]),
    entrypoint: z.string().trim().min(1),
    usesSrcDir: z.boolean().optional(),
    hasAtAlias: z.boolean().optional(),
  }),
  files: z.record(z.string().min(1), z.string()),
});

export type McpRepoContextInput = z.infer<typeof mcpRepoContextSchema>;

const optionalNonEmptyString = z.string().trim().min(1).optional();
const nullableTrimmedString = z.string().trim().max(500).nullable().optional();

export const analyticsTaskProjectResolverRepoSchema = z
  .object({
    name: optionalNonEmptyString,
    packageName: optionalNonEmptyString,
    gitRemote: nullableTrimmedString,
    appRoot: optionalNonEmptyString,
  })
  .passthrough();

export const analyticsTaskProjectResolverInputSchema = z
  .object({
    projectId: optionalNonEmptyString,
    repo: analyticsTaskProjectResolverRepoSchema.optional(),
  })
  .passthrough();

export const listPendingAnalyticsTasksInputSchema = analyticsTaskProjectResolverInputSchema.extend({
  includeInProgress: z.boolean().optional(),
});

export const getAnalyticsTaskContextInputSchema = z
  .object({
    taskId: z.string().trim().min(1),
    projectId: optionalNonEmptyString,
  })
  .passthrough();

export const reportAnalyticsTaskStatusStatusSchema = z.enum([
  "in_progress",
  "implemented_locally",
  "failed",
]);

export const reportAnalyticsTaskStatusInputSchema = z
  .object({
    taskId: z.string().trim().min(1),
    status: reportAnalyticsTaskStatusStatusSchema,
    projectId: optionalNonEmptyString,
    changedFiles: z.array(z.string()).optional(),
    verificationCommands: z
      .array(
        z.object({
          command: z.string(),
          exitCode: z.number().int(),
          summary: z.string().optional(),
        }),
      )
      .optional(),
    localEventEvidence: z
      .array(
        z.object({
          eventName: z.string(),
          properties: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    implementationFingerprint: z.string().optional(),
    errorSummary: z.string().optional(),
  })
  .passthrough();

export const analyticsTaskToolOutputSchema = z
  .object({
    status: z.string(),
    summary: z.string(),
  })
  .passthrough();

export const analyticsTaskToolSchemas = {
  listPendingAnalyticsTasks: {
    inputSchema: listPendingAnalyticsTasksInputSchema,
    outputSchema: analyticsTaskToolOutputSchema,
  },
  analyticsTaskProjectResolver: {
    inputSchema: analyticsTaskProjectResolverInputSchema,
    outputSchema: analyticsTaskToolOutputSchema,
  },
  getAnalyticsTaskContext: {
    inputSchema: getAnalyticsTaskContextInputSchema,
    outputSchema: analyticsTaskToolOutputSchema,
  },
  reportAnalyticsTaskStatus: {
    inputSchema: reportAnalyticsTaskStatusInputSchema,
    outputSchema: analyticsTaskToolOutputSchema,
  },
} as const;

export type AnalyticsTaskProjectResolverInput = z.infer<typeof analyticsTaskProjectResolverInputSchema>;
export type ListPendingAnalyticsTasksInput = z.infer<typeof listPendingAnalyticsTasksInputSchema>;
export type GetAnalyticsTaskContextInput = z.infer<typeof getAnalyticsTaskContextInputSchema>;
export type ReportAnalyticsTaskStatusInput = z.infer<typeof reportAnalyticsTaskStatusInputSchema>;
