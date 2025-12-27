import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "../env";
import * as schema from "./schema";

function isLocalPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "host.docker.internal";
  } catch {
    return false;
  }
}

export const db = (() => {
  if (isLocalPostgresUrl(env.DATABASE_URL)) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    return drizzleNodePg(pool, { schema });
  }

  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
})();
