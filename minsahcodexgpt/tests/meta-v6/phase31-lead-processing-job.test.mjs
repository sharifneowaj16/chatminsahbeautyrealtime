import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMetaLeadProcessingDedupeKey,
  classifyMetaLeadJobFailure,
  createMetaLeadProcessingJobEnvelope,
  enqueueMetaLeadProcessingJob,
  executeMetaLeadProcessingJob,
} from '../../lib/meta-platform/queue/lead-processing-job.ts';
import { createMetaSocialJobEnvelope } from '../../lib/meta-platform/queue/social-job-envelope.ts';
import { createMetaSocialQueueClaim } from '../../lib/meta-platform/queue/social-queue-adapter.ts';

const NOW = new Date('2026-07-25T17:45:00.000Z');

function leadEnvelope(overrides = {}) {
  return createMetaLeadProcessingJobEnvelope({
    receiptId: 'receipt-1',
    providerLeadId: 'lead-1',
    pageId: 'page-1',
    formId: 'form-1',
    correlationId: 'meta-webhook:1234567890abcdef',
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    scheduledAt: NOW,
    ...overrides,
  });
}

function claim(envelope = leadEnvelope(), overrides = {}) {
  return createMetaSocialQueueClaim({
    queueName: 'meta-leads',
    jobName: 'lead-fetch',
    jobId: 'job-1',
    auditId: 'audit-1',
    deliveryAttempt: 1,
    claimedAt: NOW,
    envelope,
    ...overrides,
  });
}

test('Lead job dedupe key is deterministic, namespaced and scoped by receipt/provider ID', () => {
  const first = buildMetaLeadProcessingDedupeKey({ receiptId: 'receipt-1', providerLeadId: 'lead-1' });
  const second = buildMetaLeadProcessingDedupeKey({ receiptId: 'receipt-1', providerLeadId: 'lead-1' });
  const replay = buildMetaLeadProcessingDedupeKey({ receiptId: 'receipt-2', providerLeadId: 'lead-1' });
  assert.equal(first, second);
  assert.match(first, /^social:process-meta-lead:[a-f0-9]{64}$/);
  assert.notEqual(first, replay);
});

test('Lead processing envelope contains only durable receipt and provider identity references', () => {
  const envelope = leadEnvelope();
  assert.equal(envelope.jobType, 'PROCESS_META_LEAD');
  assert.equal(envelope.receiptId, 'receipt-1');
  assert.deepEqual(envelope.payloadRef, {
    kind: 'WEBHOOK_RECEIPT',
    id: 'receipt-1',
    providerObjectId: 'lead-1',
    scope: { pageId: 'page-1', formId: 'form-1' },
  });
  const serialized = JSON.stringify(envelope).toLowerCase();
  assert.doesNotMatch(serialized, /access.?token|email|phone|field_data|rawpayload/);
});

test('Lead enqueue helper sends the canonical envelope through the shared adapter', async () => {
  const seen = [];
  const result = await enqueueMetaLeadProcessingJob({
    adapter: {
      async enqueue(envelope) {
        seen.push(envelope);
        return {
          outcome: 'ENQUEUED', accepted: true, deduplicated: false,
          auditId: 'audit-1', jobId: 'job-1', status: 'QUEUED', envelope,
        };
      },
    },
    receiptId: 'receipt-1',
    providerLeadId: 'lead-1',
    correlationId: 'meta-webhook:1234567890abcdef',
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    scheduledAt: NOW,
  });
  assert.equal(seen.length, 1);
  assert.equal(result.result.outcome, 'ENQUEUED');
  assert.equal(result.envelope, seen[0]);
});

test('Lead worker claim calls receipt processor with canonical durable identifiers and ACKs', async () => {
  const calls = [];
  const result = await executeMetaLeadProcessingJob({
    claim: claim(),
    now: NOW,
    processReceipt: async (input) => {
      calls.push(input);
      return { leadId: 'normalized-lead-1', duplicate: false, status: 'PROCESSED' };
    },
  });
  assert.equal(result.outcome, 'ACK');
  assert.deepEqual(calls, [{
    receiptId: 'receipt-1', leadgenId: 'lead-1', pageId: 'page-1', formId: 'form-1', now: NOW,
  }]);
  assert.equal(result.queueResult.action, 'ACK');
  assert.equal(result.queueResult.resultRef?.id, 'receipt-1');
});

