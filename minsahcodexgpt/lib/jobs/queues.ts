import 'server-only';
import { Queue, type JobsOptions } from 'bullmq';
import { getMetaJobsRedis } from './connection';
import {
  META_JOB_NAMES,
  META_JOB_SCHEMA_VERSION,
  META_QUEUE_NAMES,
  validateMetaJobPayload,
  type MetaJobName,
  type MetaJobPayload,
  type MetaQueueName,
  type MetaCapiOutboxJobPayload,
  type MetaCatalogSyncJobPayload,
  type MetaCatalogStatusJobPayload,
  type MetaLeadFetchJobPayload,
  type MetaLeadFormSyncJobPayload,
  type MetaLeadAssignJobPayload,
  type MetaLeadReceiptRecoveryJobPayload,
  type MetaLeadSlaAlertJobPayload,
  type MetaLeadRetentionJobPayload,
  type MetaCatalogDiagnosticsJobPayload,
  type MetaConnectionHealthJobPayload,
  type MetaProductSetReconcileJobPayload,
  type MetaAdsInsightsJobPayload,
  type MetaInstagramMessageJobPayload,
  type MetaInstagramReceiptRecoveryJobPayload,
  type MetaInstagramRetentionJobPayload,
} from './job-types';
import { buildMetaJobId } from './idempotency';
import { createCorrelationId } from '@/lib/observability/correlation';
import {
  attachMetaJobExternalId,
  reserveMetaJobAudit,
  updateMetaJobAudit,
} from './audit-repository';
import { META_PROVIDER_MAX_ATTEMPTS } from './retry-policy';

const globalForMetaQueues = globalThis as unknown as {
  metaV6Queues?: Partial<Record<MetaQueueName, Queue<MetaJobPayload>>>;
};

const queueStore = globalForMetaQueues.metaV6Queues ?? {};
if (process.env.NODE_ENV !== 'production') globalForMetaQueues.metaV6Queues = queueStore;

function queueDefaults(queueName: MetaQueueName): JobsOptions {
  return {
    attempts: queueName === META_QUEUE_NAMES.CAPI_EVENTS ? 1 : META_PROVIDER_MAX_ATTEMPTS,
    backoff: queueName === META_QUEUE_NAMES.CAPI_EVENTS ? undefined : { type: 'meta-provider' },
    removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
    removeOnFail: { age: 14 * 24 * 60 * 60, count: 5_000 },
  };
}

export function getMetaQueue(queueName: MetaQueueName) {
  const existing = queueStore[queueName];
  if (existing) return existing;
  const created = new Queue<MetaJobPayload>(queueName, {
    connection: getMetaJobsRedis(),
    defaultJobOptions: queueDefaults(queueName),
  });
  queueStore[queueName] = created;
  return created;
}

export async function enqueueMetaJob(input: {
  queueName: MetaQueueName;
  jobName: MetaJobName;
  payload: Omit<MetaJobPayload, 'auditId'>;
  sourceId?: string;
  requestedBy?: string;
  replayOfId?: string;
  options?: JobsOptions;
}) {
  const validation = validateMetaJobPayload({
    queueName: input.queueName,
    jobName: input.jobName,
    payload: input.payload,
  });
  if (!validation.valid) {
    const error = new Error('META_JOB_PAYLOAD_INVALID');
    Object.assign(error, { issues: validation.issues });
    throw error;
  }

  const reserved = await reserveMetaJobAudit({
    queueName: input.queueName,
    jobName: input.jobName,
    idempotencyKey: input.payload.idempotencyKey,
    payload: validation.payload,
    sourceId: input.sourceId ?? input.payload.sourceId,
    maxAttempts: input.queueName === META_QUEUE_NAMES.CAPI_EVENTS ? 1 : META_PROVIDER_MAX_ATTEMPTS,
    requestedBy: input.requestedBy,
    replayOfId: input.replayOfId,
  });

  const duplicateTerminal = !reserved.created && ['QUEUED', 'RUNNING', 'SUCCEEDED', 'CANCELLED', 'DEAD_LETTER'].includes(reserved.record.status);
  if (duplicateTerminal) {
    return {
      accepted: true,
      deduplicated: true,
      auditId: reserved.record.id,
      jobId: reserved.record.externalJobId ?? undefined,
      idempotencyKey: reserved.record.idempotencyKey,
      status: reserved.record.status,
    };
  }

  const jobId = buildMetaJobId(input.queueName, input.payload.idempotencyKey);
  const queue = getMetaQueue(input.queueName);
  try {
    const job = await queue.add(
      input.jobName,
      { ...validation.payload, auditId: reserved.record.id } as MetaJobPayload,
      { ...input.options, jobId }
    );
    await attachMetaJobExternalId({ auditId: reserved.record.id, externalJobId: String(job.id ?? jobId) });
    return {
      accepted: true,
      deduplicated: false,
      auditId: reserved.record.id,
      jobId: String(job.id ?? jobId),
      idempotencyKey: reserved.record.idempotencyKey,
      status: 'QUEUED' as const,
    };
  } catch (error) {
    await updateMetaJobAudit({
      auditId: reserved.record.id,
      status: 'RETRYING',
      error: { code: 'REDIS_ENQUEUE_FAILED', message: error instanceof Error ? error.message : 'Unknown Redis enqueue failure' },
      nextRunAt: new Date(Date.now() + 60_000),
    });
    throw error;
  }
}

