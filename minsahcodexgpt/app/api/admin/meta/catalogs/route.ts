import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { createCatalog, listCatalogProducts, listCatalogs, updateCatalog } from '@/lib/meta-business/catalog';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const catalogId = request.nextUrl.searchParams.get('catalogId') ?? undefined;
    if (catalogId) return NextResponse.json({ products: await listCatalogProducts(catalogId, { limit: 200 }) });
    return NextResponse.json({ catalogs: await listCatalogs() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;
  try {
    const body = await readJsonObject(request);
    const name = requiredString(body.name, 'name');
    const vertical = typeof body.vertical === 'string' ? body.vertical : undefined;
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_CATALOG_CREATE', resourceType: 'META_CATALOG', resourceId: null,
      payload: { name, vertical: vertical ?? 'commerce' }, reason: typeof body.reason === 'string' ? body.reason : 'Create Meta catalog',
      run: () => createCatalog({ name, vertical }),
    });
    return NextResponse.json({ catalog: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;
  try {
    const body = await readJsonObject(request);
    const catalogId = requiredString(body.catalogId, 'catalogId');
    const changes = { ...body }; delete changes.catalogId; delete changes.reason;
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_CATALOG_UPDATE', resourceType: 'META_CATALOG', resourceId: catalogId,
      payload: { catalogId, changes }, reason: typeof body.reason === 'string' ? body.reason : 'Update Meta catalog',
      run: () => updateCatalog(catalogId, changes),
    });
    return NextResponse.json({ catalog: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
