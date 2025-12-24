import { z } from "zod";

import { createTinybirdClientFromEnv } from "../../../lib/tinybird";
import { createProjectCacheFromEnv } from "../../../lib/project-cache";

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
  event_type: z.enum(["page_view", "session_start"]),
  timestamp: z.string().min(1),
  url: z.string().optional(),
  path: z.string().optional(),
  referrer: z.string().optional(),
  user_agent: z.string().optional(),
  screen_width: z.number().optional(),
  user_id: z.string().optional(),
});

const trackRequestSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(10),
});

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

  let activeEvents = parsed.data.events;
  try {
    const cache = getProjectCache();
    const uniqueProjectIds = Array.from(new Set(parsed.data.events.map((event) => event.project_id)));
    const pairs = await Promise.all(
      uniqueProjectIds.map(async (projectId) => [projectId, await cache.isProjectActive(projectId)] as const),
    );
    const activeByProjectId = new Map(pairs);

    activeEvents = parsed.data.events.filter((event) => activeByProjectId.get(event.project_id));
  } catch {
    return Response.json({ success: false, error: "Project validation failed" }, { status: 500, headers: corsHeaders });
  }

  const client = createTinybirdClientFromEnv();
  if (activeEvents.length > 0) {
    await client.appendEvents(activeEvents);
  }

  return Response.json({ success: true, received: parsed.data.events.length }, { headers: corsHeaders });
}
