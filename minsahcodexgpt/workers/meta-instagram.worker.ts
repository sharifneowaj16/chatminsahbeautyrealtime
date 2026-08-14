import { UnrecoverableError } from 'bullmq';
import {
  META_JOB_NAMES,
  META_QUEUE_NAMES,
  type MetaInstagramMessageJobPayload,
  type MetaInstagramReceiptRecoveryJobPayload,
  type MetaInstagramReplyJobPayload,
  type MetaInstagramPrivateReplyJobPayload,
} from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import {
  claimBullMqSocialJob,
  createMetaSocialRetryError,
  decideMetaSocialJobFailure,
  enqueueMetaInstagramInboundJob,
  enqueueMetaSocialAttachmentValidationJob,
  executeMetaInstagramInboundJob,
  executeMetaInstagramOutboundJob,
  type MetaSocialQueueAdapter,
} from '@/lib/meta-platform/queue';
import {
  findMetaSocialWebhookReceiptByLegacyReceipt,
  markMetaSocialWebhookReceiptDeadLettered,
  markMetaSocialWebhookReceiptQueued,
} from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { createDefaultMetaSocialQueueAdapter } from '@/lib/meta-platform/server';
import {
  markInstagramReplyBlockedStorage,
  markInstagramReplyFailedStorage,
} from '@/lib/meta-platform/repositories/prisma-instagram-persistence';
import {
  runInstagramReceiptRecovery,
  runInstagramRetention,
  type MetaInstagramAttachmentValidationScheduleInput,
} from '@/lib/meta/instagram/messages';
import { processInstagramInboundReceiptProduction as processInstagramWebhookReceipt } from '@/lib/meta-platform/domains/instagram/production';
import { executeInstagramStandardReplyProduction } from '@/lib/meta-platform/domains/instagram/standard-reply-runtime';
import { executeInstagramPrivateReplyProduction } from '@/lib/meta-platform/domains/instagram/private-reply-runtime';

async function deadLetterInstagramReceipt(input: {
  legacyReceiptId: string;
  failureCode: string;
  actor: string;
}) {
  const canonical = await findMetaSocialWebhookReceiptByLegacyReceipt({
    legacyReceiptType: 'MetaInstagramWebhookReceipt',
    legacyReceiptId: input.legacyReceiptId,
  });
  if (!canonical || canonical.state === 'DEAD_LETTERED' || canonical.state === 'PROCESSED' || canonical.state === 'BLOCKED') {
    return canonical;
  }
  if (canonical.state !== 'FAILED') return canonical;
  const result = await markMetaSocialWebhookReceiptDeadLettered({
    receiptId: canonical.id,
    failureCode: input.failureCode,
    failureSummary: input.failureCode,
    actor: input.actor,
  });
  return result.ok ? result.value : canonical;
}

async function scheduleAttachmentValidation(
  adapter: MetaSocialQueueAdapter,
  input: MetaInstagramAttachmentValidationScheduleInput,
) {
  const queued = await enqueueMetaSocialAttachmentValidationJob({
    adapter,
    attachmentId: input.attachmentId,
    messageId: input.messageId,
    conversationId: input.conversationId,
    accountId: input.accountId,
    correlationId: input.correlationId,
    sourceDigest: input.sourceDigest,
  });
  return queued.result.accepted
    ? Object.freeze({ accepted: true, jobReference: queued.envelope.dedupeKey })
    : Object.freeze({ accepted: false, code: queued.result.code });
}

