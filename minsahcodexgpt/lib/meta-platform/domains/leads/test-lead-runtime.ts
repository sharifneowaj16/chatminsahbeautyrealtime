import 'server-only';
import crypto from 'node:crypto';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import { createMetaGraphClient } from '@/lib/meta/connection/client';
import { getMetaLeadConfig } from '@/lib/meta/leads/config';
import { createVerifiedMetaWebhookReceipt, markMetaWebhookReceipt } from '@/lib/meta/leads/receipt';
import type { MetaLeadNotification } from '@/lib/meta/leads/types';
import { enqueueMetaLeadProcessingJob, type MetaSocialQueueAdapter } from '@/lib/meta-platform/queue';
import { cleanupMetaTestLeadsStorage } from '@/lib/meta-platform/repositories';
import { markMetaSocialWebhookReceiptQueued } from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { createMetaTestLeadEvidence, createMetaTestLeadFixture } from './test-lead';

export async function createMetaTestLeadProduction(input: {
  formId: string;
  pageId?: string;
  adapter: MetaSocialQueueAdapter;
  fetchImpl?: typeof fetch;
  now?: Date;
}) {
  const config = getMetaLeadConfig();
  const pageId = input.pageId ?? config.pageId;
  if (!pageId) throw new Error('META_TEST_LEAD_PAGE_ID_REQUIRED');
  if (!config.pageAccessToken) throw new Error('META_PAGE_ACCESS_TOKEN_REQUIRED');
  if (config.allowedFormIds.size > 0 && !config.allowedFormIds.has(input.formId)) throw new Error('META_TEST_LEAD_FORM_NOT_ALLOWLISTED');
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const fixture = createMetaTestLeadFixture(nonce);
  const client = createMetaGraphClient({
    accessToken: config.pageAccessToken,
    appSecret: config.appSecret,
    graphApiVersion: config.graphApiVersion,
    fetchImpl: input.fetchImpl,
    timeoutMs: 15_000,
  });
  const response = await client.post<{ id?: string }>(`/${encodeURIComponent(input.formId)}/test_leads`, {
    field_data: [
      { name: 'full_name', values: [fixture.fullName] },
      { name: 'email', values: [fixture.email] },
      { name: 'phone_number', values: [fixture.phone] },
      { name: 'product_interest', values: [fixture.productInterest] },
    ],
  });
  const providerLeadId = typeof response.id === 'string' ? response.id.trim() : '';
  if (!providerLeadId) throw new Error('META_TEST_LEAD_PROVIDER_ID_MISSING');
  const rawPayload = { id: providerLeadId, form_id: input.formId, is_test_lead: true };
  const payloadDigest = crypto.createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex');
  const notification: MetaLeadNotification = {
    eventKey: `admin-test-lead:${input.formId}:${providerLeadId}`,
    objectType: 'page',
    pageId,
    leadgenId: providerLeadId,
    formId: input.formId,
    payloadDigest,
  };
  const stored = await createVerifiedMetaWebhookReceipt({ notification, rawPayload });
  const queued = await enqueueMetaLeadProcessingJob({
    adapter: input.adapter,
    receiptId: stored.receipt.id,
    providerLeadId,
    pageId,
    formId: input.formId,
    correlationId: stored.receipt.correlationId,
    environment: stored.canonicalReceipt.environment,
    connectionKey: stored.canonicalReceipt.connectionKey,
  });
  if (!queued.result.accepted) throw Object.assign(new Error(queued.result.code), { code: queued.result.code });
  const canonicalQueued = await markMetaSocialWebhookReceiptQueued({
    receiptId: stored.canonicalReceipt.id,
    queueName: META_QUEUE_NAMES.LEADS,
    jobReference: queued.envelope.dedupeKey,
    actor: 'admin-test-lead-domain',
  });
  if (!canonicalQueued.ok) throw new Error(String(canonicalQueued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'));
  await markMetaWebhookReceipt({ receiptId: stored.receipt.id, status: 'QUEUED' });
  return createMetaTestLeadEvidence({ providerLeadId, pageId, formId: input.formId, createdAt: input.now });
}

export function cleanupMetaTestLeadsProduction(input: { olderThan?: Date; limit?: number } = {}) {
  return cleanupMetaTestLeadsStorage(input);
}
