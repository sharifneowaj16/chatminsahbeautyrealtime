import { META_QUEUE_NAMES, type MetaCatalogSyncJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { executeCatalogDeletePlan, syncCatalogProducts } from '@/lib/meta-platform/domains/catalog/orchestration';
import { withMetaSyncLog } from '@/lib/meta-business/logging';

type CatalogWorkerResult = Awaited<ReturnType<typeof executeCatalogDeletePlan>> | Awaited<ReturnType<typeof syncCatalogProducts>>;

export function startMetaCatalogWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.CATALOG_SYNC, async (job) => {
    const data = job.data as MetaCatalogSyncJobPayload;
    const inventoryOnly = data.mode === 'inventory';
    const result = await withMetaSyncLog<CatalogWorkerResult>({
      operation: data.mode === 'delete' ? 'QUEUE_CATALOG_APPROVED_DELETE' : data.mode === 'reconcile' ? 'QUEUE_CATALOG_RECONCILE' : data.mode === 'full' ? 'QUEUE_CATALOG_FULL_SYNC' : inventoryOnly ? 'QUEUE_COMMERCE_INVENTORY_SYNC' : 'QUEUE_CATALOG_INCREMENTAL_SYNC',
      resourceId: data.mode === 'delete' ? data.deletePlanId : data.catalogId,
      requestData: { schemaVersion: data.schemaVersion, mode: data.mode, deletePlanId: data.deletePlanId ?? null },
      run: () => data.mode === 'delete'
        ? executeCatalogDeletePlan({ deletePlanId: data.deletePlanId!, correlationId: data.correlationId })
        : syncCatalogProducts({ catalogId: data.catalogId, inventoryOnly, correlationId: data.correlationId, productIds: data.productIds }),
      count: (value) => 'deletedItemsSubmitted' in value ? value.deletedItemsSubmitted : value.submittedItems,
      status: () => 'SUBMITTED',
    });
    return { auditStatus: 'SUCCEEDED' as const, result };
  });
}

if (process.argv[1]?.includes('meta-catalog.worker')) startMetaCatalogWorker();
