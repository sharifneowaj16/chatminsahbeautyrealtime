import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryMetaLeadStorageRepository,
  META_LEAD_FINGERPRINT_VERSION,
  buildMetaLeadHandoffIdempotencyKey,
  fingerprintMetaLeadIdentity,
  sanitizeMetaLeadAttribution,
  sanitizeMetaLeadFailure,
} from '../../lib/meta-platform/repositories/leads.ts';

function idFactory(prefix) {
  let count = 0;
  return () => `${prefix}-${++count}`;
}

function begin(repository, receiptId = 'receipt-1', providerLeadId = 'lead-1', overrides = {}) {
  return repository.beginAttempt({
    receiptId,
    providerLeadId,
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    pageId: 'page-1',
    formId: 'form-1',
    pageIdentityReferenceId: 'identity-page-1',
    formIdentityReferenceId: 'identity-form-1',
    ...overrides,
  });
}

function persist(repository, receiptId = 'receipt-1', providerLeadId = 'lead-1', overrides = {}) {
  return repository.persist({
    receiptId,
    providerLeadId,
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    pageId: 'page-1',
    formId: 'form-1',
    pageIdentityReferenceId: 'identity-page-1',
    formIdentityReferenceId: 'identity-form-1',
    phoneFingerprint: 'phone-fingerprint-1',
    emailFingerprint: 'email-fingerprint-1',
    ...overrides,
  });
}

test('keyed Lead fingerprints are deterministic, scoped and versioned', () => {
  const base = { normalizedValue: '+8801712345678', secret: 'test-secret', environment: 'PRODUCTION', connectionKey: 'primary', kind: 'PHONE' };
  const first = fingerprintMetaLeadIdentity(base);
  const second = fingerprintMetaLeadIdentity(base);
  const staging = fingerprintMetaLeadIdentity({ ...base, environment: 'STAGING' });
  const otherConnection = fingerprintMetaLeadIdentity({ ...base, connectionKey: 'secondary' });
  assert.equal(first, second);
  assert.notEqual(first, staging);
  assert.notEqual(first, otherConnection);
  assert.equal(first?.length, 64);
  assert.equal(META_LEAD_FINGERPRINT_VERSION, 'hmac-sha256:v1');
});

test('safe Lead attribution excludes secret and PII-bearing fields', () => {
  const safe = sanitizeMetaLeadAttribution({
    pageId: 'page-1', formId: 'form-1', campaignName: 'Campaign', isOrganic: false,
    accessToken: 'secret', email: 'customer@example.com', phone: '+8801712345678', rawPayload: { field_data: [] },
  });
  assert.deepEqual(safe, { pageId: 'page-1', formId: 'form-1', campaignName: 'Campaign', isOrganic: false });
});

test('failure summaries redact tokens, URLs, email and phone', () => {
  const safe = sanitizeMetaLeadFailure({
    code: 'meta lead failed', category: 'retryable',
    summary: 'EAabcdefghijklmnopqrstuvwxyz123456 https://graph.example/x customer@example.com +8801712345678',
  });
  assert.equal(safe.code, 'META_LEAD_FAILED');
  assert.equal(safe.category, 'RETRYABLE');
  assert.doesNotMatch(safe.summary, /customer@example|8801712345678|graph\.example|EAabcdef/);
});

test('one canonical receipt creates one durable processing attempt', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  const first = begin(repository);
  const second = begin(repository);
  assert.equal(first.id, second.id);
  assert.equal(repository.snapshot().attempts.length, 1);
});

test('receipt attempt rejects provider or scope mutation', () => {
  const repository = new InMemoryMetaLeadStorageRepository();
  begin(repository);
  assert.throws(() => begin(repository, 'receipt-1', 'lead-2'), (error) => error?.code === 'META_LEAD_ATTEMPT_RECEIPT_CONFLICT');
  assert.throws(() => begin(repository, 'receipt-1', 'lead-1', { connectionKey: 'secondary' }), (error) => error?.code === 'META_LEAD_ATTEMPT_RECEIPT_CONFLICT');
});

test('retrieval state is durable across fetching and retryable failure', () => {
  const repository = new InMemoryMetaLeadStorageRepository();
  begin(repository);
  const fetching = repository.markFetching('receipt-1');
  assert.equal(fetching.retrievalStatus, 'FETCHING');
  assert.equal(fetching.retrievalAttempt, 1);
  const failed = repository.markFailure('receipt-1', 'RETRYING', { code: 'META_GRAPH_DOWN', category: 'RETRYABLE', message: 'temporary' });
  assert.equal(failed.retrievalStatus, 'RETRYING');
  assert.equal(repository.markFetching('receipt-1').retrievalAttempt, 2);
});

