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
}

