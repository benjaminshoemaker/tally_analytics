import { defineConfig } from "drizzle-kit";

import { loadDrizzleEnv } from "./lib/db/drizzle-env";

const configDir = typeof __dirname === "string" ? __dirname : process.cwd();
loadDrizzleEnv({ configDir });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required to run drizzle-kit. Set it via `export DATABASE_URL=...` or add it to `apps/web/.env.local` (or repo-root `.env.local`).",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