test('first provider Lead creates one business Lead, receipt link and handoff', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  begin(repository); repository.markFetching('receipt-1');
  const result = persist(repository);
  assert.equal(result.created, true);
  assert.equal(result.duplicate, false);
  assert.equal(repository.getReceiptLead('receipt-1'), result.lead.id);
  assert.equal(repository.getAttempt('receipt-1')?.retrievalStatus, 'FETCHED');
  assert.equal(result.handoff.idempotencyKey, buildMetaLeadHandoffIdempotencyKey(result.lead.id, 'INTERNAL_CRM'));
});

test('same provider Lead on replay resolves one Lead and one handoff', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  begin(repository, 'receipt-1', 'lead-1'); repository.markFetching('receipt-1');
  const first = persist(repository, 'receipt-1', 'lead-1');
  begin(repository, 'receipt-replay', 'lead-1'); repository.markFetching('receipt-replay');
  const replay = persist(repository, 'receipt-replay', 'lead-1', { phoneFingerprint: 'different-delivery-same-lead' });
  assert.equal(replay.lead.id, first.lead.id);
  assert.equal(replay.duplicateReason, 'LEADGEN_ID');
  assert.equal(repository.snapshot().leads.length, 1);
  assert.equal(repository.snapshot().handoffs.length, 1);
});

test('different provider Lead with same phone resolves canonical Lead', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  begin(repository, 'receipt-1', 'lead-1'); repository.markFetching('receipt-1');
  const first = persist(repository, 'receipt-1', 'lead-1');
  begin(repository, 'receipt-2', 'lead-2'); repository.markFetching('receipt-2');
  const second = persist(repository, 'receipt-2', 'lead-2', { emailFingerprint: 'email-2' });
  assert.equal(second.lead.id, first.lead.id);
  assert.equal(second.duplicateReason, 'PHONE');
  assert.equal(repository.snapshot().leads.length, 1);
});

test('different provider Lead with same email resolves canonical Lead', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  begin(repository, 'receipt-1', 'lead-1'); repository.markFetching('receipt-1');
  const first = persist(repository, 'receipt-1', 'lead-1');
  begin(repository, 'receipt-2', 'lead-2'); repository.markFetching('receipt-2');
  const second = persist(repository, 'receipt-2', 'lead-2', { phoneFingerprint: 'phone-2' });
  assert.equal(second.lead.id, first.lead.id);
  assert.equal(second.duplicateReason, 'EMAIL');
});

test('same phone in another connection does not collide because fingerprints are scoped', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  begin(repository, 'receipt-1', 'lead-1'); repository.markFetching('receipt-1');
  const first = persist(repository, 'receipt-1', 'lead-1', { phoneFingerprint: 'primary-phone' });
  begin(repository, 'receipt-2', 'lead-2', { connectionKey: 'secondary' }); repository.markFetching('receipt-2');
  const second = persist(repository, 'receipt-2', 'lead-2', { connectionKey: 'secondary', phoneFingerprint: 'secondary-phone', emailFingerprint: null });
  assert.notEqual(second.lead.id, first.lead.id);
  assert.equal(repository.snapshot().leads.length, 2);
});

test('completed receipt persistence is idempotent and keeps the same business Lead', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: idFactory('id') });
  begin(repository); repository.markFetching('receipt-1');
  const first = persist(repository);
  const second = persist(repository, 'receipt-1', 'lead-1', { phoneFingerprint: 'unrelated-phone', emailFingerprint: 'unrelated-email' });
  assert.equal(second.lead.id, first.lead.id);
  assert.equal(repository.getReceiptLead('receipt-1'), first.lead.id);
  assert.equal(repository.snapshot().leads.length, 1);
});

test('test Lead marker remains tri-state and is copied to the attempt', () => {
  const repository = new InMemoryMetaLeadStorageRepository();
  begin(repository); repository.markFetching('receipt-1');
  const result = persist(repository, 'receipt-1', 'lead-1', { isTestLead: true });
  assert.equal(result.lead.isTestLead, true);
  assert.equal(repository.getAttempt('receipt-1')?.isTestLead, true);
});
