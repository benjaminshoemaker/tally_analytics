export function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;

  throw new Error(
    `Missing required environment variable: ${name}. Set it in apps/web/.env.local for local dev, or in your Vercel project environment variables.`,
  );
}

