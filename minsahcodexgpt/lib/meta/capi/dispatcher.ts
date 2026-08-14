import 'server-only';
import { enqueueMetaCapiOutbox } from '@/lib/queue/metaCapiOutboxQueue';
import {
  leaseDueMetaEventOutbox,
  releaseMetaOutboxDispatch,
} from './outbox-repository';

export type MetaOutboxDispatchResult = {
  leased: number;
  enqueued: number;
  deferred: number;
  errors: Array<{ outboxId: string; message: string }>;
};

export async function requestMetaOutboxDispatch(outboxId: string, correlationId?: string) {
  try {
    const job = await enqueueMetaCapiOutbox({ outboxId, correlationId });
    return { queued: true, jobId: job.id == null ? undefined : String(job.id) };
  } catch (error) {
    return {
      queued: false,
      error: error instanceof Error ? error.message : 'META_OUTBOX_QUEUE_UNAVAILABLE',
    };
  }
}

export async function dispatchDueMetaOutbox(params: { limit?: number; leaseMs?: number } = {}) {
  const leased = await leaseDueMetaEventOutbox({
    limit: params.limit,
    leaseMs: params.leaseMs,
  });
  const result: MetaOutboxDispatchResult = {
    leased: leased.records.length,
    enqueued: 0,
    deferred: 0,
    errors: [],
  };

  for (const record of leased.records) {
    try {
      await enqueueMetaCapiOutbox({
        outboxId: record.id,
        leaseToken: leased.leaseToken,
        correlationId: record.correlationId,
      });
      result.enqueued += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'META_OUTBOX_QUEUE_UNAVAILABLE';
      result.deferred += 1;
      result.errors.push({ outboxId: record.id, message });
      await releaseMetaOutboxDispatch({
        outboxId: record.id,
        error: { code: 'REDIS_ENQUEUE_FAILED', message },
      });
    }
  }

  return result;
}
