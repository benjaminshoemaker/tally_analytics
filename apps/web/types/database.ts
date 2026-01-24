import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { githubTokens, projects, regenerateRequests, sessions, users, waitlist } from "../lib/db/schema";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type GithubToken = InferSelectModel<typeof githubTokens>;
export type NewGithubToken = InferInsertModel<typeof githubTokens>;

export type WaitlistEntry = InferSelectModel<typeof waitlist>;
export type NewWaitlistEntry = InferInsertModel<typeof waitlist>;

export type RegenerateRequest = InferSelectModel<typeof regenerateRequests>;
export type NewRegenerateRequest = InferInsertModel<typeof regenerateRequests>;
