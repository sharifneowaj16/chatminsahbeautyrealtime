import { META_QUEUE_NAMES, type MetaCatalogStatusJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { pollPendingCatalogBatches } from '@/lib/meta-platform/domains/catalog/orchestration';

export function startMetaBatchStatusWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.CATALOG_STATUS, async (job) => {
    const data = job.data as MetaCatalogStatusJobPayload;
    const result = await pollPendingCatalogBatches({ catalogId: data.catalogId, limit: data.limit, correlationId: data.correlationId });
    return { auditStatus: 'SUCCEEDED' as const, result };
  });
}

if (process.argv[1]?.includes('meta-batch-status.worker')) startMetaBatchStatusWorker();
