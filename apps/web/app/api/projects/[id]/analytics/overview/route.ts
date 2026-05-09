import { getUserFromRequest } from '../../../../../../lib/auth/get-user';
import {
  getProjectOverview,
  isProjectOverviewSuccess,
  parseAnalyticsPeriod,
  toDashboardOverviewResponse,
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
  const period = parseAnalyticsPeriod(url.searchParams.get('period'));
  if (!period) return Response.json({ error: 'Invalid period' }, { status: 400 });

  const result = await getProjectOverview({ userId: user.id, projectId, period });
  if (result.status === 'project_not_found') {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  if (!isProjectOverviewSuccess(result)) {
    return Response.json({ error: 'Analytics service unavailable' }, { status: 500 });
  }

  return Response.json(toDashboardOverviewResponse(result), { status: 200 });
}
