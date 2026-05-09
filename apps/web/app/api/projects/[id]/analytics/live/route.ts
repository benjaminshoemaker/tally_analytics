import { getUserFromRequest } from '../../../../../../lib/auth/get-user';
import {
  getLiveEvents,
  isLiveEventsSuccess,
  toDashboardLiveEventsResponse,
} from '../../../../../../lib/analytics/service';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const params = 'then' in context.params ? await context.params : context.params;
  const projectId = params.id;
  if (!projectId) return Response.json({ error: 'Missing project id' }, { status: 400 });

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get('limit');
  const limit = clamp(Number.parseInt(limitRaw ?? '20', 10) || 20, 1, 100);
  const sinceRaw = url.searchParams.get('since') ?? '';
  const parsedSince = sinceRaw ? new Date(sinceRaw) : null;
  const since = parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince : null;

  const result = await getLiveEvents({ userId: user.id, projectId, limit, since });
  if (result.status === 'project_not_found') {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  if (!isLiveEventsSuccess(result)) {
    return Response.json({ error: 'Analytics service unavailable' }, { status: 500 });
  }

  return Response.json(toDashboardLiveEventsResponse(result), { status: 200 });
}
