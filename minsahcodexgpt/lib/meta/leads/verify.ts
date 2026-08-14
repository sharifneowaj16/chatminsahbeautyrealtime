import crypto from 'node:crypto';
import {
  parseAndNormalizeMetaWebhookNotifications,
  verifyMetaWebhookChallenge as verifyCentralMetaWebhookChallenge,
  type MetaWebhookNotification,
} from '@/lib/meta-platform/transports/webhook';
import { META_LEAD_WEBHOOK_MAX_BYTES, type MetaLeadNotification } from './types';

export type MetaWebhookChallengeResult = ReturnType<typeof verifyCentralMetaWebhookChallenge>;

export const verifyMetaWebhookChallenge = verifyCentralMetaWebhookChallenge;

function valueString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function buildMetaLeadEventKey(input: { pageId: string; leadgenId: string }) {
  return `leadgen:${crypto.createHash('sha256').update(`${input.pageId}:${input.leadgenId}`).digest('hex')}`;
}

export function normalizeMetaLeadWebhookNotifications(input: {
  events: readonly MetaWebhookNotification[];
  expectedPageId?: string | null;
  allowedFormIds?: Iterable<string>;
}) {
  const allowedForms = new Set(Array.from(input.allowedFormIds ?? []).map((item) => item.trim()).filter(Boolean));
  const notifications: MetaLeadNotification[] = [];
  const rejected: Array<{ code: string; pageId?: string; leadgenId?: string }> = [];

  for (const event of input.events) {
    if (event.routingTarget !== 'LEAD_ADS' || event.eventKind !== 'LEADGEN') continue;
    const pageId = valueString(event.objectId);
    if (!pageId) { rejected.push({ code: 'PAGE_ID_REQUIRED' }); continue; }
    if (input.expectedPageId?.trim() && pageId !== input.expectedPageId.trim()) {
      rejected.push({ code: 'PAGE_OWNERSHIP_MISMATCH', pageId });
      continue;
    }
    const value = record(event.payload.value);
    if (!value) { rejected.push({ code: 'CHANGE_VALUE_INVALID', pageId }); continue; }
    const leadgenId = valueString(value.leadgen_id);
    const formId = valueString(value.form_id);
    if (!leadgenId) { rejected.push({ code: 'LEADGEN_ID_REQUIRED', pageId }); continue; }
    if (allowedForms.size > 0 && (!formId || !allowedForms.has(formId))) {
      rejected.push({ code: 'FORM_OWNERSHIP_MISMATCH', pageId, leadgenId });
      continue;
    }
    notifications.push(Object.freeze({
      eventKey: buildMetaLeadEventKey({ pageId, leadgenId }),
      objectType: 'page',
      pageId,
      leadgenId,
      formId,
      adId: valueString(value.ad_id),
      createdTime: valueString(value.created_time),
      payloadDigest: event.payloadDigest,
    }));
  }

  return Object.freeze({
    notifications: Object.freeze(notifications),
    rejected: Object.freeze(rejected),
  });
}

export function parseMetaLeadWebhookPayload(input: {
  rawBody: string;
  expectedPageId?: string | null;
  allowedFormIds?: Iterable<string>;
  maxBytes?: number;
  expectedPayloadDigest?: string;
}) {
  const parsed = parseAndNormalizeMetaWebhookNotifications({
    rawBody: input.rawBody,
    maxBytes: input.maxBytes ?? META_LEAD_WEBHOOK_MAX_BYTES,
    expectedPayloadDigest: input.expectedPayloadDigest,
  });
  const normalized = normalizeMetaLeadWebhookNotifications({
    events: parsed.notifications,
    expectedPageId: input.expectedPageId,
    allowedFormIds: input.allowedFormIds,
  });
  return Object.freeze({
    payload: parsed.envelope,
    payloadDigest: parsed.payloadDigest,
    notifications: normalized.notifications,
    rejected: normalized.rejected,
    bytes: Buffer.byteLength(input.rawBody, 'utf8'),
    normalizedEvents: parsed.notifications,
  });
}
