import { META_QUEUE_NAMES, type MetaCapiOutboxJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { processMetaOutboxById } from '@/lib/meta/capi/sender';
import { getMetaOutboxRetryDelayMs } from '@/lib/meta/capi/retry';

export function startMetaCapiSenderWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.CAPI_EVENTS, async (job) => {
    const data = job.data as MetaCapiOutboxJobPayload;
    const result = await processMetaOutboxById({
      outboxId: data.outboxId,
      leaseToken: data.leaseToken,
    });
    if ('retry' in result && result.retry) {
      return {
        auditStatus: 'RETRYING' as const,
        nextRunAt: new Date(Date.now() + getMetaOutboxRetryDelayMs(job.attemptsMade + 1)),
        result,
      };
    }
    if (!result.ok && !('skipped' in result && result.skipped)) {
      return { auditStatus: 'DEAD_LETTER' as const, result };
    }
    return { auditStatus: 'SUCCEEDED' as const, result };
  });
}

const isDirectRun = process.argv[1]?.includes('meta-capi-sender.worker');
if (isDirectRun) startMetaCapiSenderWorker();
