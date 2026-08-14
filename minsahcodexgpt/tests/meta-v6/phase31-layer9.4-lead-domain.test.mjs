import assert from 'node:assert/strict';
import test from 'node:test';

import {
  META_LEAD_FETCH_FIELDS,
  classifyMetaLeadFetchError,
  fetchMetaLeadWithClient,
} from '../../lib/meta-platform/domains/leads/fetch-contract.ts';
import { evaluateMetaLeadFormOwnership } from '../../lib/meta-platform/domains/leads/ownership-policy.ts';
import {
  classifyMetaLeadProcessingFailure,
  executeMetaLeadCrmHandoff,
} from '../../lib/meta-platform/domains/leads/process-lead.ts';
import {
  getMetaLeadCutoverStatus,
  executeMetaLeadCutover,
} from '../../lib/meta-platform/domains/leads/cutover.ts';
import {
  assertMetaLeadSafeProjection,
  mapMetaLeadProviderPayload,
  redactMetaLeadSensitiveText,
  toMetaLeadSafeProjection,
} from '../../lib/meta-platform/domains/leads/index.ts';
import { resolveMetaTestLeadPolicy } from '../../lib/meta-platform/domains/leads/test-lead.ts';
import { InMemoryMetaLeadStorageRepository } from '../../lib/meta-platform/repositories/leads.ts';
import { InMemoryMetaSocialWebhookReceiptStore } from '../../lib/meta-platform/repositories/webhook-receipts.ts';

const NOW = new Date('2026-07-27T21:30:00.000Z');
function ids(prefix) { let value = 0; return () => `${prefix}-${++value}`; }

function receiptInput(overrides = {}) {
  return {
    platform: 'LEAD_ADS',
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    providerDeliveryId: 'delivery-lead-9.4',
    providerEventKey: 'leadgen:page-1:form-1:lead-1',
    payloadDigest: 'a'.repeat(64),
    correlationId: 'meta-webhook:layer9.4',
    receivedAt: NOW,
    safeMetadata: {
      objectType: 'page', eventType: 'LEADGEN', pageId: 'page-1', formId: 'form-1', leadgenId: 'lead-1',
    },
    ...overrides,
  };
}

test('9.4 Leadgen receipt is durable, canonical and delivery-idempotent', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore({ createId: ids('receipt') });
  const first = await store.createOrGet(receiptInput());
  const duplicate = await store.createOrGet(receiptInput({ receivedAt: new Date(NOW.getTime() + 1_000) }));
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.receipt.id, first.receipt.id);
  assert.equal(duplicate.receipt.duplicateCount, 1);
  assert.equal(store.snapshot().length, 1);
  assert.deepEqual(first.receipt.safeMetadata, receiptInput().safeMetadata);
});

test('9.4 full Lead fetch requests the complete field contract and validates freshness', async () => {
  const calls = [];
  const result = await fetchMetaLeadWithClient({
    leadgenId: 'lead-1',
    now: NOW,
    maxAgeSeconds: 86_400,
    client: {
      async get(path, params) {
        calls.push({ path, params });
        return {
          id: 'lead-1', created_time: '2026-07-27T21:29:00.000Z', form_id: 'form-1', is_test_lead: false,
          field_data: [{ name: 'email', values: ['private@example.com'] }],
        };
      },
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/lead-1');
  assert.deepEqual(calls[0].params, { fields: META_LEAD_FETCH_FIELDS.join(',') });
  assert.equal(result.payload.id, 'lead-1');
  assert.equal(result.freshnessSeconds, 60);
  assert.equal(META_LEAD_FETCH_FIELDS.includes('is_test_lead'), true);
});

test('9.4 duplicate provider Lead creates one normalized Lead and one CRM handoff', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: ids('lead') });
  const persist = (receiptId) => {
    repository.beginAttempt({
      receiptId, providerLeadId: 'provider-lead-1', environment: 'PRODUCTION', connectionKey: 'primary',
      pageId: 'page-1', formId: 'form-1',
    });
    repository.markFetching(receiptId);
    return repository.persist({
      receiptId, providerLeadId: 'provider-lead-1', environment: 'PRODUCTION', connectionKey: 'primary',
      pageId: 'page-1', formId: 'form-1', phoneFingerprint: 'phone-fingerprint', emailFingerprint: 'email-fingerprint',
    });
  };
  const first = persist('receipt-1');
  const replay = persist('receipt-2');
  assert.equal(replay.lead.id, first.lead.id);
  assert.equal(replay.duplicateReason, 'LEADGEN_ID');
  assert.equal(repository.snapshot().leads.length, 1);
  assert.equal(repository.snapshot().handoffs.length, 1);
});

