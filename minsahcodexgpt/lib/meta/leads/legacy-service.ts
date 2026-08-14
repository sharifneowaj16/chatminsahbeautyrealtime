import 'server-only';
import crypto from 'node:crypto';
import { buildLeadFetchIdempotencyKey } from '@/lib/jobs/idempotency';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import {
  claimMetaSocialWebhookReceipt,
  findMetaSocialWebhookReceiptByLegacyReceipt,
  markMetaSocialWebhookReceiptDeadLettered,
  markMetaSocialWebhookReceiptFailed,
  markMetaSocialWebhookReceiptProcessed,
  markMetaSocialWebhookReceiptQueued,
  requeueFailedMetaSocialWebhookReceipt,
} from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { encryptMetaLeadPayload } from './crypto';
import { getMetaLeadConfig, requireMetaLeadEncryptionSecret, requireMetaLeadFingerprintSecret } from './config';
import { fetchMetaLeadGraphRecord, MetaLeadFetchError } from './fetch';
import { normalizeMetaLeadFields } from './normalize';
import { notifyMetaLeadAssignment } from './notify';
import {
  assignMetaLead,
  runMetaLeadRetentionCleanup,
  runMetaLeadSlaScan,
} from './repository';
import {
  beginMetaLeadProcessingAttempt,
  ensureMetaLeadStorageIdentities,
  fingerprintMetaLeadIdentity,
  markMetaLeadProcessingAttemptFailed,
  markMetaLeadProcessingAttemptFetching,
  persistNormalizedMetaLeadStorage,
} from '@/lib/meta-platform/repositories';
import {
  getMetaWebhookReceipt,
  listRecoverableMetaLeadReceipts,
  markMetaWebhookReceipt,
} from './receipt';

export class MetaLeadPermanentProcessingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message); this.name = 'MetaLeadPermanentProcessingError'; this.code = code;
  }
}

