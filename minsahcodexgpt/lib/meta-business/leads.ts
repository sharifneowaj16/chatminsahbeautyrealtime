import 'server-only';

import crypto from 'node:crypto';
import { requireMetaConfig } from '@/lib/meta-business/config';
import { exportMetaCursor, exportMetaValue, getMetaApi, metaSdk, runMetaRequest } from '@/lib/meta-business/sdk';
import { requireMetaLeadEncryptionSecret, getMetaLeadConfig } from '@/lib/meta/leads/config';
import { encryptMetaLeadPayload } from '@/lib/meta/leads/crypto';
import { fetchMetaLeadGraphRecord } from '@/lib/meta/leads/fetch';
import { normalizeMetaLeadFields } from '@/lib/meta/leads/normalize';
import { assignMetaLead, listMetaLeadsSafe, persistRetrievedMetaLead } from '@/lib/meta/leads/repository';
import type { MetaLeadGraphPayload } from '@/lib/meta/leads/types';

const LEAD_FIELDS = [
  'id','created_time','ad_id','ad_name','adset_id','adset_name','campaign_id','campaign_name','form_id',
  'field_data','is_organic','platform','partner_name','retailer_item_id',
];

async function persistLead(rawLead: MetaLeadGraphPayload, context: { pageId?: string; receiptId?: string } = {}) {
  if (!rawLead.id) throw new Error('Meta lead payload has no id');
  const config = getMetaLeadConfig();
  const { fields, normalized } = normalizeMetaLeadFields(rawLead);
  const rawJson = JSON.stringify(rawLead);
  const result = await persistRetrievedMetaLead({
    receiptId: context.receiptId ?? `manual:${crypto.randomUUID()}`,
    pageId: context.pageId ?? config.pageId ?? 'manual',
    raw: rawLead,
    fields,
    normalized,
    encryptedRawPayload: encryptMetaLeadPayload(rawLead, requireMetaLeadEncryptionSecret()),
    rawPayloadDigest: crypto.createHash('sha256').update(rawJson).digest('hex'),
    retentionUntil: new Date(Date.now() + config.retentionDays * 86_400_000),
  });
  if (!result.duplicate) await assignMetaLead(result.leadId);
  return result;
}

export async function persistMetaLead(rawLead: Record<string, unknown>, context: { pageId?: string } = {}) {
  return persistLead(rawLead as MetaLeadGraphPayload, context);
}

export async function fetchLeadById(leadgenId: string, pageId?: string) {
  const result = await fetchMetaLeadGraphRecord({ leadgenId });
  await persistLead(result.payload, { pageId });
  return result.payload;
}

export async function fetchFormLeads(input: { formId: string; pageId?: string; limit?: number; since?: number; until?: number }) {
  const config = requireMetaConfig('pageAccessToken');
  const form = new metaSdk.LeadgenForm(input.formId, {}, undefined, getMetaApi(config.pageAccessToken));
  const filtering: Array<Record<string, unknown>> = [];
  if (input.since) filtering.push({ field: 'time_created', operator: 'GREATER_THAN', value: input.since });
  if (input.until) filtering.push({ field: 'time_created', operator: 'LESS_THAN', value: input.until });
  const result = await runMetaRequest(() => form.getLeads(LEAD_FIELDS, {
    limit: Math.min(Math.max(input.limit ?? 100, 1), 500),
    filtering: filtering.length ? filtering : undefined,
  }));
  const cursor = exportMetaCursor(result);
  for (const rawLead of cursor.data) await persistLead(exportMetaValue(rawLead) as MetaLeadGraphPayload, { pageId: input.pageId });
  return cursor;
}

export function listStoredLeads(input: { page?: number; limit?: number; status?: string; formId?: string; assignedToId?: string; campaignId?: string }) {
  return listMetaLeadsSafe(input);
}

export async function subscribePageToLeadgenLegacy(pageId?: string) {
  const config = requireMetaConfig('pageAccessToken', 'pageId');
  const resolvedPageId = pageId ?? config.pageId;
  const api = getMetaApi(config.pageAccessToken);
  return runMetaRequest(() => api.call('POST', [resolvedPageId, 'subscribed_apps'], { subscribed_fields: ['leadgen'] }));
}
