import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { pollPendingCatalogBatches, retryFailedCatalogBatchItems } from '@/lib/meta-platform/domains/catalog/orchestration';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';

export async function POST(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;
  try {
    const body = await readJsonObject(request);
    const action = body.action === 'retry' ? 'retry' : 'poll';
    const catalogId = typeof body.catalogId === 'string' ? body.catalogId : undefined;
    const limit = typeof body.limit === 'number' ? body.limit : action === 'retry' ? 100 : 25;
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: action === 'retry' ? 'META_CATALOG_ITEM_RETRY' : 'META_CATALOG_BATCH_POLL',
      resourceType: 'META_CATALOG_BATCH', resourceId: catalogId ?? null,
      payload: { action, catalogId: catalogId ?? null, limit }, reason: typeof body.reason === 'string' ? body.reason : `Catalog batch ${action}`,
      run: async (): Promise<unknown> => action === 'retry'
        ? retryFailedCatalogBatchItems({ catalogId, limit })
        : pollPendingCatalogBatches({ catalogId, limit }),
    });
    return NextResponse.json({ ok: true, action, result: executed.result, auditId: executed.auditId });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
