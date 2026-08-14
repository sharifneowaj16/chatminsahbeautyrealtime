import 'server-only';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';

function positiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function getMetaLeadConfig() {
  const meta = getMetaBusinessConfig();
  const allowedFormIds = new Set((process.env.META_LEAD_ALLOWED_FORM_IDS ?? '').split(',').map((item) => item.trim()).filter(Boolean));
  return {
    pageId: meta.pageId,
    pageAccessToken: meta.pageAccessToken,
    appSecret: meta.appSecret,
    webhookVerifyToken: meta.webhookVerifyToken,
    graphApiVersion: meta.graphApiVersion,
    allowedFormIds,
    maxRetrievalAgeSeconds: positiveInt(process.env.META_LEAD_MAX_RETRIEVAL_AGE_SECONDS, 90 * 24 * 60 * 60, 180 * 24 * 60 * 60),
    retentionDays: positiveInt(process.env.META_LEAD_RETENTION_DAYS, 365, 2_555),
    rawRetentionDays: positiveInt(process.env.META_LEAD_RAW_RETENTION_DAYS, 90, 365),
    webhookRetentionDays: positiveInt(process.env.META_LEAD_WEBHOOK_RETENTION_DAYS, 30, 365),
    slaMinutes: positiveInt(process.env.META_LEAD_RESPONSE_SLA_MINUTES, 15, 24 * 60),
    notificationWebhookUrl: process.env.META_LEAD_NOTIFICATION_WEBHOOK_URL?.trim() || undefined,
  };
}

export function requireMetaLeadEncryptionSecret() {
  const explicit = process.env.META_LEAD_DATA_KEY?.trim();
  if (explicit) return explicit;
  const appSecret = getMetaBusinessConfig().appSecret?.trim();
  if (process.env.NODE_ENV !== 'production' && appSecret) return appSecret;
  throw new Error('META_LEAD_DATA_KEY_REQUIRED');
}
export function requireMetaLeadFingerprintSecret() {
  const explicit = process.env.META_LEAD_FINGERPRINT_KEY?.trim();
  if (explicit) return explicit;
  return requireMetaLeadEncryptionSecret();
}

