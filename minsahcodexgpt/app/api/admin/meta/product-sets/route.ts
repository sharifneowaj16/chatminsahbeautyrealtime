import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { createMetaProductSet, listMetaProductSets, updateMetaProductSet } from '@/lib/meta/product-sets/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const catalogId = request.nextUrl.searchParams.get('catalogId')?.trim() || undefined;
    const productSets = await listMetaProductSets({ catalogId });
    return NextResponse.json({ ok: true, productSets });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const name = requiredString(body.name, 'name');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Create deterministic product set';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_PRODUCT_SET_CREATE', resourceType: 'META_PRODUCT_SET', resourceId: null,
      payload: { name, catalogId: body.catalogId ?? null, rule: body.rule, autoSync: Boolean(body.autoSync) }, reason,
      run: () => createMetaProductSet({
        catalogId: typeof body.catalogId === 'string' ? body.catalogId : undefined,
        name, description: typeof body.description === 'string' ? body.description : undefined,
        rule: body.rule, autoSync: Boolean(body.autoSync), actorId: admin.adminId, reason,
      }),
    });
    return NextResponse.json({ ok: true, productSet: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const productSetId = requiredString(body.productSetId, 'productSetId');
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('expectedVersion is required');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Update deterministic product set rule';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_PRODUCT_SET_UPDATE', resourceType: 'META_PRODUCT_SET', resourceId: productSetId,
      payload: { productSetId, expectedVersion, name: body.name, description: body.description, rule: body.rule, autoSync: body.autoSync }, reason,
      run: () => updateMetaProductSet({
        productSetId, expectedVersion, actorId: admin.adminId, reason,
        name: typeof body.name === 'string' ? body.name : undefined,
        description: body.description === null ? null : typeof body.description === 'string' ? body.description : undefined,
        rule: body.rule,
        autoSync: typeof body.autoSync === 'boolean' ? body.autoSync : undefined,
      }),
    });
    return NextResponse.json({ ok: true, productSet: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
