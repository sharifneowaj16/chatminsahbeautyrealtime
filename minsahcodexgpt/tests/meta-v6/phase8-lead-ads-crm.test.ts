import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { selectMetaLeadAssignee } from '../../lib/meta/leads/assign';
import { encryptMetaLeadPayload, decryptMetaLeadPayload } from '../../lib/meta/leads/crypto';
import { selectMetaLeadDuplicate } from '../../lib/meta/leads/deduplicate';
import { canTransitionMetaLead, validateMetaLeadTransition } from '../../lib/meta/leads/lifecycle';
import { normalizeMetaLeadEmail, normalizeMetaLeadFields, normalizeMetaLeadPhone } from '../../lib/meta/leads/normalize';
import { verifyMetaWebhookSignature } from '../../lib/meta/leads/signature';
import { parseMetaLeadWebhookPayload, verifyMetaWebhookChallenge } from '../../lib/meta/leads/verify';
import { META_JOB_NAMES, META_JOB_SCHEMA_VERSION, META_QUEUE_NAMES, validateMetaJobPayload } from '../../lib/jobs/job-types';

const APP_SECRET = 'phase8-app-secret';
const RAW = JSON.stringify({
  object: 'page',
  entry: [{ id: 'page-1', changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1', ad_id: 'ad-1', created_time: '2026-07-17T17:24:28Z' } }] }],
});

test('GET challenge validation is constant-time compatible and fail-closed', () => {
  assert.deepEqual(verifyMetaWebhookChallenge({ mode: 'subscribe', token: 'verify-me', challenge: '123', expectedToken: 'verify-me' }), { ok: true, challenge: '123' });
  assert.equal(verifyMetaWebhookChallenge({ mode: 'subscribe', token: 'wrong', challenge: '123', expectedToken: 'verify-me' }).ok, false);
  assert.equal(verifyMetaWebhookChallenge({ mode: 'subscribe', token: 'verify-me', challenge: '123', expectedToken: undefined }).ok, false);
});

test('X-Hub-Signature-256 accepts exact HMAC and rejects malformed or wrong values', () => {
  const signature = `sha256=${crypto.createHmac('sha256', APP_SECRET).update(RAW).digest('hex')}`;
  assert.equal(verifyMetaWebhookSignature({ rawBody: RAW, signatureHeader: signature, appSecret: APP_SECRET }).ok, true);
  assert.equal(verifyMetaWebhookSignature({ rawBody: RAW, signatureHeader: 'sha1=abc', appSecret: APP_SECRET }).ok, false);
  assert.equal(verifyMetaWebhookSignature({ rawBody: RAW, signatureHeader: `sha256=${'0'.repeat(64)}`, appSecret: APP_SECRET }).ok, false);
});

test('webhook parser validates page/form ownership and creates stable duplicate event key', () => {
  const first = parseMetaLeadWebhookPayload({ rawBody: RAW, expectedPageId: 'page-1', allowedFormIds: ['form-1'] });
  const second = parseMetaLeadWebhookPayload({ rawBody: RAW, expectedPageId: 'page-1', allowedFormIds: ['form-1'] });
  assert.equal(first.notifications.length, 1);
  assert.equal(first.notifications[0]?.eventKey, second.notifications[0]?.eventKey);
  assert.equal(first.notifications[0]?.leadgenId, 'lead-1');
  const rejected = parseMetaLeadWebhookPayload({ rawBody: RAW, expectedPageId: 'page-other', allowedFormIds: ['form-1'] });
  assert.equal(rejected.notifications.length, 0);
  assert.equal(rejected.rejected[0]?.code, 'PAGE_OWNERSHIP_MISMATCH');
});

test('webhook parser enforces payload limit and required leadgen structure', () => {
  assert.throws(() => parseMetaLeadWebhookPayload({ rawBody: RAW, maxBytes: 10 }), /PAYLOAD_TOO_LARGE/);
  const missing = JSON.stringify({ object: 'page', entry: [{ id: 'page-1', changes: [{ field: 'leadgen', value: { form_id: 'form-1' } }] }] });
  const result = parseMetaLeadWebhookPayload({ rawBody: missing, expectedPageId: 'page-1' });
  assert.equal(result.notifications.length, 0);
  assert.equal(result.rejected[0]?.code, 'LEADGEN_ID_REQUIRED');
});

test('Bangladesh phone and email normalization are deterministic', () => {
  assert.equal(normalizeMetaLeadPhone('01712-345678'), '+8801712345678');
  assert.equal(normalizeMetaLeadPhone('8801712345678'), '+8801712345678');
  assert.equal(normalizeMetaLeadEmail('  PERSON@Example.COM '), 'person@example.com');
  assert.equal(normalizeMetaLeadEmail('invalid'), undefined);
});

test('field mapping preserves custom fields while extracting normalized CRM identity', () => {
  const { fields, normalized } = normalizeMetaLeadFields({
    id: 'lead-1',
    field_data: [
      { name: 'full_name', values: ['Minsah Customer'] },
      { name: 'phone_number', values: ['01712345678'] },
      { name: 'email', values: ['customer@example.com'] },
      { name: 'city', values: ['Dhaka'] },
      { name: 'product_interest', values: ['Serum'] },
      { name: 'preferred_time', values: ['Evening'] },
    ],
  });
  assert.equal(fields.length, 6);
  assert.equal(normalized.phone, '+8801712345678');
  assert.equal(normalized.email, 'customer@example.com');
  assert.equal(normalized.city, 'Dhaka');
  assert.deepEqual(normalized.customFields.preferred_time, ['Evening']);
  assert.equal(normalized.phoneMasked?.endsWith('5678'), true);
  assert.equal(normalized.emailMasked?.includes('customer@example.com'), false);
});

test('dedupe priority is leadgenId, phone, then email', () => {
  const candidates = [
    { id: 'email', leadgenId: 'lead-old-email', normalizedPhoneHash: null, normalizedEmailHash: 'e' },
    { id: 'phone', leadgenId: 'lead-old-phone', normalizedPhoneHash: 'p', normalizedEmailHash: null },
    { id: 'same', leadgenId: 'lead-1', normalizedPhoneHash: null, normalizedEmailHash: null },
  ];
  assert.equal(selectMetaLeadDuplicate({ leadgenId: 'lead-1', phoneHash: 'p', emailHash: 'e', candidates })?.reason, 'LEADGEN_ID');
  assert.equal(selectMetaLeadDuplicate({ leadgenId: 'lead-new', phoneHash: 'p', emailHash: 'e', candidates })?.reason, 'PHONE');
  assert.equal(selectMetaLeadDuplicate({ leadgenId: 'lead-new', emailHash: 'e', candidates })?.reason, 'EMAIL');
});

test('assignment respects matching rule, agent capacity and round-robin timestamp', () => {
  const result = selectMetaLeadAssignee({
    campaignId: 'campaign-1', formId: 'form-1', normalized: { city: 'Dhaka', customFields: {} },
    rules: [{ id: 'rule-1', priority: 100, campaignId: 'campaign-1', formId: 'form-1', city: 'Dhaka', assignedToId: 'agent-2' }],
    agents: [
      { adminId: 'agent-1', maxOpenLeads: 10, openLeads: 1, lastAssignedAt: new Date('2026-07-17T10:00:00Z') },
      { adminId: 'agent-2', maxOpenLeads: 10, openLeads: 2, lastAssignedAt: new Date('2026-07-17T12:00:00Z') },
    ],
  });
  assert.equal(result.assignedToId, 'agent-2');
  assert.equal(result.reason, 'RULE_ASSIGNEE');
  const capped = selectMetaLeadAssignee({ campaignId: 'campaign-1', normalized: { customFields: {} }, rules: [], agents: [{ adminId: 'a', maxOpenLeads: 1, openLeads: 1 }] });
  assert.equal(capped.assignedToId, null);
});

test('CRM lifecycle requires valid transition and explicit order for conversion', () => {
  assert.equal(canTransitionMetaLead('NEW', 'CONTACTED'), true);
  assert.equal(canTransitionMetaLead('CONVERTED', 'LOST'), false);
  assert.throws(() => validateMetaLeadTransition({ from: 'QUALIFIED', to: 'CONVERTED' }), /ORDER_REQUIRED/);
  assert.equal(validateMetaLeadTransition({ from: 'QUALIFIED', to: 'CONVERTED', convertedOrderId: 'order-1' }), true);
});

test('raw lead payload encryption uses authenticated AES-GCM and does not retain plaintext', () => {
  const key = 'phase8-data-key';
  const payload = { email: 'private@example.com', phone: '+8801712345678' };
  const encrypted = encryptMetaLeadPayload(payload, key);
  assert.equal(encrypted.includes('private@example.com'), false);
  assert.deepEqual(decryptMetaLeadPayload(encrypted, key), payload);
  assert.throws(() => decryptMetaLeadPayload(encrypted, 'wrong-key'));
});

test('lead queue contract requires receipt ID and rejects PII/raw fields', () => {
  const valid = validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.LEADS,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payload: { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey: 'lead-fetch:1', requestedAt: new Date().toISOString(), type: 'lead_fetch', receiptId: 'receipt-1', leadgenId: 'lead-1' },
  });
  assert.equal(valid.valid, true);
  const pii = validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.LEADS,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payload: { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey: 'lead-fetch:2', requestedAt: new Date().toISOString(), type: 'lead_fetch', receiptId: 'receipt-2', leadgenId: 'lead-2', email: 'raw@example.com' },
  });
  assert.equal(pii.valid, false);
  assert.equal(pii.issues.some((issue) => issue.code === 'SECRET_IN_JOB_PAYLOAD'), true);
});

