import { z } from "zod";

export const packageManagerSchema = z.enum(["pnpm", "npm", "yarn", "bun"]);

export const mcpRepoContextSchema = z.object({
  repo: z.object({
    name: z.string().trim().min(1).max(255).describe("Local repository or package name."),
    gitRemote: z.string().trim().max(500).nullable().optional().describe("Git remote URL when available."),
    workspaceRoot: z.string().trim().min(1).default(".").describe("Relative workspace root. Usually '.'."),
    appRoot: z.string().trim().min(1).default(".").describe("Relative app root. Use '.' for a single-app repo."),
    packageManager: packageManagerSchema.describe("Package manager used by this app."),
    packageJsonPath: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Relative path to the app package.json. Use 'package.json' for a root app."),
    dependencyTarget: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Deprecated alias for packageJsonPath. This must be a package.json path, not a dependency list."),
  }),
  framework: z.object({
    kind: z.enum(["nextjs-app-router", "nextjs-pages-router"]).describe("Detected Next.js router type."),
    entrypoint: z.string().trim().min(1).describe("Relative path to app/layout.tsx or pages/_app.tsx."),
    usesSrcDir: z.boolean().optional().describe("Whether the app uses a src directory."),
    hasAtAlias: z.boolean().optional().describe("Whether tsconfig/jsconfig defines an @/* alias."),
  }),
  files: z
    .record(z.string().min(1), z.string())
    .describe("Map of safe relative file paths to content. Include package.json and the selected Next.js entrypoint."),
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
