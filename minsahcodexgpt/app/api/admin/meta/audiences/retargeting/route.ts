import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeOrRequestApprovedMetaAudienceMutation } from '@/app/api/admin/meta/_shared/audience-mutation';

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const executed = await executeOrRequestApprovedMetaAudienceMutation({
      request, actorId: admin!.adminId, operation: 'CREATE_RETARGETING_AUDIENCE', approvalId: body.approvalId,
      requestApproval: body.requestApproval, reason: body.reason,
      payload: {
        name: requiredString(body.name, 'name'), eventName: requiredString(body.eventName, 'eventName'),
        retentionDays: typeof body.retentionDays === 'number' ? body.retentionDays : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        rule: body.rule && typeof body.rule === 'object' && !Array.isArray(body.rule) ? body.rule as Record<string, unknown> : undefined,
      },
    });
    return executed.mode === 'APPROVAL_REQUESTED'
      ? NextResponse.json({ ok: true, approval: executed.approval, auditId: executed.auditId }, { status: 202 })
      : NextResponse.json({ ok: true, audience: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const audienceId = requiredString(body.audienceId, 'audienceId');
    const payload = Object.fromEntries(Object.entries({
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      retention_days: typeof body.retentionDays === 'number' ? body.retentionDays : undefined,
      rule: body.rule && typeof body.rule === 'object' && !Array.isArray(body.rule) ? body.rule : undefined,
    }).filter(([, value]) => value !== undefined));
    const executed = await executeOrRequestApprovedMetaAudienceMutation({
      request, actorId: admin!.adminId, operation: 'UPDATE_RETARGETING_AUDIENCE', resourceId: audienceId,
      payload, approvalId: body.approvalId, requestApproval: body.requestApproval, reason: body.reason,
    });
    return executed.mode === 'APPROVAL_REQUESTED'
      ? NextResponse.json({ ok: true, approval: executed.approval, auditId: executed.auditId }, { status: 202 })
      : NextResponse.json({ ok: true, audience: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
