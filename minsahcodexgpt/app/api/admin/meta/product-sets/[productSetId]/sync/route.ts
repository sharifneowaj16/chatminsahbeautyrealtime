import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { syncMetaProductSetFromPreview } from '@/lib/meta/product-sets/service';

export async function POST(request: NextRequest, context: { params: Promise<{ productSetId: string }> }) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const { productSetId } = await context.params;
    const body = await readJsonObject(request);
    const previewId = requiredString(body.previewId, 'previewId');
    const reason = typeof body.reason === 'string' ? body.reason : 'Synchronize preview-validated Meta product set';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_PRODUCT_SET_SYNC', resourceType: 'META_PRODUCT_SET', resourceId: productSetId,
      payload: { productSetId, previewId }, approvalId: typeof body.approvalId === 'string' ? body.approvalId : null, reason,
      run: () => syncMetaProductSetFromPreview({ productSetId, previewId, actorId: admin.adminId }),
    });
    return NextResponse.json({ ok: true, result: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