test('Duplicate-safe Lead completion remains an ACK rather than a retry', async () => {
  const result = await executeMetaLeadProcessingJob({
    claim: claim(),
    processReceipt: async () => ({ deduplicated: true, status: 'PROCESSED' }),
  });
  assert.equal(result.outcome, 'ACK');
  assert.equal(result.value.deduplicated, true);
});

test('Wrong canonical job type is permanently rejected before processor execution', async () => {
  let called = false;
  const envelope = createMetaSocialJobEnvelope({
    jobType: 'PROCESS_INSTAGRAM_INBOUND',
    receiptId: 'receipt-1',
    correlationId: 'meta-webhook:1234567890abcdef',
    scheduledAt: NOW,
    dedupeKey: 'social:process-instagram-inbound:receipt-1',
    payloadRef: { kind: 'WEBHOOK_RECEIPT', id: 'receipt-1' },
    observability: { component: 'test-worker', operation: 'process-instagram', platform: 'INSTAGRAM' },
  });
  const result = await executeMetaLeadProcessingJob({
    claim: claim(envelope),
    processReceipt: async () => { called = true; },
  });
  assert.equal(called, false);
  assert.equal(result.outcome, 'NACK');
  assert.equal(result.queueResult.classification, 'PERMANENT');
  assert.equal(result.queueResult.retryable, false);
});

test('Provider rate limit produces retryable NACK and preserves Retry-After', async () => {
  const result = await executeMetaLeadProcessingJob({
    claim: claim(),
    processReceipt: async () => {
      throw Object.assign(new Error('provider throttled'), { code: '613', status: 429, retryAfterMs: 120_000 });
    },
  });
  assert.equal(result.outcome, 'NACK');
  assert.equal(result.queueResult.classification, 'RATE_LIMIT');
  assert.equal(result.queueResult.retryable, true);
  assert.equal(result.queueResult.retryAfterMs, 120_000);
});

test('Network failure produces retryable transient NACK', async () => {
  const result = await executeMetaLeadProcessingJob({
    claim: claim(),
    processReceipt: async () => {
      throw Object.assign(new Error('connection reset'), { code: 'ECONNRESET', retryable: true });
    },
  });
  assert.equal(result.outcome, 'NACK');
  assert.equal(result.queueResult.classification, 'TRANSIENT');
  assert.equal(result.queueResult.retryable, true);
});

test('Expired or missing access is classified as AUTH and is not blindly retried', () => {
  const token = classifyMetaLeadJobFailure(Object.assign(new Error('token expired'), {
    code: 'META_LEAD_TOKEN_ERROR', httpStatus: 400,
  }));
  const permission = classifyMetaLeadJobFailure(Object.assign(new Error('forbidden'), {
    code: 'META_PAGE_PERMISSION_DENIED', status: 403,
  }));
  assert.equal(token.classification, 'AUTH');
  assert.equal(permission.classification, 'AUTH');
});

test('Page/form ownership mismatch is policy-blocked and permanent', () => {
  const decision = classifyMetaLeadJobFailure(Object.assign(new Error('wrong form'), {
    name: 'MetaLeadPermanentProcessingError', code: 'META_LEAD_FORM_OWNERSHIP_MISMATCH',
  }));
  assert.deepEqual(decision, {
    classification: 'POLICY_BLOCKED',
    safeReasonCode: 'META_LEAD_FORM_OWNERSHIP_MISMATCH',
  });
});

test('Unavailable Lead is a permanent failure with a safe reason code', () => {
  const decision = classifyMetaLeadJobFailure(Object.assign(new Error('contains user@example.com'), {
    name: 'MetaLeadPermanentProcessingError', code: 'META_LEAD_NOT_FOUND', permanent: true,
  }));
  assert.equal(decision.classification, 'PERMANENT');
  assert.equal(decision.safeReasonCode, 'META_LEAD_NOT_FOUND');
  assert.doesNotMatch(JSON.stringify(decision), /user@example\.com/);
});

test('Envelope rejects invalid identifiers before queueing', () => {
  assert.throws(() => leadEnvelope({ providerLeadId: 'lead with spaces' }), /META_LEAD_JOB_PROVIDER_ID_INVALID/);
  assert.throws(() => leadEnvelope({ receiptId: '' }), /META_LEAD_JOB_RECEIPT_ID_INVALID/);
});
