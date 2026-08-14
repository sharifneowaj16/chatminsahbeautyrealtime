import 'server-only';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import { markMetaSocialWebhookReceiptQueued } from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { enqueueMetaLeadProcessingJob } from '@/lib/meta-platform/queue';
import { createDefaultMetaSocialQueueAdapter } from '@/lib/meta-platform/server';
import {
  handoffMetaWebhookItems,
  summarizeMetaWebhookHandoff,
  type MetaWebhookHandoffRecord,
  type MetaWebhookHandoffSummary,
  type MetaWebhookNotification,
} from '@/lib/meta-platform/transports/webhook';
import { createVerifiedMetaWebhookReceipt, markMetaWebhookReceipt, recordRejectedMetaWebhook } from './receipt';
import { normalizeMetaLeadWebhookNotifications } from './verify';

export async function handoffMetaLeadWebhookNotifications(input: {
  readonly events: readonly MetaWebhookNotification[];
  readonly rawPayload: unknown;
  readonly expectedPageId?: string | null;
  readonly allowedFormIds?: Iterable<string>;
}): Promise<MetaWebhookHandoffSummary> {
  const normalized = normalizeMetaLeadWebhookNotifications({
    events: input.events,
    expectedPageId: input.expectedPageId,
    allowedFormIds: input.allowedFormIds,
  });

  const rejectedRecords: MetaWebhookHandoffRecord[] = [];
  for (const rejected of normalized.rejected) {
    const receipt = await recordRejectedMetaWebhook({
      payloadDigest: input.events[0]?.payloadDigest ?? 'unknown',
      ...rejected,
    });
    rejectedRecords.push(Object.freeze({
      eventKey: receipt.eventKey,
      receiptId: receipt.id,
      disposition: 'REJECTED',
      code: rejected.code,
    }));
  }

  let queueAdapterPromise: ReturnType<typeof createDefaultMetaSocialQueueAdapter> | null = null;
  const getQueueAdapter = () => queueAdapterPromise ??= createDefaultMetaSocialQueueAdapter();
  const acceptedRecords = await handoffMetaWebhookItems({
    items: normalized.notifications,
    receive: async (notification) => {
      const stored = await createVerifiedMetaWebhookReceipt({ notification, rawPayload: input.rawPayload });
      if (!stored.created && ['QUEUED', 'PROCESSED'].includes(stored.receipt.status)) {
        return Object.freeze({
          receiptId: stored.receipt.id,
          disposition: 'DUPLICATE' as const,
          code: `RECEIPT_${stored.receipt.status}`,
        });
      }

      try {
        const queueAdapter = await getQueueAdapter();
        const queued = await enqueueMetaLeadProcessingJob({
          adapter: queueAdapter,
          receiptId: stored.receipt.id,
          providerLeadId: notification.leadgenId,
          pageId: notification.pageId,
          formId: notification.formId,
          correlationId: stored.receipt.correlationId,
          environment: stored.canonicalReceipt.environment,
          connectionKey: stored.canonicalReceipt.connectionKey,
        });
        if (!queued.result.accepted) {
          throw Object.assign(new Error(queued.result.code), {
            code: queued.result.code,
            ...(queued.result.outcome === 'DEFERRED' ? { retryAt: queued.result.retryAt } : {}),
          });
        }
        const canonicalQueued = await markMetaSocialWebhookReceiptQueued({
          receiptId: stored.canonicalReceipt.id,
          queueName: META_QUEUE_NAMES.LEADS,
          jobReference: queued.envelope.dedupeKey,
          actor: 'lead-webhook-handoff',
        });
        if (!canonicalQueued.ok) {
          throw new Error(String(canonicalQueued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'));
        }
        await markMetaWebhookReceipt({ receiptId: stored.receipt.id, status: 'QUEUED' });
        return Object.freeze({
          receiptId: stored.receipt.id,
          disposition: stored.created && !queued.result.deduplicated ? 'ACCEPTED' as const : 'DUPLICATE' as const,
          ...(queued.result.deduplicated ? { code: 'QUEUE_IDEMPOTENCY_DUPLICATE' } : {}),
        });
      } catch (error) {
        await markMetaWebhookReceipt({ receiptId: stored.receipt.id, status: 'FAILED', error }).catch(() => undefined);
        return Object.freeze({
          receiptId: stored.receipt.id,
          disposition: 'DEFERRED' as const,
          code: 'QUEUE_HANDOFF_FAILED',
        });
      }
    },
  });

  const routedCount = input.events.filter((event) => event.routingTarget === 'LEAD_ADS').length;
  const accountedCount = normalized.notifications.length + normalized.rejected.length;
  return summarizeMetaWebhookHandoff({
    records: Object.freeze([...acceptedRecords, ...rejectedRecords]),
    ignored: Math.max(0, input.events.length - routedCount) + Math.max(0, routedCount - accountedCount),
  });
}
