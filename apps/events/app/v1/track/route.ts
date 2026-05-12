import { z } from "zod";

import { createTinybirdClientFromEnv } from "../../../lib/tinybird";
import { createProjectCacheFromEnv } from "../../../lib/project-cache";
import { appendE2EFixtureEvents } from "../../../lib/e2e-fixture-sink";

const CUSTOM_EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const EVENT_PROPERTIES_MAX_LENGTH = 4096;
const ANALYTICS_ENVIRONMENTS = ["production", "development", "test"] as const;

type AnalyticsEnvironment = (typeof ANALYTICS_ENVIRONMENTS)[number];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const analyticsEventSchema = z.object({
  project_id: z.string().min(1),
  session_id: z.string().min(1),
  event_type: z.string().regex(CUSTOM_EVENT_NAME_PATTERN),
  timestamp: z.string().min(1),
  url: z.string().optional(),
  path: z.string().optional(),
  referrer: z.string().optional(),
  user_agent: z.string().optional(),
  screen_width: z.number().optional(),
  user_id: z.string().optional(),
  // V2 Enhanced Metrics fields
  engagement_time_ms: z.number().optional(),
  scroll_depth: z.number().optional(),
  visitor_id: z.string().optional(),
  is_returning: z.number().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  cta_clicks: z.string().optional(),
  environment: z.enum(ANALYTICS_ENVIRONMENTS).optional(),
  event_properties: z.string().max(EVENT_PROPERTIES_MAX_LENGTH).optional(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

const trackRequestSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(10),
});

type ParsedAnalyticsEvent = z.infer<typeof analyticsEventSchema>;
type NormalizedAnalyticsEvent = Omit<ParsedAnalyticsEvent, "environment" | "event_properties" | "properties"> & {
  environment: AnalyticsEnvironment;
  event_properties?: string;
};

function currentEnvironment(): AnalyticsEnvironment {
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
}

function normalizeEvent(
  event: ParsedAnalyticsEvent,
  fallbackEnvironment: AnalyticsEnvironment,
): NormalizedAnalyticsEvent | null {
  const serializedProperties =
    event.properties === undefined ? undefined : JSON.stringify(event.properties);
  if (serializedProperties && serializedProperties.length > EVENT_PROPERTIES_MAX_LENGTH) return null;

  const eventProperties = event.event_properties ?? serializedProperties;
  if (eventProperties && eventProperties.length > EVENT_PROPERTIES_MAX_LENGTH) return null;

  const { environment, event_properties, properties, ...baseEvent } = event;
  return {
    ...baseEvent,
    environment: environment ?? fallbackEnvironment,
    ...(eventProperties === undefined ? {} : { event_properties: eventProperties }),
  };
}

let projectCache: ReturnType<typeof createProjectCacheFromEnv> | null = null;
function getProjectCache() {
  if (projectCache) return projectCache;
  projectCache = createProjectCacheFromEnv();
  return projectCache;
}

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const parsed = trackRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }

  const fallbackEnvironment = currentEnvironment();
  const normalizedEvents: NormalizedAnalyticsEvent[] = [];
  for (const event of parsed.data.events) {
    const normalized = normalizeEvent(event, fallbackEnvironment);
    if (!normalized) {
      return Response.json({ success: false, error: "Invalid request body" }, { status: 400, headers: corsHeaders });
    }
    normalizedEvents.push(normalized);
  }

  let activeEvents = normalizedEvents;
  try {
    const cache = getProjectCache();
    const uniqueProjectIds = Array.from(new Set(normalizedEvents.map((event) => event.project_id)));
    const pairs = await Promise.all(
      uniqueProjectIds.map(async (projectId) => [projectId, await cache.isProjectActive(projectId)] as const),
    );
    const activeByProjectId = new Map(pairs);

    activeEvents = normalizedEvents.filter((event) => activeByProjectId.get(event.project_id));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const details = error instanceof Error ? error.message : String(error);
      return Response.json(
        { success: false, error: "Project validation failed", details },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json({ success: false, error: "Project validation failed" }, { status: 500, headers: corsHeaders });
  }

  try {
    const fixtureSink = await appendE2EFixtureEvents(activeEvents);
    if (fixtureSink.enabled) {
      return Response.json(
        { success: true, received: parsed.data.events.length, stored: fixtureSink.stored },
        { headers: corsHeaders },
      );
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return Response.json(
      { success: false, error: "Event fixture sink failed", details },
      { status: 500, headers: corsHeaders },
    );
  }

  const client = createTinybirdClientFromEnv();
  if (activeEvents.length > 0) {
    await client.appendEvents(activeEvents);
  }

  return Response.json({ success: true, received: parsed.data.events.length }, { headers: corsHeaders });
}
