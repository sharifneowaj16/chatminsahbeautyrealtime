import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { optionalBoolean, optionalTrimmedString } from '@/lib/meta-business/validation';
import { enqueueMetaCatalogSyncJob } from '@/lib/jobs/queues';
import { buildCatalogIncrementalIdempotencyKey, buildCatalogInventoryIdempotencyKey } from '@/lib/jobs/idempotency';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request);
  if (guard.response) return guard.response;
  const admin = guard.admin!;
  try {
    const body = await readJsonObject(request);
    const catalogId = optionalTrimmedString(body.catalogId, 'catalogId');
    const inventoryOnly = optionalBoolean(body.inventoryOnly, 'inventoryOnly') ?? false;
    const mode = inventoryOnly ? 'inventory' : 'incremental';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_CATALOG_SYNC', resourceType: 'META_CATALOG', resourceId: catalogId ?? null,
      payload: { catalogId: catalogId ?? null, mode }, reason: typeof body.reason === 'string' ? body.reason : `Manual ${mode} catalog sync`,
      run: async () => {
        const now = new Date();
        return enqueueMetaCatalogSyncJob({
          catalogId, mode,
          idempotencyKey: inventoryOnly ? buildCatalogInventoryIdempotencyKey(catalogId, now) : buildCatalogIncrementalIdempotencyKey(catalogId, now),
          requestedBy: admin.adminId,
        });
      },
    });
    return NextResponse.json({ ok: true, ...executed.result, auditId: executed.auditId }, { status: 202 });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
