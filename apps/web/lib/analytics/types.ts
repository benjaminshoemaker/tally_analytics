import type { AnalyticsDataWindow } from './periods';
import type { AnalyticsDashboardUrls } from './urls';

export type AnalyticsSuccessStatus =
  | 'ok'
  | 'no_projects'
  | 'no_events'
  | 'partial_data'
  | 'insufficient_data'
  | 'no_match'
  | 'multiple_matches';

export type AnalyticsErrorStatus =
  | 'invalid_period'
  | 'invalid_limit'
  | 'invalid_since'
  | 'invalid_goal'
  | 'invalid_event_name'
  | 'invalid_steps'
  | 'invalid_repo_context'
  | 'project_not_found'
  | 'unauthorized'
  | 'service_error';

export type AnalyticsStatus = AnalyticsSuccessStatus | AnalyticsErrorStatus;

export type AnalyticsQuerySemantics =
  | 'dashboard_overview'
  | 'dashboard_sessions'
  | 'dashboard_live'
  | 'event_discovery'
  | 'event_schema'
  | 'paths_to_event'
  | 'next_event_recommendations';

export type AnalyticsProvenance = {
  projectName: string;
  generatedAt: string;
  dataWindow?: AnalyticsDataWindow;
  queryBasis: {
    tool: string;
    semantics: AnalyticsQuerySemantics;
  };
};

export type AnalyticsProjectContext = {
  projectId: string;
  projectName: string;
  dashboardUrls: AnalyticsDashboardUrls;
};

export type AnalyticsEventSummary = {
  eventName: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  commonProperties: string[];
};

export type AnalyticsEventProperty = {
  name: string;
  observedCount: number;
  examples: string[];
};

export type AnalyticsEventSchema = {
  eventName: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  properties: AnalyticsEventProperty[];
};

export type AnalyticsPathSummary = {
  sequence: string[];
  targetEventCount: number;
  percentage: number;
};

export type AnalyticsPathCoverage = {
  targetEventTotal: number;
  targetEventsWithPriorPath: number;
};

export type AnalyticsServiceResultBase = {
  status: AnalyticsStatus;
  summary: string;
  provenance?: AnalyticsProvenance;
  dashboardUrls?: AnalyticsDashboardUrls;
  limitations?: string[];
};

export type AnalyticsRecommendation = {
  eventName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
};
