import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { githubTokens, magicLinks, projects, sessions, users, waitlist } from "../lib/db/schema";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type MagicLink = InferSelectModel<typeof magicLinks>;
export type NewMagicLink = InferInsertModel<typeof magicLinks>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type GithubToken = InferSelectModel<typeof githubTokens>;
export type NewGithubToken = InferInsertModel<typeof githubTokens>;

export type WaitlistEntry = InferSelectModel<typeof waitlist>;
export type NewWaitlistEntry = InferInsertModel<typeof waitlist>;
