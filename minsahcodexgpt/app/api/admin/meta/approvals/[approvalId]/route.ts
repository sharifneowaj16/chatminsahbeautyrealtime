import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction, reviewMetaAdminApproval } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';

export async function PATCH(request: NextRequest, context: { params: Promise<{ approvalId: string }> }) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_OPS_APPROVE, {
    message: 'Meta approval decisions are restricted to authorized approvers.',
  });
  if (response) return response;
  const { approvalId } = await context.params;
  try {
    const body = await readJsonObject(request);
    const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
    if (!decision) return NextResponse.json({ ok: false, error: 'decision must be approve or reject' }, { status: 400 });
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const actionKey = decision === 'approve' ? 'META_APPROVAL_APPROVE' : 'META_APPROVAL_REJECT';
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey,
      resourceType: 'META_ADMIN_APPROVAL',
      resourceId: approvalId,
      payload: { approvalId, decision },
      reason,
      run: () => reviewMetaAdminApproval({ approvalId, reviewerId: admin.adminId, decision, reason }),
    });
    return NextResponse.json({ ok: true, approval: executed.result, auditId: executed.auditId });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