test('9.4 missing or mismatched form mapping is policy-blocked before CRM handoff', () => {
  const missing = evaluateMetaLeadFormOwnership({
    notificationFormId: undefined,
    providerFormId: undefined,
    allowedFormIds: new Set(['form-allowed']),
  });
  assert.deepEqual(missing, {
    ok: false,
    code: 'META_LEAD_FORM_OWNERSHIP_MISMATCH',
    safeMessage: 'Retrieved lead form is not in the configured allowlist.',
  });
  const mismatch = evaluateMetaLeadFormOwnership({
    notificationFormId: 'form-notification',
    providerFormId: 'form-provider',
    allowedFormIds: new Set(['form-provider']),
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.code, 'META_LEAD_RECEIPT_FORM_MISMATCH');
});

test('9.4 expired/missing access is safe, retry-aware and never leaks the token', () => {
  const missing = classifyMetaLeadFetchError(Object.assign(new Error('token EA012345678901234567890 expired'), {
    name: 'MetaGraphConnectionError', code: '190', httpStatus: 400, traceId: 'trace-1',
  }));
  assert.equal(missing.code, 'META_LEAD_TOKEN_ERROR');
  assert.equal(missing.retrievalStatus, 'TOKEN_ERROR');
  assert.equal(missing.permanent, false);
  const expired = classifyMetaLeadFetchError(Object.assign(new Error('not found'), {
    name: 'MetaGraphConnectionError', code: '100', httpStatus: 404,
  }));
  assert.equal(expired.code, 'META_LEAD_NOT_FOUND');
  assert.equal(expired.retrievalStatus, 'NOT_FOUND');
  assert.equal(expired.permanent, true);
  assert.doesNotMatch(expired.message, /EA012345678901234567890/);
});

test('9.4 CRM handoff records one successful assignment target', async () => {
  let completed;
  let runs = 0;
  const result = await executeMetaLeadCrmHandoff({
    handoffId: 'handoff-1',
    leadId: 'lead-1',
    claim: async () => ({ id: 'handoff-1', leadId: 'lead-1', status: 'PROCESSING', attemptCount: 1 }),
    run: async () => { runs += 1; return { assignedToId: 'admin-1' }; },
    complete: async (value) => { completed = value; },
    fail: async () => assert.fail('successful handoff must not fail'),
  });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(runs, 1);
  assert.deepEqual(completed, { handoffId: 'handoff-1', targetType: 'META_LEAD_ASSIGNMENT', targetId: 'admin-1' });
});

test('9.4 CRM retry is replay-safe and transient failure is recorded before retry', async () => {
  let runCount = 0;
  const replay = await executeMetaLeadCrmHandoff({
    handoffId: 'handoff-completed', leadId: 'lead-1',
    claim: async () => ({ id: 'handoff-completed', leadId: 'lead-1', status: 'COMPLETED', attemptCount: 1 }),
    run: async () => { runCount += 1; }, complete: async () => undefined, fail: async () => undefined,
  });
  assert.equal(replay.status, 'ALREADY_COMPLETED');
  assert.equal(runCount, 0);

  let failureRecord;
  await assert.rejects(executeMetaLeadCrmHandoff({
    handoffId: 'handoff-retry', leadId: 'lead-2',
    claim: async () => ({ id: 'handoff-retry', leadId: 'lead-2', status: 'PROCESSING', attemptCount: 1 }),
    run: async () => { throw Object.assign(new Error('temporary failure for private@example.com'), { code: 'CRM_TIMEOUT' }); },
    complete: async () => assert.fail('failed handoff must not complete'),
    fail: async (value) => { failureRecord = value; },
  }), /temporary failure/);
  assert.equal(failureRecord.terminal, false);
  assert.equal(failureRecord.failure.classification, 'TRANSIENT');
  assert.doesNotMatch(failureRecord.failure.safeSummary, /private@example\.com/);
});

test('9.4 provider Test Lead is isolated from CRM, assignment and notifications', () => {
  const policy = resolveMetaTestLeadPolicy({ providerMarker: true, source: 'PROVIDER_MARKER' });
  assert.deepEqual(policy, {
    isTestLead: true,
    isolateFromCrm: true,
    suppressAssignment: true,
    suppressNotifications: true,
    cleanupAfterDays: 7,
    reason: 'PROVIDER_TEST_LEAD',
  });
});

test('9.4 Lead logs and admin-safe projections redact PII, tokens and raw custom values', () => {
  const record = mapMetaLeadProviderPayload({
    id: 'lead-safe', form_id: 'form-1',
    field_data: [
      { name: 'full_name', values: ['Private Person'] },
      { name: 'phone', values: ['+8801712345678'] },
      { name: 'email', values: ['private@example.com'] },
      { name: 'notes', values: ['access_token=EA012345678901234567890'] },
    ],
  });
  const projection = toMetaLeadSafeProjection(record);
  assert.doesNotThrow(() => assertMetaLeadSafeProjection(projection));
  const serialized = JSON.stringify(projection);
  assert.doesNotMatch(serialized, /private@example\.com|8801712345678|EA012345678901234567890/);
  const safe = redactMetaLeadSensitiveText('private@example.com +8801712345678 access_token=EA012345678901234567890');
  assert.doesNotMatch(safe, /private@example\.com|8801712345678|EA012345678901234567890/);
  const classified = classifyMetaLeadProcessingFailure({ code: 'CRM_TIMEOUT', message: safe });
  assert.equal(classified.retryable, true);
});

test('9.4 feature-flag rollback returns Lead authority to legacy without platform side effects', async () => {
  const source = {
    META_PLATFORM_LEADS: 'false',
    META_PLATFORM_SOCIAL_WEBHOOKS: 'false',
    META_PHASE31_LEAD_RUNTIME: 'LEGACY_ROLLBACK',
  };
  const status = getMetaLeadCutoverStatus(source);
  assert.equal(status.mode, 'LEGACY_ROLLBACK');
  assert.equal(status.authority, 'LEGACY');
  let legacyRuns = 0;
  let platformRuns = 0;
  const execution = await executeMetaLeadCutover({
    source,
    runLegacy: async () => { legacyRuns += 1; return { value: 'legacy-result' }; },
    runPlatform: async () => { platformRuns += 1; return 'platform-result'; },
  });
  assert.equal(execution.value, 'legacy-result');
  assert.equal(legacyRuns, 1);
  assert.equal(platformRuns, 0);
});
