import 'server-only';
import crypto from 'node:crypto';
import { META_QUEUE_NAMES } from '@/lib/jobs/job-types';
import { requireMetaConfig } from '@/lib/meta-business/config';
import { exportMetaCursor, exportMetaValue, getMetaApi, metaSdk, runMetaRequest } from '@/lib/meta-business/sdk';
import { enqueueMetaLeadProcessingJob, type MetaSocialQueueAdapter } from '@/lib/meta-platform/queue';
import { markMetaSocialWebhookReceiptQueued } from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { createVerifiedMetaWebhookReceipt, markMetaWebhookReceipt } from '@/lib/meta/leads/receipt';
import type { MetaLeadGraphPayload, MetaLeadNotification } from '@/lib/meta/leads/types';

const LEAD_FIELDS = [
  'id','created_time','ad_id','ad_name','adset_id','adset_name','campaign_id','campaign_name','form_id',
  'field_data','is_organic','platform','partner_name','retailer_item_id','is_test_lead',
];

export async function syncMetaLeadFormProduction(input: {
  formId: string;
  pageId?: string;
  limit?: number;
  since?: number;
  until?: number;
  adapter: MetaSocialQueueAdapter;
}) {
  const config = requireMetaConfig('pageAccessToken', 'pageId');
  const pageId = input.pageId ?? config.pageId;
  if (!pageId) throw Object.assign(new Error('META_LEAD_PAGE_ID_REQUIRED'), { code: 'META_LEAD_PAGE_ID_REQUIRED', permanent: true });
  const form = new metaSdk.LeadgenForm(input.formId, {}, undefined, getMetaApi(config.pageAccessToken));
  const filtering: Array<Record<string, unknown>> = [];
  if (input.since) filtering.push({ field: 'time_created', operator: 'GREATER_THAN', value: input.since });
  if (input.until) filtering.push({ field: 'time_created', operator: 'LESS_THAN', value: input.until });
  const result = await runMetaRequest(() => form.getLeads(LEAD_FIELDS, {
    limit: Math.min(Math.max(input.limit ?? 100, 1), 500),
    filtering: filtering.length ? filtering : undefined,
  }));
  const cursor = exportMetaCursor(result);
  let enqueued = 0;
  let duplicates = 0;
  for (const item of cursor.data) {
    const raw = exportMetaValue(item) as MetaLeadGraphPayload;
    if (!raw.id) continue;
    const payloadDigest = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const notification: MetaLeadNotification = {
      eventKey: `manual-form-sync:${input.formId}:${raw.id}`,
      objectType: 'page',
      pageId,
      leadgenId: raw.id,
      formId: raw.form_id ?? input.formId,
      ...(raw.ad_id ? { adId: raw.ad_id } : {}),
      ...(raw.created_time ? { createdTime: raw.created_time } : {}),
      payloadDigest,
    };
    const stored = await createVerifiedMetaWebhookReceipt({ notification, rawPayload: raw });
    if (!stored.created && ['QUEUED', 'PROCESSED'].includes(stored.receipt.status)) {
      duplicates += 1;
      continue;
    }
    const queued = await enqueueMetaLeadProcessingJob({
      adapter: input.adapter,
      receiptId: stored.receipt.id,
      providerLeadId: raw.id,
      pageId,
      formId: notification.formId,
      correlationId: stored.receipt.correlationId,
      environment: stored.canonicalReceipt.environment,
      connectionKey: stored.canonicalReceipt.connectionKey,
    });
    if (!queued.result.accepted) throw Object.assign(new Error(queued.result.code), { code: queued.result.code });
    const canonicalQueued = await markMetaSocialWebhookReceiptQueued({
      receiptId: stored.canonicalReceipt.id,
      queueName: META_QUEUE_NAMES.LEADS,
      jobReference: queued.envelope.dedupeKey,
      actor: 'lead-form-sync-domain',
    });
    if (!canonicalQueued.ok) throw new Error(String(canonicalQueued.error.safeDetails?.sourceCode ?? 'CANONICAL_RECEIPT_QUEUE_TRANSITION_FAILED'));
    await markMetaWebhookReceipt({ receiptId: stored.receipt.id, status: 'QUEUED' });
    enqueued += 1;
  }
  return Object.freeze({ scanned: cursor.data.length, enqueued, duplicates });
}
