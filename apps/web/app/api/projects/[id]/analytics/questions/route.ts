import { getUserFromRequest } from "../../../../../../lib/auth/get-user";
import { parseAnalyticsPeriod } from "../../../../../../lib/analytics/periods";
import { interpretAnalyticsQuestion } from "../../../../../../lib/analytics/tasks/question";
import { getOwnedAnalyticsProject } from "../../../../../../lib/db/queries/projects";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizedQuestion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > 500 ? compact.slice(0, 500) : compact;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = "then" in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) return Response.json({ error: "Missing project id" }, { status: 400 });

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(parsed)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const question = normalizedQuestion(parsed.question);
  if (!question) return Response.json({ error: "Question is required" }, { status: 400 });

  const period = parseAnalyticsPeriod(parsed.period);
  if (!period) return Response.json({ error: "Invalid period" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({
    userId: user.id,
    projectId,
  });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const result = await interpretAnalyticsQuestion({
    userId: user.id,
    projectId,
    question,
    period,
  });

  return Response.json(result, { status: 200 });
}