export function startMetaInstagramWorker() {
  const socialQueueAdapter = createDefaultMetaSocialQueueAdapter();
  return startMetaJobWorker(META_QUEUE_NAMES.INSTAGRAM, async (job) => {
    if (job.name === META_JOB_NAMES.INSTAGRAM_MESSAGE) {
      const data = job.data as MetaInstagramMessageJobPayload;
      const adapter = await socialQueueAdapter;
      const configuredAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
      const actor = `meta-instagram-worker:${process.pid}`;

      try {
        if (!data.socialEnvelope) {
          const result = await processInstagramWebhookReceipt(data.receiptId, {
            scheduleAttachmentValidation: (input) => scheduleAttachmentValidation(adapter, input),
          });
          return { auditStatus: 'SUCCEEDED' as const, result };
        }

        const claim = claimBullMqSocialJob({
          queueName: META_QUEUE_NAMES.INSTAGRAM,
          jobName: META_JOB_NAMES.INSTAGRAM_MESSAGE,
          jobId: String(job.id ?? data.idempotencyKey),
          attemptsMade: job.attemptsMade,
          data,
        });
        const execution = await executeMetaInstagramInboundJob({
          claim,
          processReceipt: ({ receiptId, providerMessageId, accountId, now }) => processInstagramWebhookReceipt(receiptId, {
            expectedProviderMessageId: providerMessageId,
            expectedAccountId: accountId,
            now,
            scheduleAttachmentValidation: (input) => scheduleAttachmentValidation(adapter, input),
          }),
        });
        if (execution.outcome === 'ACK') {
          return { auditStatus: 'SUCCEEDED' as const, result: execution.value };
        }

        const decision = decideMetaSocialJobFailure({
          nack: execution.queueResult,
          dedupeKey: data.socialEnvelope.dedupeKey,
          attempt: job.attemptsMade + 1,
          maxAttempts: configuredAttempts,
        });
        if (decision.action !== 'RETRY') {
          await deadLetterInstagramReceipt({
            legacyReceiptId: data.receiptId,
            failureCode: decision.safeReasonCode,
            actor,
          }).catch(() => undefined);
          const terminal = new UnrecoverableError(`${decision.classification}:${decision.safeReasonCode}`);
          Object.assign(terminal, decision);
          throw terminal;
        }
        throw createMetaSocialRetryError({ decision, dedupeKey: data.socialEnvelope.dedupeKey });
      } catch (error) {
        if (error instanceof UnrecoverableError) throw error;
        if (job.attemptsMade + 1 >= configuredAttempts) {
          const failureCode = String((error as { code?: unknown })?.code ?? 'INSTAGRAM_INBOUND_RETRY_EXHAUSTED')
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_')
            .slice(0, 96);
          await deadLetterInstagramReceipt({
            legacyReceiptId: data.receiptId,
            failureCode: /^[A-Z][A-Z0-9_]{2,95}$/.test(failureCode) ? failureCode : 'INSTAGRAM_INBOUND_RETRY_EXHAUSTED',
            actor,
          }).catch(() => undefined);
        }
        throw error;
      }
    }
    if (job.name === META_JOB_NAMES.INSTAGRAM_REPLY || job.name === META_JOB_NAMES.INSTAGRAM_PRIVATE_REPLY) {
      const data = job.data as MetaInstagramReplyJobPayload | MetaInstagramPrivateReplyJobPayload;
      const configuredAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
      const claim = claimBullMqSocialJob({
        queueName: META_QUEUE_NAMES.INSTAGRAM,
        jobName: job.name,
        jobId: String(job.id ?? data.idempotencyKey),
        attemptsMade: job.attemptsMade,
        data,
      });
      const execution = await executeMetaInstagramOutboundJob({
        claim,
        processAttempt: (attempt) => attempt.mode === 'MESSAGE'
          ? executeInstagramStandardReplyProduction(attempt)
          : executeInstagramPrivateReplyProduction(attempt),
      });
      if (execution.outcome === 'ACK') {
        return { auditStatus: 'SUCCEEDED' as const, result: execution.value };
      }
      const decision = decideMetaSocialJobFailure({
        nack: execution.queueResult,
        dedupeKey: data.socialEnvelope.dedupeKey,
        attempt: job.attemptsMade + 1,
        maxAttempts: configuredAttempts,
      });
      if (decision.reconciliationRequired || decision.action === 'RECONCILE') {
        const terminal = new UnrecoverableError(`UNKNOWN_WRITE:${decision.safeReasonCode}`);
        Object.assign(terminal, decision);
        throw terminal;
      }
      if (decision.action === 'DEAD_LETTER') {
        if (decision.classification === 'POLICY_BLOCKED') {
          await markInstagramReplyBlockedStorage({
            attemptId: data.socialEnvelope.payloadRef.id,
            failureCode: decision.safeReasonCode,
            failureSummary: `Execution-time outbound control blocked the provider write: ${decision.safeReasonCode}.`,
          }).catch(() => undefined);
        } else if (decision.safeReasonCode === 'META_SOCIAL_RETRY_EXHAUSTED') {
          await markInstagramReplyFailedStorage({
            attemptId: data.socialEnvelope.payloadRef.id,
            failureCode: 'INSTAGRAM_OUTBOUND_RETRY_EXHAUSTED',
            failureSummary: 'Instagram outbound retry attempts were exhausted.',
          }).catch(() => undefined);
        }
        const terminal = new UnrecoverableError(`${decision.classification}:${decision.safeReasonCode}`);
        Object.assign(terminal, decision);
        throw terminal;
      }
      throw createMetaSocialRetryError({ decision, dedupeKey: data.socialEnvelope.dedupeKey });
    }
    if (job.name === META_JOB_NAMES.INSTAGRAM_RECEIPT_RECOVERY) {
      const data = job.data as MetaInstagramReceiptRecoveryJobPayload;
      const adapter = await socialQueueAdapter;
      const result = await runInstagramReceiptRecovery({
        limit: data.limit,
        enqueue: async ({ id, event }) => {
          const canonical = await findMetaSocialWebhookReceiptByLegacyReceipt({
            legacyReceiptType: 'MetaInstagramWebhookReceipt',
            legacyReceiptId: id,
          });
          if (!canonical) throw Object.assign(new Error('META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND'), { code: 'META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND' });
          const queued = await enqueueMetaInstagramInboundJob({
            adapter,
            receiptId: id,
            providerMessageId: event.platformMessageId,
            accountId: event.accountId,
            correlationId: event.correlationId ?? canonical.correlationId,
            environment: canonical.environment,
            connectionKey: canonical.connectionKey,
          });
          if (!queued.result.accepted) throw Object.assign(new Error(queued.result.code), { code: queued.result.code });
          const transitioned = await markMetaSocialWebhookReceiptQueued({
            receiptId: canonical.id,
            queueName: META_QUEUE_NAMES.INSTAGRAM,
            jobReference: queued.envelope.dedupeKey,
            actor: `meta-instagram-recovery:${process.pid}`,
          });
          if (!transitioned.ok) throw Object.assign(new Error('CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'), { code: 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED' });
          return queued.result;
        },
      });
      return { auditStatus: 'SUCCEEDED' as const, result };
    }
    if (job.name === META_JOB_NAMES.INSTAGRAM_RETENTION) {
      return { auditStatus: 'SUCCEEDED' as const, result: await runInstagramRetention() };
    }
    throw new UnrecoverableError(`META_INSTAGRAM_JOB_UNSUPPORTED:${job.name}`);
  });
}

if (process.argv[1]?.includes('meta-instagram.worker')) startMetaInstagramWorker();
