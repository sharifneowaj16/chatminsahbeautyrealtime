import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { transitionMetaIncident } from '@/lib/observability/incidents';

export async function PATCH(request: NextRequest, context: { params: Promise<{ incidentId: string }> }) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  const { incidentId } = await context.params;
  const body = await request.json().catch(() => null) as { action?: unknown; reason?: unknown } | null;
  const action = body?.action === 'acknowledge' ? 'ACKNOWLEDGED' : body?.action === 'resolve' ? 'RESOLVED' : null;
  if (!action) return NextResponse.json({ ok: false, error: 'action must be acknowledge or resolve' }, { status: 400 });
  try {
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: action === 'ACKNOWLEDGED' ? 'META_INCIDENT_ACKNOWLEDGE' : 'META_INCIDENT_RESOLVE',
      resourceType: 'META_INCIDENT',
      resourceId: incidentId,
      payload: { incidentId, status: action },
      reason: typeof body?.reason === 'string' ? body.reason : `Incident ${action.toLowerCase()} from Meta Operations Center`,
      run: () => transitionMetaIncident({ incidentId, status: action, actorId: admin.adminId }),
    });
    return NextResponse.json({ ok: true, incident: executed.result, auditId: executed.auditId });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
