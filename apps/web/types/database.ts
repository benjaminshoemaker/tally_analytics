import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import {
  analyticsTaskStatusEvents,
  analyticsTasks,
  githubTokens,
  oauthAccessTokens,
  oauthAuthorizationCodes,
  oauthClients,
  oauthRefreshTokens,
  projects,
  regenerateRequests,
  sessions,
  users,
  waitlist,
} from "../lib/db/schema";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type GithubToken = InferSelectModel<typeof githubTokens>;
export type NewGithubToken = InferInsertModel<typeof githubTokens>;

export type OAuthClient = InferSelectModel<typeof oauthClients>;
export type NewOAuthClient = InferInsertModel<typeof oauthClients>;

export type OAuthAuthorizationCode = InferSelectModel<typeof oauthAuthorizationCodes>;
export type NewOAuthAuthorizationCode = InferInsertModel<typeof oauthAuthorizationCodes>;

export type OAuthAccessToken = InferSelectModel<typeof oauthAccessTokens>;
export type NewOAuthAccessToken = InferInsertModel<typeof oauthAccessTokens>;

export type OAuthRefreshToken = InferSelectModel<typeof oauthRefreshTokens>;
export type NewOAuthRefreshToken = InferInsertModel<typeof oauthRefreshTokens>;

export type WaitlistEntry = InferSelectModel<typeof waitlist>;
export type NewWaitlistEntry = InferInsertModel<typeof waitlist>;

export type RegenerateRequest = InferSelectModel<typeof regenerateRequests>;
export type NewRegenerateRequest = InferInsertModel<typeof regenerateRequests>;

export type AnalyticsTask = InferSelectModel<typeof analyticsTasks>;
export type NewAnalyticsTask = InferInsertModel<typeof analyticsTasks>;

export type AnalyticsTaskStatusEvent = InferSelectModel<typeof analyticsTaskStatusEvents>;
export type NewAnalyticsTaskStatusEvent = InferInsertModel<typeof analyticsTaskStatusEvents>;
