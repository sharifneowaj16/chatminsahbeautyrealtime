import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import {
  createCatalog,
  listCanonicalCatalogItemsForProductSets,
  listCatalogProducts,
  listCatalogs,
  syncCatalogProducts,
  updateCatalog,
} from '@/lib/meta-business/catalog';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;

  const catalogId = request.nextUrl.searchParams.get('catalogId') ?? undefined;
  try {
    if (catalogId) {
      return NextResponse.json({
        ok: true,
        source: 'meta_graph_api',
        products: await listCatalogProducts(catalogId, { limit: 200 }),
      });
    }
    return NextResponse.json({
      ok: true,
      source: 'meta_graph_api',
      catalogs: await listCatalogs(),
    });
  } catch (error) {
    try {
      const config = getMetaBusinessConfig();
      const canonical = await listCanonicalCatalogItemsForProductSets();
      const fallbackCatalogId = catalogId || config.catalogId || 'local-canonical-catalog';

      if (catalogId) {
        return NextResponse.json({
          ok: true,
          source: 'local_canonical_catalog',
          catalogId: fallbackCatalogId,
          products: {
            data: canonical.items,
            invalidItems: canonical.invalidItems,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        source: 'local_canonical_catalog',
        catalogs: {
          data: [
            {
              id: fallbackCatalogId,
              name: 'Minsah Beauty Canonical Product Catalog',
              vertical: 'commerce',
              product_count: canonical.items.length,
              invalid_item_count: canonical.invalidItems.length,
              feed_url: `${(config.siteUrl || 'https://minsahbeauty.cloud').replace(/\/$/, '')}/api/meta/catalog/feed`,
            },
          ],
          items: canonical.items,
          invalidItems: canonical.invalidItems,
        },
        providerNotice: error instanceof Error ? error.message : 'Using local canonical catalog snapshot',
      });
    } catch (fallbackErr) {
      return metaAdminActionErrorResponse(fallbackErr);
    }
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;

  try {
    const body = await readJsonObject(request);

    if (body.action === 'SYNC_CATALOG') {
      const catalogId = typeof body.catalogId === 'string' && body.catalogId.trim() ? body.catalogId.trim() : undefined;
      const productIds = Array.isArray(body.productIds)
        ? body.productIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        : undefined;
      const inventoryOnly = Boolean(body.inventoryOnly);

      const executed = await executeMetaAdminAction({
        request,
        actorId: admin.adminId,
        actionKey: 'META_CATALOG_SYNC',
        resourceType: 'META_CATALOG',
        resourceId: catalogId ?? null,
        payload: { catalogId, productIds, inventoryOnly },
        reason: typeof body.reason === 'string' ? body.reason : 'Manual catalog batch synchronization',
        run: () => syncCatalogProducts({ catalogId, productIds, inventoryOnly }),
      });

      return NextResponse.json({ ok: true, result: executed.result, auditId: executed.auditId });
    }

    const name = requiredString(body.name, 'name');
    const vertical = typeof body.vertical === 'string' ? body.vertical : undefined;
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: 'META_CATALOG_CREATE',
      resourceType: 'META_CATALOG',
      resourceId: null,
      payload: { name, vertical: vertical ?? 'commerce' },
      reason: typeof body.reason === 'string' ? body.reason : 'Create Meta catalog',
      run: () => createCatalog({ name, vertical }),
    });
    return NextResponse.json({ catalog: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;

  try {
    const body = await readJsonObject(request);
    const catalogId = requiredString(body.catalogId, 'catalogId');
    const changes = { ...body };
    delete changes.catalogId;
    delete changes.reason;
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: 'META_CATALOG_UPDATE',
      resourceType: 'META_CATALOG',
      resourceId: catalogId,
      payload: { catalogId, changes },
      reason: typeof body.reason === 'string' ? body.reason : 'Update Meta catalog',
      run: () => updateCatalog(catalogId, changes),
    });
    return NextResponse.json({ catalog: executed.result, auditId: executed.auditId });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
