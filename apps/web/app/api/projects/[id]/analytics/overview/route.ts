import {
  getProjectOverview,
  isProjectOverviewSuccess,
  parseAnalyticsPeriod,
  toDashboardOverviewResponse,
} from '../../../../../../lib/analytics/service';
import {
  isRouteContextResponse,
  requireOwnedProjectRouteContext,
} from '../../../../../../lib/analytics/route-context';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<Response> {
  const routeContext = await requireOwnedProjectRouteContext(request, context.params);
  if (isRouteContextResponse(routeContext)) return routeContext;

  const url = new URL(request.url);
  const period = parseAnalyticsPeriod(url.searchParams.get('period'));
  if (!period) return Response.json({ error: 'Invalid period' }, { status: 400 });

  const result = await getProjectOverview({
    userId: routeContext.user.id,
    projectId: routeContext.projectId,
    period,
  });
  if (result.status === 'project_not_found') {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  if (!isProjectOverviewSuccess(result)) {
    return Response.json({ error: 'Analytics service unavailable' }, { status: 500 });
  }

  return Response.json(toDashboardOverviewResponse(result), { status: 200 });
}
