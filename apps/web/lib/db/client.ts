import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { readRequiredEnv } from "../env/read-required-env";
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

function createDb() {
  const DATABASE_URL = readRequiredEnv("DATABASE_URL");

  if (isLocalPostgresUrl(DATABASE_URL)) {
    const pool = new Pool({ connectionString: DATABASE_URL });
    return drizzleNodePg(pool, { schema });
  }

  const sql = neon(DATABASE_URL);
  return drizzle(sql, { schema });
}

type DbClient = ReturnType<typeof createDb>;

let dbInstance: DbClient | undefined;

export function getDb(): DbClient {
  dbInstance ??= createDb();
  return dbInstance;
}

export const db = new Proxy({} as DbClient, {
  get(_target, property) {
    const currentDb = getDb();
    const value = Reflect.get(currentDb, property);
    return typeof value === "function" ? value.bind(currentDb) : value;
  },
  getOwnPropertyDescriptor(_target, property) {
    const currentDb = getDb();
    if (!(property in currentDb)) return undefined;

    return {
      configurable: true,
      enumerable: true,
      value: Reflect.get(currentDb, property),
    };
  },
  has(_target, property) {
    return property in getDb();
  },
});
