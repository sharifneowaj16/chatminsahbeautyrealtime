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
      request, actorId: admin!.adminId, operation: 'CREATE_LOOKALIKE_AUDIENCE', approvalId: body.approvalId,
      requestApproval: body.requestApproval, reason: body.reason,
      payload: {
        name: requiredString(body.name, 'name'), originAudienceId: requiredString(body.originAudienceId, 'originAudienceId'),
        country: typeof body.country === 'string' ? body.country : undefined,
        ratio: typeof body.ratio === 'number' ? body.ratio : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
      },
    });
    return executed.mode === 'APPROVAL_REQUESTED'
      ? NextResponse.json({ ok: true, approval: executed.approval, auditId: executed.auditId }, { status: 202 })
      : NextResponse.json({ ok: true, audience: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
