import { neon } from "@neondatabase/serverless";

type ProjectStatus = string;

type CacheEntry = {
  active: boolean;
  expiresAtMs: number;
};

export type ProjectCacheOptions = {
  ttlMs?: number;
  now?: () => number;
  queryStatus: (projectId: string) => Promise<ProjectStatus | null>;
};

export function createProjectCache({ ttlMs = 30_000, now = Date.now, queryStatus }: ProjectCacheOptions) {
  const cache = new Map<string, CacheEntry>();

  async function isProjectActive(projectId: string): Promise<boolean> {
    const cached = cache.get(projectId);
    const nowMs = now();

    if (cached && cached.expiresAtMs > nowMs) return cached.active;
    cache.delete(projectId);

    const status = await queryStatus(projectId);
    const active = status === "active";
    cache.set(projectId, { active, expiresAtMs: nowMs + ttlMs });
    return active;
  }

  return { isProjectActive } as const;
}

export function createProjectCacheFromEnv(options?: { ttlMs?: number; now?: () => number }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  const sql = neon(databaseUrl);

  return createProjectCache({
    ttlMs: options?.ttlMs,
    now: options?.now,
    queryStatus: async (projectId) => {
      const rows = (await sql`SELECT status FROM projects WHERE id = ${projectId} LIMIT 1`) as Array<{ status?: string }>;
      return rows[0]?.status ?? null;
    },
  });
}

