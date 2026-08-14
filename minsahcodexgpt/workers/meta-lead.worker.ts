import { UnrecoverableError } from 'bullmq';
import {
  META_JOB_NAMES,
  META_QUEUE_NAMES,
  type MetaLeadAssignJobPayload,
  type MetaLeadFetchJobPayload,
  type MetaLeadFormSyncJobPayload,
  type MetaLeadReceiptRecoveryJobPayload,
} from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import {
  claimBullMqSocialJob,
  createMetaSocialRetryError,
  decideMetaSocialJobFailure,
  enqueueMetaLeadProcessingJob,
  executeMetaLeadProcessingJob,
} from '@/lib/meta-platform/queue';
import {
  findMetaSocialWebhookReceiptByLegacyReceipt,
  markMetaSocialWebhookReceiptDeadLettered,
} from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { createDefaultMetaSocialQueueAdapter } from '@/lib/meta-platform/server';
import { assignMetaLead } from '@/lib/meta/leads/repository';
import {
  MetaLeadPermanentProcessingError,
  runMetaLeadReceiptRecovery,
  runMetaLeadRetention,
  runMetaLeadSlaAlerts,
} from '@/lib/meta-platform/domains/leads/runtime';
import { processMetaLeadReceiptProduction as processMetaLeadReceipt } from '@/lib/meta-platform/domains/leads/production';
import { syncMetaLeadFormProduction } from '@/lib/meta-platform/domains/leads/form-sync';
import { withMetaSyncLog } from '@/lib/meta-business/logging';

async function deadLetterLeadReceipt(input: {
  legacyReceiptId: string;
  failureCode: string;
  actor: string;
}) {
  const canonical = await findMetaSocialWebhookReceiptByLegacyReceipt({
    legacyReceiptType: 'MetaWebhookReceipt',
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

export function startMetaLeadWorker() {
  const socialQueueAdapter = createDefaultMetaSocialQueueAdapter();
  return startMetaJobWorker(META_QUEUE_NAMES.LEADS, async (job) => {
    if (job.name === META_JOB_NAMES.LEAD_FETCH) {
      const data = job.data as MetaLeadFetchJobPayload;
      try {
        const result = await withMetaSyncLog({
          operation: 'LEADGEN_WEBHOOK_FETCH',
          resourceId: data.leadgenId,
          requestData: { receiptId: data.receiptId, leadgenId: data.leadgenId, pageId: data.pageId, formId: data.formId },
          run: async () => {
            if (!data.socialEnvelope) return processMetaLeadReceipt(data);
            const claim = claimBullMqSocialJob({
              queueName: META_QUEUE_NAMES.LEADS,
              jobName: META_JOB_NAMES.LEAD_FETCH,
              jobId: String(job.id ?? data.idempotencyKey),
              attemptsMade: job.attemptsMade,
              data,
            });
            const execution = await executeMetaLeadProcessingJob({
              claim,
              processReceipt: processMetaLeadReceipt,
            });
            if (execution.outcome === 'ACK') return execution.value;

            const configuredAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
            const decision = decideMetaSocialJobFailure({
              nack: execution.queueResult,
              dedupeKey: data.socialEnvelope.dedupeKey,
              attempt: job.attemptsMade + 1,
              maxAttempts: configuredAttempts,
            });
            if (decision.action !== 'RETRY') {
              await deadLetterLeadReceipt({
                legacyReceiptId: data.receiptId,
                failureCode: decision.safeReasonCode,
                actor: `meta-lead-worker:${process.pid}`,
              }).catch(() => undefined);
              const terminal = new UnrecoverableError(`${decision.classification}:${decision.safeReasonCode}`);
              Object.assign(terminal, decision);
              throw terminal;
            }
            throw createMetaSocialRetryError({ decision, dedupeKey: data.socialEnvelope.dedupeKey });
          },
          count: () => 1,
        });
        return { auditStatus: 'SUCCEEDED' as const, result };
      } catch (error) {
        if (error instanceof MetaLeadPermanentProcessingError) {
          throw new UnrecoverableError(`${error.code}:${error.message}`);
        }
        throw error;
      }
    }
    if (job.name === META_JOB_NAMES.LEAD_FORM_SYNC) {
      const data = job.data as MetaLeadFormSyncJobPayload;
      const result = await withMetaSyncLog({
        operation: 'SYNC_LEAD_ADS', resourceId: data.formId,
        requestData: { formId: data.formId, pageId: data.pageId, limit: data.limit, since: data.since, until: data.until },
        run: async () => syncMetaLeadFormProduction({ ...data, adapter: await socialQueueAdapter }), count: (value) => value.enqueued,
      });
      return { auditStatus: 'SUCCEEDED' as const, result };
    }
    if (job.name === META_JOB_NAMES.LEAD_ASSIGN) {
      const data = job.data as MetaLeadAssignJobPayload;
      return { auditStatus: 'SUCCEEDED' as const, result: await assignMetaLead(data.leadId) };
    }
    if (job.name === META_JOB_NAMES.LEAD_RECEIPT_RECOVERY) {
      const data = job.data as MetaLeadReceiptRecoveryJobPayload;
      const adapter = await socialQueueAdapter;
      const result = await runMetaLeadReceiptRecovery({
        limit: data.limit,
        enqueue: async (receipt) => {
          const canonical = await findMetaSocialWebhookReceiptByLegacyReceipt({
            legacyReceiptType: 'MetaWebhookReceipt',
            legacyReceiptId: receipt.id,
          });
          if (!canonical) throw new Error('META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND');
          const queued = await enqueueMetaLeadProcessingJob({
            adapter,
            receiptId: receipt.id,
            providerLeadId: receipt.leadgenId,
            pageId: receipt.pageId,
            formId: receipt.formId,
            correlationId: receipt.correlationId ?? canonical.correlationId,
            environment: canonical.environment,
            connectionKey: canonical.connectionKey,
          });
          if (!queued.result.accepted) {
            throw Object.assign(new Error(queued.result.code), { code: queued.result.code });
          }
          return queued.result;
        },
      });
      return { auditStatus: 'SUCCEEDED' as const, result };
    }
    if (job.name === META_JOB_NAMES.LEAD_SLA_ALERT) {
      return { auditStatus: 'SUCCEEDED' as const, result: await runMetaLeadSlaAlerts() };
    }
    if (job.name === META_JOB_NAMES.LEAD_RETENTION) {
      return { auditStatus: 'SUCCEEDED' as const, result: await runMetaLeadRetention() };
    }
    throw new UnrecoverableError(`META_LEAD_JOB_UNSUPPORTED:${job.name}`);
  });
}

if (process.argv[1]?.includes('meta-lead.worker')) startMetaLeadWorker();
