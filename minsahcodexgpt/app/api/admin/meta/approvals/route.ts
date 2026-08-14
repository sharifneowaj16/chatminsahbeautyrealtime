import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission, requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { isMetaAdminActionKey } from '@/lib/meta/admin/policy';
import { createMetaAdminApproval, executeMetaAdminAction, listMetaAdminApprovals } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  const status = request.nextUrl.searchParams.get('status')?.toUpperCase() || undefined;
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
  const approvals = await listMetaAdminApprovals({ status, limit });
  return NextResponse.json({
    ok: true,
    approvals: approvals.map((item) => ({
      ...item,
      payload: redactMetaAdminData(item.payload),
      requestedAt: item.requestedAt.toISOString(),
      expiresAt: item.expiresAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      executionStartedAt: item.executionStartedAt?.toISOString() ?? null,
      executedAt: item.executedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const requestedAction = body.actionKey;
    if (!isMetaAdminActionKey(requestedAction)) return NextResponse.json({ ok: false, error: 'Unknown actionKey' }, { status: 400 });
    const resourceType = requiredString(body.resourceType, 'resourceType');
    const resourceId = typeof body.resourceId === 'string' && body.resourceId.trim() ? body.resourceId.trim() : null;
    const reason = requiredString(body.reason, 'reason');
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: 'META_APPROVAL_REQUEST',
      resourceType: 'META_ADMIN_APPROVAL',
      resourceId,
      payload: { requestedAction, resourceType, resourceId },
      reason,
      run: () => createMetaAdminApproval({ actionKey: requestedAction, resourceType, resourceId, payload, reason, requestedById: admin.adminId, expiresInMinutes: Number(body.expiresInMinutes ?? 30) }),
    });
    return NextResponse.json({ ok: true, approval: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
