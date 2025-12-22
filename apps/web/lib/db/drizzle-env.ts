import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

export type EnvLike = Record<string, string | undefined>;

type LoadDrizzleEnvOptions = {
  configDir: string;
  env?: EnvLike;
};

export function loadDrizzleEnv({ configDir, env = process.env as EnvLike }: LoadDrizzleEnvOptions): void {
  const candidatePaths = [
    path.join(configDir, ".env.local"),
    path.join(configDir, ".env"),
    path.join(configDir, "..", ".env.local"),
    path.join(configDir, "..", ".env"),
    path.join(configDir, "..", "..", ".env.local"),
    path.join(configDir, "..", "..", ".env"),
  ];

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) continue;

    const parsed = dotenv.parse(fs.readFileSync(candidatePath));
    for (const [key, value] of Object.entries(parsed)) {
      if (env[key] === undefined) env[key] = value;
    }
  }
}
