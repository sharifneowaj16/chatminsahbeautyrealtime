import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { rollbackMetaProductSetRule } from '@/lib/meta/product-sets/service';

export async function POST(request: NextRequest, context: { params: Promise<{ productSetId: string }> }) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const { productSetId } = await context.params;
    const body = await readJsonObject(request);
    const targetVersion = Number(body.targetVersion);
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isInteger(targetVersion) || targetVersion < 1 || !Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('targetVersion and expectedVersion are required');
    const reason = typeof body.reason === 'string' ? body.reason : `Rollback product set to version ${targetVersion}`;
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_PRODUCT_SET_ROLLBACK', resourceType: 'META_PRODUCT_SET', resourceId: productSetId,
      payload: { productSetId, targetVersion, expectedVersion }, reason,
      run: () => rollbackMetaProductSetRule({ productSetId, targetVersion, expectedVersion, actorId: admin.adminId, reason }),
    });
    return NextResponse.json({ ok: true, productSet: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
