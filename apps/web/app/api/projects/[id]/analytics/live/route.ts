import { getUserFromRequest } from '../../../../../../lib/auth/get-user';
import {
  getLiveEvents,
  isLiveEventsSuccess,
  parseLiveEventsQuery,
  toDashboardLiveEventsResponse,
} from '../../../../../../lib/analytics/service';

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
  const query = parseLiveEventsQuery({
    limit: url.searchParams.get('limit') ?? undefined,
    since: url.searchParams.get('since') ?? undefined,
  });
  if (!query.ok) return Response.json({ error: query.summary }, { status: 400 });

  const result = await getLiveEvents({ userId: user.id, projectId, limit: query.limit, since: query.since });
  if (result.status === 'project_not_found') {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  if (!isLiveEventsSuccess(result)) {
    return Response.json({ error: 'Analytics service unavailable' }, { status: 500 });
  }

  return Response.json(toDashboardLiveEventsResponse(result), { status: 200 });
}
