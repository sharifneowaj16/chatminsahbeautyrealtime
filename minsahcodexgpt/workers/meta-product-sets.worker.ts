import { META_QUEUE_NAMES, type MetaProductSetReconcileJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { reconcileMetaProductSets } from '@/lib/meta/product-sets/service';

export function startMetaProductSetsWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.PRODUCT_SETS, async (job) => {
    const data = job.data as MetaProductSetReconcileJobPayload;
    const result = await reconcileMetaProductSets({ actorId: 'system:meta-product-set-worker' });
    return { auditStatus: 'SUCCEEDED' as const, result: { ...result, correlationId: data.correlationId ?? null } };
  });
}

if (process.argv[1]?.includes('meta-product-sets.worker')) startMetaProductSetsWorker();
