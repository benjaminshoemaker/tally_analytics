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