function safeError(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown; traceId?: unknown; httpStatus?: unknown; retrievalStatus?: unknown };
  return {
    code: typeof candidate?.code === 'string' || typeof candidate?.code === 'number' ? String(candidate.code) : 'META_LEAD_PROCESSING_ERROR',
    message: typeof candidate?.message === 'string' ? candidate.message
      .replace(/EA[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
      .replace(/https?:\/\/\S+/gi, '[REDACTED_URL]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[REDACTED_PHONE]')
      .slice(0, 500) : 'Lead processing failed',
    traceId: typeof candidate?.traceId === 'string' ? candidate.traceId : undefined,
    httpStatus: typeof candidate?.httpStatus === 'number' ? candidate.httpStatus : undefined,
    retrievalStatus: typeof candidate?.retrievalStatus === 'string' ? candidate.retrievalStatus : undefined,
  };
}

export async function processMetaLeadReceipt(input: {
  receiptId: string;
  leadgenId: string;
  pageId?: string;
  formId?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
  observeFetchedPayload?: (payload: import('@/lib/meta-platform/domains/leads/types').MetaLeadProviderPayload) => void;
}) {
  const config = getMetaLeadConfig();
  const receipt = await getMetaWebhookReceipt(input.receiptId);
  if (!receipt) throw new MetaLeadPermanentProcessingError('META_WEBHOOK_RECEIPT_NOT_FOUND', 'Meta webhook receipt was not found.');
  if (receipt.processedAt || receipt.status === 'PROCESSED') {
    return { receiptId: receipt.id, leadgenId: input.leadgenId, deduplicated: true, status: 'PROCESSED' as const };
  }
  if (receipt.leadgenId && receipt.leadgenId !== input.leadgenId) {
    throw new MetaLeadPermanentProcessingError('META_WEBHOOK_RECEIPT_LEAD_MISMATCH', 'Receipt lead ID does not match queued lead ID.');
  }
  const pageId = input.pageId ?? receipt.pageId ?? undefined;
  if (!pageId) throw new MetaLeadPermanentProcessingError('META_LEAD_PAGE_ID_REQUIRED', 'Lead notification page ID is required.');
  if (config.pageId && pageId !== config.pageId) {
    throw new MetaLeadPermanentProcessingError('META_LEAD_PAGE_OWNERSHIP_MISMATCH', 'Lead notification page is not owned by the configured connection.');
  }

  let canonical = await findMetaSocialWebhookReceiptByLegacyReceipt({
    legacyReceiptType: 'MetaWebhookReceipt',
    legacyReceiptId: receipt.id,
  });
  if (!canonical) {
    throw new MetaLeadPermanentProcessingError('META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND', 'Canonical Meta webhook receipt was not found.');
  }
  if (canonical.state === 'PROCESSED') {
    return { receiptId: receipt.id, leadgenId: input.leadgenId, deduplicated: true, status: 'PROCESSED' as const };
  }
  const queueReference = buildLeadFetchIdempotencyKey(input.leadgenId, receipt.id);
  if (canonical.state === 'RECEIVED') {
    const queued = await markMetaSocialWebhookReceiptQueued({
      receiptId: canonical.id,
      queueName: META_QUEUE_NAMES.LEADS,
      jobReference: queueReference,
      actor: 'meta-lead-worker-recovery',
      now: input.now,
    });
    if (!queued.ok) throw new Error(String(queued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'));
    canonical = queued.value.receipt;
  } else if (canonical.state === 'FAILED') {
    const requeued = await requeueFailedMetaSocialWebhookReceipt({
      receiptId: canonical.id,
      queueName: META_QUEUE_NAMES.LEADS,
      jobReference: queueReference,
      actor: 'meta-lead-worker-retry',
      now: input.now,
    });
    if (!requeued.ok) throw new Error(String(requeued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_REQUEUE_FAILED'));
    canonical = requeued.value;
  }
  if (canonical.state === 'BLOCKED' || canonical.state === 'DEAD_LETTERED') {
    throw new MetaLeadPermanentProcessingError(
      'META_SOCIAL_WEBHOOK_RECEIPT_TERMINAL',
      `Canonical receipt is terminal in state ${canonical.state}.`,
    );
  }
  const leaseOwner = `meta-lead-worker:${process.pid}`;
  const claim = await claimMetaSocialWebhookReceipt({
    receiptId: canonical.id,
    leaseOwner,
    now: input.now,
  });
  if (!claim.ok) {
    const current = await findMetaSocialWebhookReceiptByLegacyReceipt({
      legacyReceiptType: 'MetaWebhookReceipt',
      legacyReceiptId: receipt.id,
    });
    if (current?.state === 'PROCESSED') {
      return { receiptId: receipt.id, leadgenId: input.leadgenId, deduplicated: true, status: 'PROCESSED' as const };
    }
    const conflict = new Error(String(claim.error.safeDetails?.sourceCode ?? 'META_SOCIAL_WEBHOOK_RECEIPT_NOT_CLAIMABLE'));
    Object.assign(conflict, { retryable: true });
    throw conflict;
  }
  const canonicalLease = claim.value.leaseToken;
  const notificationFormId = input.formId ?? receipt.formId ?? (typeof canonical.safeMetadata.formId === 'string' ? canonical.safeMetadata.formId : undefined);
  let processingAttemptId: string | null = null;

  await markMetaWebhookReceipt({ receiptId: receipt.id, status: 'QUEUED', incrementAttempt: true });
  try {
    const attempt = await beginMetaLeadProcessingAttempt({
      receiptId: canonical.id,
      providerLeadId: input.leadgenId,
      environment: canonical.environment,
      connectionKey: canonical.connectionKey,
      pageId,
      formId: notificationFormId ?? null,
    });
    processingAttemptId = attempt.id;
    const fetching = await markMetaLeadProcessingAttemptFetching({ receiptId: canonical.id, now: input.now });
    if (fetching.retrievalStatus === 'FETCHED' && fetching.normalizedLeadId) {
      await markMetaWebhookReceipt({ receiptId: receipt.id, status: 'PROCESSED' });
      const recovered = await markMetaSocialWebhookReceiptProcessed({
        receiptId: canonical.id,
        leaseToken: canonicalLease,
        actor: leaseOwner,
        now: input.now,
      });
      if (!recovered.ok) throw new Error(String(recovered.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_COMPLETION_FAILED'));
      return {
        receiptId: receipt.id,
        leadgenId: input.leadgenId,
        leadId: fetching.normalizedLeadId,
        canonicalLeadId: fetching.normalizedLeadId,
        created: false,
        duplicate: true,
        duplicateReason: 'LEADGEN_ID' as const,
        deduplicated: true,
        status: 'PROCESSED' as const,
      };
    }

    const fetched = await fetchMetaLeadGraphRecord({ leadgenId: input.leadgenId, fetchImpl: input.fetchImpl, now: input.now });
    const raw = fetched.payload;
    try { input.observeFetchedPayload?.(raw); } catch { /* shadow observation must never affect authority processing */ }
    const formId = raw.form_id ?? notificationFormId;
    if (notificationFormId && raw.form_id && notificationFormId !== raw.form_id) {
      throw new MetaLeadPermanentProcessingError('META_LEAD_RECEIPT_FORM_MISMATCH', 'Retrieved Lead form does not match the canonical receipt.');
    }
    if (config.allowedFormIds.size > 0 && (!formId || !config.allowedFormIds.has(formId))) {
      throw new MetaLeadPermanentProcessingError('META_LEAD_FORM_OWNERSHIP_MISMATCH', 'Retrieved lead form is not in the configured allowlist.');
    }
    const identities = await ensureMetaLeadStorageIdentities({
      receiptId: canonical.id,
      receiptPrimaryIdentityReferenceId: canonical.primaryIdentityReferenceId,
      environment: canonical.environment,
      connectionKey: canonical.connectionKey,
      pageId,
      formId: formId ?? null,
      pageConfigured: !config.pageId || config.pageId === pageId,
      formAllowlisted: config.allowedFormIds.size === 0 || Boolean(formId && config.allowedFormIds.has(formId)),
    });
    const { fields, normalized } = normalizeMetaLeadFields(raw);
    const fingerprintSecret = requireMetaLeadFingerprintSecret();
    const phoneFingerprint = fingerprintMetaLeadIdentity({
      normalizedValue: normalized.phone,
      secret: fingerprintSecret,
      environment: canonical.environment,
      connectionKey: canonical.connectionKey,
      kind: 'PHONE',
    });
    const emailFingerprint = fingerprintMetaLeadIdentity({
      normalizedValue: normalized.email,
      secret: fingerprintSecret,
      environment: canonical.environment,
      connectionKey: canonical.connectionKey,
      kind: 'EMAIL',
    });
    const encryptedRawPayload = encryptMetaLeadPayload(raw, requireMetaLeadEncryptionSecret());
    const rawPayloadDigest = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const persisted = await persistNormalizedMetaLeadStorage({
      legacyReceiptId: receipt.id,
      canonicalReceiptId: canonical.id,
      processingAttemptId: attempt.id,
      environment: canonical.environment,
      connectionKey: canonical.connectionKey,
      pageId,
      formId: formId ?? null,
      pageIdentityReferenceId: identities.pageIdentityReferenceId,
      formIdentityReferenceId: identities.formIdentityReferenceId,
      raw: { ...raw, form_id: formId },
      fields,
      normalized,
      encryptedRawPayload,
      rawPayloadDigest,
      phoneFingerprint,
      emailFingerprint,
      freshnessSeconds: fetched.freshnessSeconds,
      retentionUntil: new Date((input.now ?? new Date()).getTime() + config.retentionDays * 86_400_000),
      handoffDestination: 'INTERNAL_CRM',
    });
    const assignment = persisted.duplicate ? { assignedToId: null, reason: 'DUPLICATE' as const, ruleId: null } : await assignMetaLead(persisted.leadId);
    await markMetaWebhookReceipt({ receiptId: receipt.id, status: 'PROCESSED' });
    const canonicalProcessed = await markMetaSocialWebhookReceiptProcessed({
      receiptId: canonical.id,
      leaseToken: canonicalLease,
      actor: leaseOwner,
      now: input.now,
    });
    if (!canonicalProcessed.ok) {
      throw new Error(String(canonicalProcessed.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_COMPLETION_FAILED'));
    }
    await notifyMetaLeadAssignment({
      leadId: persisted.leadId,
      assignedToId: assignment.assignedToId,
      fullName: normalized.fullName,
      phoneMasked: normalized.phoneMasked,
      emailMasked: normalized.emailMasked,
      campaignId: raw.campaign_id,
      responseSlaAt: new Date((input.now ?? new Date()).getTime() + config.slaMinutes * 60_000),
    });
    return { receiptId: receipt.id, ...persisted, assignment, status: 'PROCESSED' as const };
  } catch (error) {
    const permanent = error instanceof MetaLeadPermanentProcessingError
      || (error instanceof MetaLeadFetchError && error.permanent);
    const safe = safeError(error);
    const failureCode = String(safe.code ?? 'META_LEAD_PROCESSING_ERROR')
      .toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 80);
    if (processingAttemptId) {
      const retrievalStatus = error instanceof MetaLeadFetchError
        ? error.retrievalStatus
        : permanent ? 'PERMANENT_FAILURE' : 'RETRYING';
      await markMetaLeadProcessingAttemptFailed({
        receiptId: canonical.id,
        retrievalStatus: retrievalStatus === 'FETCHING' || retrievalStatus === 'FETCHED' || retrievalStatus === 'PENDING'
          ? (permanent ? 'PERMANENT_FAILURE' : 'RETRYING')
          : retrievalStatus,
        error: { code: failureCode, category: permanent ? 'PERMANENT' : 'RETRYABLE', summary: safe.message },
        nextRetryAt: permanent ? null : (input.now ?? new Date()),
      }).catch(() => undefined);
    }
    await markMetaWebhookReceipt({ receiptId: receipt.id, status: 'FAILED', error }).catch(() => undefined);
    const canonicalFailureCode = /^[A-Z][A-Z0-9_]{2,79}$/.test(failureCode)
      ? failureCode
      : 'META_LEAD_PROCESSING_ERROR';
    await markMetaSocialWebhookReceiptFailed({
      receiptId: canonical.id,
      leaseToken: canonicalLease,
      failureCode: canonicalFailureCode,
      failureCategory: permanent ? 'PERMANENT' : 'RETRYABLE',
      failureSummary: safe.message,
      nextRetryAt: permanent ? null : (input.now ?? new Date()),
      actor: leaseOwner,
      now: input.now,
    }).catch(() => undefined);
    if (permanent) {
      await markMetaSocialWebhookReceiptDeadLettered({
        receiptId: canonical.id,
        failureCode: canonicalFailureCode,
        failureSummary: safe.message,
        actor: leaseOwner,
        now: input.now,
      }).catch(() => undefined);
    }
    if (error instanceof MetaLeadPermanentProcessingError) throw error;
    if (error instanceof MetaLeadFetchError && error.permanent) {
      throw new MetaLeadPermanentProcessingError(error.code, error.message);
    }
    const retryable = new Error(safe.message) as Error & Record<string, unknown>;
    Object.assign(retryable, safe);
    throw retryable;
  }
}

export async function runMetaLeadReceiptRecovery(input: {
  enqueue: (receipt: { id: string; leadgenId: string; pageId?: string; formId?: string; correlationId?: string }) => Promise<unknown>;
  limit?: number;
}) {
  const receipts = await listRecoverableMetaLeadReceipts(input.limit ?? 100);
  const results = [];
  for (const receipt of receipts) {
    if (!receipt.leadgenId) continue;
    try {
      results.push(await input.enqueue({ id: receipt.id, leadgenId: receipt.leadgenId, pageId: receipt.pageId ?? undefined, formId: receipt.formId ?? undefined, correlationId: receipt.correlationId }));
      await markMetaWebhookReceipt({ receiptId: receipt.id, status: 'QUEUED' });
    } catch (error) {
      await markMetaWebhookReceipt({ receiptId: receipt.id, status: 'FAILED', error });
    }
  }
  return { scanned: receipts.length, enqueued: results.length };
}

export async function runMetaLeadSlaAlerts() {
  const config = getMetaLeadConfig();
  const overdue = await runMetaLeadSlaScan(config.slaMinutes, 250);
  const notices = await Promise.all(overdue.map((lead) => notifyMetaLeadAssignment({
    leadId: lead.id,
    assignedToId: lead.assignedToId,
    fullName: lead.fullName,
    phoneMasked: lead.phoneMasked,
    emailMasked: lead.emailMasked,
    campaignId: lead.campaignId,
    responseSlaAt: lead.receivedAt,
  })));
  return { overdue: overdue.length, notified: notices.filter((item) => item.sent).length };
}

export async function runMetaLeadRetention() {
  const config = getMetaLeadConfig();
  return runMetaLeadRetentionCleanup({ rawRetentionDays: config.rawRetentionDays, limit: 1_000 });
}
