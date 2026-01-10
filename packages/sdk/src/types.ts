export interface InitOptions {
  projectId: string;
  respectDNT?: boolean;
  debug?: boolean;
}

export type EventType = "page_view" | "session_start";

export interface AnalyticsEvent {
  project_id: string;
  session_id: string;
  event_type: EventType;
  timestamp: string;
  url?: string;
  path?: string;
  referrer?: string;
  user_agent?: string;
  screen_width?: number;
  user_id?: string;
  // V2 Enhanced Metrics fields
  engagement_time_ms?: number;
  scroll_depth?: number;
  visitor_id?: string;
  is_returning?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  cta_clicks?: string;
}

