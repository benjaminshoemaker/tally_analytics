import { z } from "zod";

import { createTinybirdClientFromEnv } from "../../../lib/tinybird";

export function GET() {
  return new Response("Method Not Allowed", { status: 405 });
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

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = trackRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const client = createTinybirdClientFromEnv();
  await client.appendEvents(parsed.data.events);

  return Response.json({ success: true, received: parsed.data.events.length });
}
