import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { previewMetaProductSet } from '@/lib/meta/product-sets/service';

export async function POST(request: NextRequest, context: { params: Promise<{ productSetId: string }> }) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const { productSetId } = await context.params;
    const body: Record<string, unknown> = await readJsonObject(request).catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason : 'Preview product set membership';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_PRODUCT_SET_PREVIEW', resourceType: 'META_PRODUCT_SET', resourceId: productSetId,
      payload: { productSetId }, reason,
      run: () => previewMetaProductSet({ productSetId, actorId: admin.adminId }),
    });
    return NextResponse.json({ ok: true, preview: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