function base(idempotencyKey: string, sourceId?: string, correlationId?: string) {
  return {
    schemaVersion: META_JOB_SCHEMA_VERSION,
    idempotencyKey,
    requestedAt: new Date().toISOString(),
    correlationId: correlationId ?? createCorrelationId('meta-job'),
    sourceId,
  } as const;
}

export function enqueueMetaCapiOutboxJob(input: {
  outboxId: string;
  leaseToken?: string;
  idempotencyKey: string;
  correlationId?: string;
}) {
  const payload: Omit<MetaCapiOutboxJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.outboxId, input.correlationId),
    type: 'capi_outbox',
    outboxId: input.outboxId,
    leaseToken: input.leaseToken,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.CAPI_EVENTS, jobName: META_JOB_NAMES.CAPI_OUTBOX, payload });
}

export function enqueueMetaCatalogSyncJob(input: {
  idempotencyKey: string;
  catalogId?: string;
  mode: MetaCatalogSyncJobPayload['mode'];
  requestedBy?: string;
  productIds?: string[];
  deletePlanId?: string;
  correlationId?: string;
}) {
  const payload: Omit<MetaCatalogSyncJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.catalogId, input.correlationId),
    type: 'catalog_sync',
    catalogId: input.catalogId,
    mode: input.mode,
    ...(input.productIds && input.productIds.length > 0 ? { productIds: input.productIds } : {}),
    deletePlanId: input.deletePlanId,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.CATALOG_SYNC, jobName: META_JOB_NAMES.CATALOG_SYNC, payload, requestedBy: input.requestedBy });
}

export function enqueueMetaCatalogStatusJob(input: {
  idempotencyKey: string;
  catalogId?: string;
  limit?: number;
  requestedBy?: string;
}) {
  const payload: Omit<MetaCatalogStatusJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.catalogId),
    type: 'catalog_status',
    catalogId: input.catalogId,
    limit: Math.max(1, Math.min(input.limit ?? 25, 100)),
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.CATALOG_STATUS, jobName: META_JOB_NAMES.CATALOG_STATUS, payload, requestedBy: input.requestedBy });
}

export function enqueueMetaLeadFetchJob(input: {
  idempotencyKey: string;
  receiptId: string;
  leadgenId: string;
  pageId?: string;
  formId?: string;
  correlationId?: string;
}) {
  const payload: Omit<MetaLeadFetchJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.receiptId, input.correlationId),
    type: 'lead_fetch',
    receiptId: input.receiptId,
    leadgenId: input.leadgenId,
    pageId: input.pageId,
    formId: input.formId,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.LEADS, jobName: META_JOB_NAMES.LEAD_FETCH, payload, sourceId: input.receiptId });
}

export function enqueueMetaLeadFormSyncJob(input: {
  idempotencyKey: string;
  formId: string;
  pageId?: string;
  limit?: number;
  since?: number;
  until?: number;
  requestedBy?: string;
}) {
  const payload: Omit<MetaLeadFormSyncJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.formId),
    type: 'lead_form_sync', formId: input.formId, pageId: input.pageId,
    limit: Math.max(1, Math.min(input.limit ?? 100, 500)), since: input.since, until: input.until,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.LEADS, jobName: META_JOB_NAMES.LEAD_FORM_SYNC, payload, requestedBy: input.requestedBy });
}

export function enqueueMetaLeadAssignJob(input: { idempotencyKey: string; leadId: string }) {
  const payload: Omit<MetaLeadAssignJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.leadId), type: 'lead_assign', leadId: input.leadId,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.LEADS, jobName: META_JOB_NAMES.LEAD_ASSIGN, payload });
}

