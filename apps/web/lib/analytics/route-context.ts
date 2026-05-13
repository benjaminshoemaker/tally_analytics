import { getUserFromRequest, type AuthUser } from "../auth/get-user";
import {
  getOwnedAnalyticsProject,
  type OwnedAnalyticsProject,
} from "../db/queries/projects";

export type ProjectRouteParams = Promise<{ id: string }> | { id: string };
export type TaskRouteParams = Promise<{ id: string; taskId: string }> | { id: string; taskId: string };

export type OwnedProjectRouteContext = {
  user: AuthUser;
  projectId: string;
  project: OwnedAnalyticsProject;
};

export type OwnedTaskProjectRouteContext = OwnedProjectRouteContext & {
  taskId: string;
};

async function resolveParams<T extends Record<string, string>>(params: Promise<T> | T): Promise<T> {
  return "then" in params ? await params : params;
}

export async function requireOwnedProjectRouteContext(
  request: Request,
  params: ProjectRouteParams,
): Promise<OwnedProjectRouteContext | Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveParams(params);
  const projectId = resolved.id;
  if (!projectId) return Response.json({ error: "Missing project id" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({ userId: user.id, projectId });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  return { user, projectId, project };
}

export async function requireOwnedTaskProjectRouteContext(
  request: Request,
  params: TaskRouteParams,
): Promise<OwnedTaskProjectRouteContext | Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveParams(params);
  const projectId = resolved.id;
  const taskId = resolved.taskId;
  if (!projectId || !taskId) return Response.json({ error: "Missing required ids" }, { status: 400 });

  const project = await getOwnedAnalyticsProject({ userId: user.id, projectId });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  return { user, projectId, taskId, project };
}

export async function parseJsonRequestBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export function isRouteContextResponse<T>(value: T | Response): value is Response {
  return value instanceof Response;
}
