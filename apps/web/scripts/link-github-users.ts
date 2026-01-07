import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import { loadDrizzleEnv } from "../lib/db/drizzle-env";

type UserToLink = {
  userId: string;
  githubUserId: bigint;
  githubUsername: string;
};

export const USERS_TO_LINK: UserToLink[] = [
  {
    userId: "7ddad137-14b2-4505-b370-51a18447a832",
    githubUserId: 8659979n,
    githubUsername: "emriedel",
  },
  {
    userId: "ef382954-7f87-441d-9051-74b4d579f597",
    githubUserId: 224462439n,
    githubUsername: "benjaminshoemaker",
  },
];

function ensureEnvLoaded(): void {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const configDir = path.resolve(scriptsDir, "..");
  loadDrizzleEnv({ configDir });
}

export async function linkGitHubUsers(usersToLink: UserToLink[] = USERS_TO_LINK): Promise<void> {
  ensureEnvLoaded();

  const [{ db }, { users }] = await Promise.all([import("../lib/db/client"), import("../lib/db/schema")]);

  for (const user of usersToLink) {
    const result = await db
      .update(users)
      .set({
        githubUserId: user.githubUserId,
        githubUsername: user.githubUsername,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.userId))
      .returning();

    if (result.length === 0) {
      console.error(`User not found: ${user.userId} (${user.githubUsername})`);
      continue;
    }

    console.log(`Linked ${user.userId} → ${user.githubUsername} (${user.githubUserId})`);
  }
}

async function main(): Promise<void> {
  await linkGitHubUsers();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
