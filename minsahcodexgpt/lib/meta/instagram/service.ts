import 'server-only';
import prisma from '@/lib/prisma';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import {
  enqueueMetaInstagramInboundJob,
} from '@/lib/meta-platform/queue';
import { createDefaultMetaSocialQueueAdapter } from '@/lib/meta-platform/server';
import { markMetaSocialWebhookReceiptQueued } from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import {
  handoffMetaWebhookItems,
  summarizeMetaWebhookHandoff,
  type MetaWebhookHandoffSummary,
} from '@/lib/meta-platform/transports/webhook';
import { incrementMetaCounter } from '@/lib/observability/metrics';
import type { NormalizedInstagramEvent } from './types';
import { persistInstagramWebhookReceipt } from './messages';

type Db = { metaInstagramWebhookReceipt: { update(args: unknown): Promise<unknown> } };
const db = prisma as unknown as Db;

export async function receiveInstagramWebhookEvents(input: {
  events: readonly NormalizedInstagramEvent[];
  signatureOk: boolean;
  ignored?: number;
}): Promise<MetaWebhookHandoffSummary> {
  let queueAdapterPromise: ReturnType<typeof createDefaultMetaSocialQueueAdapter> | null = null;
  const getQueueAdapter = () => queueAdapterPromise ??= createDefaultMetaSocialQueueAdapter();
  const records = await handoffMetaWebhookItems({
    items: input.events,
    receive: async (event) => {
      const stored = await persistInstagramWebhookReceipt(event, input.signatureOk);
      const receipt = stored.receipt;

      if (stored.identityBlockedCode) {
        incrementMetaCounter('meta_webhook_received_total', { object_type: 'instagram', outcome: 'identity_blocked' });
        return Object.freeze({
          receiptId: receipt.id,
          disposition: 'REJECTED' as const,
          code: stored.identityBlockedCode,
        });
      }

      if (!input.signatureOk) {
        return Object.freeze({
          receiptId: receipt.id,
          disposition: 'REJECTED' as const,
          code: 'WEBHOOK_SIGNATURE_INVALID',
        });
      }
      if (!stored.created && ['QUEUED', 'PROCESSING', 'PROCESSED', 'IGNORED'].includes(receipt.status)) {
        incrementMetaCounter('meta_webhook_received_total', { object_type: 'instagram', outcome: 'deduplicated' });
        return Object.freeze({
          receiptId: receipt.id,
          disposition: 'DUPLICATE' as const,
          code: `RECEIPT_${receipt.status}`,
        });
      }

      try {
        const queueAdapter = await getQueueAdapter();
        const queued = await enqueueMetaInstagramInboundJob({
          adapter: queueAdapter,
          receiptId: receipt.id,
          providerMessageId: event.platformMessageId,
          accountId: event.accountId,
          correlationId: event.correlationId,
          environment: stored.canonicalReceipt.environment,
          connectionKey: stored.canonicalReceipt.connectionKey,
        });
        if (!queued.result.accepted) {
          throw Object.assign(new Error(queued.result.code), {
            code: queued.result.code,
            retryAt: 'retryAt' in queued.result ? queued.result.retryAt : undefined,
          });
        }
        const canonicalQueued = await markMetaSocialWebhookReceiptQueued({
          receiptId: stored.canonicalReceipt.id,
          queueName: META_QUEUE_NAMES.INSTAGRAM,
          jobReference: queued.envelope.dedupeKey,
          actor: 'instagram-webhook-handoff',
        });
        if (!canonicalQueued.ok) {
          throw new Error(String(canonicalQueued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'));
        }
        await db.metaInstagramWebhookReceipt.update({
          where: { id: receipt.id },
          data: { status: 'QUEUED', queuedAt: new Date(), errorData: null },
        });
        const disposition = stored.created && !queued.result.deduplicated ? 'ACCEPTED' as const : 'DUPLICATE' as const;
        incrementMetaCounter('meta_webhook_received_total', {
          object_type: 'instagram',
          outcome: disposition === 'ACCEPTED' ? 'queued' : 'deduplicated',
        });
        return Object.freeze({
          receiptId: receipt.id,
          disposition,
          ...(queued.result.deduplicated ? { code: 'QUEUE_IDEMPOTENCY_DUPLICATE' } : {}),
        });
      } catch {
        await db.metaInstagramWebhookReceipt.update({
          where: { id: receipt.id },
          data: {
            status: 'FAILED',
            errorData: { code: 'QUEUE_HANDOFF_FAILED' },
          },
        }).catch(() => undefined);
        incrementMetaCounter('meta_webhook_received_total', { object_type: 'instagram', outcome: 'deferred' });
        return Object.freeze({
          receiptId: receipt.id,
          disposition: 'DEFERRED' as const,
          code: 'QUEUE_HANDOFF_FAILED',
        });
      }
    },
  });

  return summarizeMetaWebhookHandoff({ records, ignored: input.ignored });
}
