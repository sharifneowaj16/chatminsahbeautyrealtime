import 'server-only';
import { META_QUEUE_NAMES, type MetaCapiOutboxJobPayload } from '@/lib/jobs/job-types';
import { buildCapiOutboxIdempotencyKey } from '@/lib/jobs/idempotency';
import { enqueueMetaCapiOutboxJob } from '@/lib/jobs/queues';

export const META_CAPI_OUTBOX_QUEUE_NAME = META_QUEUE_NAMES.CAPI_EVENTS;
export type MetaCapiOutboxJobData = MetaCapiOutboxJobPayload;

export async function enqueueMetaCapiOutbox(input: { outboxId: string; leaseToken?: string; correlationId?: string }) {
  const result = await enqueueMetaCapiOutboxJob({
    outboxId: input.outboxId,
    leaseToken: input.leaseToken,
    correlationId: input.correlationId,
    idempotencyKey: buildCapiOutboxIdempotencyKey(input.outboxId, input.leaseToken),
  });
  return { ...result, id: result.jobId };
}