test('schema and forward migration include typed webhook, CRM, dedupe and assignment models', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260717060000_meta_v6_phase8_lead_crm/migration.sql', 'utf8');
  for (const token of ['enum MetaLeadStatus','enum MetaWebhookProcessingStatus','model MetaWebhookReceipt','model MetaLeadDuplicate','model MetaLeadContactAttempt','model MetaLeadAssignmentRule','model MetaLeadAgentProfile']) {
    assert.match(schema, new RegExp(token));
  }
  assert.match(migration, /Legacy raw JSON may contain PII/);
  assert.match(migration, /CREATE UNIQUE INDEX "MetaWebhookReceipt_eventKey_key"/);
  assert.match(migration, /CREATE UNIQUE INDEX "MetaLeadDuplicate_sourceLeadgenId_key"/);
  const productModel = schema.match(/model Product \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.doesNotMatch(productModel, /assignedMetaLeads|metaLeadAgentProfile/);
});

test('canonical route is DB-first, signature-protected, bounded and always acknowledges durable receipts', () => {
  const route = fs.readFileSync('app/api/webhooks/meta/route.ts', 'utf8');
  assert.match(route, /verifyMetaWebhookSignature/);
  assert.match(route, /META_LEAD_WEBHOOK_MAX_BYTES/);
  assert.ok(route.indexOf('const stored = await createVerifiedMetaWebhookReceipt') < route.indexOf('await enqueueMetaLeadFetchJob'));
  assert.match(route, /status: 200/);
  assert.match(route, /recovery job will retry enqueueing/);
});

test('admin APIs expose masked lead fields and audited lifecycle operations, not raw payloads', () => {
  const repo = fs.readFileSync('lib/meta/leads/repository.ts', 'utf8');
  const route = fs.readFileSync('app/api/admin/meta/leads/[leadId]/route.ts', 'utf8');
  assert.match(repo, /"phoneMasked"/);
  assert.match(repo, /"emailMasked"/);
  assert.doesNotMatch(repo.match(/export async function listMetaLeadsSafe[\s\S]*?export async function getMetaLeadSafe/)?.[0] ?? '', /normalizedData|rawPayloadEncrypted/);
  assert.doesNotMatch(repo, /JSON\.stringify\(input\.normalized\)/);
  assert.match(repo, /safeNormalizedMetadata/);
  assert.match(route, /requireSuperAdmin/);
  assert.match(route, /convertedOrderId/);
  assert.match(route, /contactAttempt/);
});