export function enqueueMetaLeadReceiptRecoveryJob(input: { idempotencyKey: string; limit?: number }) {
  const payload: Omit<MetaLeadReceiptRecoveryJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'lead-receipt-recovery'), type: 'lead_receipt_recovery', limit: Math.max(1, Math.min(input.limit ?? 100, 500)),
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.LEADS, jobName: META_JOB_NAMES.LEAD_RECEIPT_RECOVERY, payload });
}

export function enqueueMetaLeadSlaAlertJob(input: { idempotencyKey: string }) {
  const payload: Omit<MetaLeadSlaAlertJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'lead-sla-alert'), type: 'lead_sla_alert',
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.LEADS, jobName: META_JOB_NAMES.LEAD_SLA_ALERT, payload });
}

export function enqueueMetaLeadRetentionJob(input: { idempotencyKey: string }) {
  const payload: Omit<MetaLeadRetentionJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'lead-retention'), type: 'lead_retention',
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.LEADS, jobName: META_JOB_NAMES.LEAD_RETENTION, payload });
}

export function enqueueMetaCatalogDiagnosticsJob(input: {
  idempotencyKey: string;
  catalogId?: string;
  requestedBy?: string;
}) {
  const payload: Omit<MetaCatalogDiagnosticsJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.catalogId),
    type: 'catalog_diagnostics',
    catalogId: input.catalogId,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.DIAGNOSTICS, jobName: META_JOB_NAMES.CATALOG_DIAGNOSTICS, payload, requestedBy: input.requestedBy });
}

export function enqueueMetaConnectionHealthJob(input: {
  idempotencyKey: string;
  connectionId?: string;
  checks?: MetaConnectionHealthJobPayload['checks'];
  requestedBy?: string;
}) {
  const payload: Omit<MetaConnectionHealthJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.connectionId),
    type: 'connection_health',
    connectionId: input.connectionId,
    checks: input.checks ?? ['TOKEN', 'PERMISSIONS', 'ASSETS', 'VERSION'],
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.CONNECTION_HEALTH, jobName: META_JOB_NAMES.CONNECTION_HEALTH, payload, requestedBy: input.requestedBy });
}

export function enqueueMetaProductSetReconcileJob(input: { idempotencyKey: string; requestedBy?: string }) {
  const payload: Omit<MetaProductSetReconcileJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'product-set-reconcile'), type: 'product_set_reconcile',
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.PRODUCT_SETS, jobName: META_JOB_NAMES.PRODUCT_SET_RECONCILE, payload, requestedBy: input.requestedBy });
}


export function enqueueMetaAdsInsightsJob(input: {
  idempotencyKey: string;
  level?: MetaAdsInsightsJobPayload['level'];
  since: string;
  until: string;
  requestedBy?: string;
}) {
  const payload: Omit<MetaAdsInsightsJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'ads-insights'),
    type: 'ads_insights_sync',
    level: input.level ?? 'CAMPAIGN',
    since: input.since,
    until: input.until,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.ADS_INSIGHTS, jobName: META_JOB_NAMES.ADS_INSIGHTS_SYNC, payload, requestedBy: input.requestedBy });
}


export function enqueueMetaInstagramMessageJob(input: {
  idempotencyKey: string;
  receiptId: string;
  correlationId?: string;
}) {
  const payload: Omit<MetaInstagramMessageJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, input.receiptId, input.correlationId),
    type: 'instagram_message',
    receiptId: input.receiptId,
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.INSTAGRAM, jobName: META_JOB_NAMES.INSTAGRAM_MESSAGE, payload, sourceId: input.receiptId });
}

export function enqueueMetaInstagramReceiptRecoveryJob(input: { idempotencyKey: string; limit?: number }) {
  const payload: Omit<MetaInstagramReceiptRecoveryJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'instagram-receipt-recovery'),
    type: 'instagram_receipt_recovery',
    limit: Math.max(1, Math.min(input.limit ?? 100, 500)),
  };
  return enqueueMetaJob({
    queueName: META_QUEUE_NAMES.INSTAGRAM,
    jobName: META_JOB_NAMES.INSTAGRAM_RECEIPT_RECOVERY,
    payload,
  });
}

export function enqueueMetaInstagramRetentionJob(input: { idempotencyKey: string; requestedBy?: string }) {
  const payload: Omit<MetaInstagramRetentionJobPayload, 'auditId'> = {
    ...base(input.idempotencyKey, 'instagram-retention'),
    type: 'instagram_retention',
  };
  return enqueueMetaJob({ queueName: META_QUEUE_NAMES.INSTAGRAM, jobName: META_JOB_NAMES.INSTAGRAM_RETENTION, payload, requestedBy: input.requestedBy });
}
