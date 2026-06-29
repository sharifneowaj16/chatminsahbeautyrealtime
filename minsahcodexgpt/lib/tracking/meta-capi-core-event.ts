import 'server-only';
import prisma from '@/lib/prisma';
import type { FacebookConversionAPIRequest } from '@/types/facebook';
import type { MetaCapiCoreJobData } from '@/lib/queue/metaCapiQueue';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
const META_PIXEL_ID =
  process.env.META_PIXEL_ID ??
  process.env.NEXT_PUBLIC_META_PIXEL_ID ??
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ??
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const META_CAPI_ACCESS_TOKEN =
  process.env.META_CAPI_ACCESS_TOKEN ?? process.env.FACEBOOK_CONVERSION_API_TOKEN;
const META_CAPI_TIMEOUT_MS = Number(process.env.META_CAPI_TIMEOUT_MS ?? 10_000) || 10_000;
const TRACKING_SCHEMA_VERSION = 'mb_tracking_v1';

function toPrismaJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function shouldRetryMetaCapi(status?: number, errorCode?: string | number | null) {
  if (!status) return true;
  if (status === 429) return true;
  if (status >= 500) return true;

  if (String(errorCode) === '190') return false;
  if (String(errorCode) === '100') return false;

  if (status >= 400 && status < 500) return false;
  return false;
}

async function postMetaCapiPayload(url: string, payload: unknown) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), META_CAPI_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function logMetaCoreFailure(params: {
  eventName: string;
  eventId?: string;
  orderId?: string;
  statusCode?: number;
  errorCode?: string;
  errorSubcode?: string;
  errorMessage: string;
  retryCount?: number;
  finalFailed?: boolean;
  safePayload?: Record<string, unknown>;
  responsePayload?: unknown;
  hasFbp?: boolean;
  hasFbc?: boolean;
  hasExternalId?: boolean;
  hasEmailHash?: boolean;
  hasPhoneHash?: boolean;
  hasIp?: boolean;
  hasUa?: boolean;
}) {
  await prisma.metaCapiFailure.create({
    data: {
      orderId: params.orderId,
      eventName: params.eventName,
      eventId: params.eventId,
      provider: 'META',
      schemaVersion: TRACKING_SCHEMA_VERSION,
      statusCode: params.statusCode,
      errorCode: params.errorCode,
      errorSubcode: params.errorSubcode,
      errorMessage: params.errorMessage,
      retryCount: params.retryCount ?? 0,
      finalFailed: params.finalFailed ?? false,
      safePayload: toPrismaJson(params.safePayload),
      responsePayload: toPrismaJson(params.responsePayload),
      hasFbp: params.hasFbp ?? false,
      hasFbc: params.hasFbc ?? false,
      hasExternalId: params.hasExternalId ?? false,
      hasEmailHash: params.hasEmailHash ?? false,
      hasPhoneHash: params.hasPhoneHash ?? false,
      hasIp: params.hasIp ?? false,
      hasUa: params.hasUa ?? false,
    },
  });
}

export async function sendCoreCapiEventToMeta(params: {
  jobData: MetaCapiCoreJobData;
  retryCount?: number;
  finalAttempt?: boolean;
}) {
  const { jobData, retryCount = 0, finalAttempt = false } = params;
  const eventName = jobData.eventName;
  const eventId = jobData.eventId;
  const safePayload = jobData.safePayload;

  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    await logMetaCoreFailure({
      orderId: jobData.orderId,
      eventName,
      eventId,
      errorCode: 'META_ENV_MISSING',
      errorMessage: 'META_PIXEL_ID or META_CAPI_ACCESS_TOKEN is missing.',
      retryCount,
      finalFailed: true,
      safePayload,
      hasFbp: safePayload.has_fbp,
      hasFbc: safePayload.has_fbc,
      hasExternalId: safePayload.has_external_id,
      hasEmailHash: safePayload.has_email_hash,
      hasPhoneHash: safePayload.has_phone_hash,
      hasIp: safePayload.has_ip,
      hasUa: safePayload.has_ua,
    });
    return { ok: false, retry: false, reason: 'META_ENV_MISSING' };
  }

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`;

  try {
    const res = await postMetaCapiPayload(url, jobData.capiPayload as unknown as FacebookConversionAPIRequest);
    const responsePayload = (await res.json().catch(() => null)) as {
      fbtrace_id?: string;
      error?: {
        code?: string | number;
        error_subcode?: string | number;
        message?: string;
      };
    } | null;

    if (res.ok) {
      console.log(`[CAPI][Core] Event sent successfully: ${eventName} (${eventId})`);
      return { ok: true, retry: false, response: responsePayload };
    }

    const metaError = responsePayload?.error;
    const errorCode = metaError?.code ? String(metaError.code) : undefined;
    const retry = shouldRetryMetaCapi(res.status, errorCode);

    await logMetaCoreFailure({
      orderId: jobData.orderId,
      eventName,
      eventId,
      statusCode: res.status,
      errorCode,
      errorSubcode: metaError?.error_subcode ? String(metaError.error_subcode) : undefined,
      errorMessage: metaError?.message ?? `Meta CAPI failed with status ${res.status}`,
      retryCount,
      finalFailed: !retry || finalAttempt,
      safePayload,
      responsePayload,
      hasFbp: safePayload.has_fbp,
      hasFbc: safePayload.has_fbc,
      hasExternalId: safePayload.has_external_id,
      hasEmailHash: safePayload.has_email_hash,
      hasPhoneHash: safePayload.has_phone_hash,
      hasIp: safePayload.has_ip,
      hasUa: safePayload.has_ua,
    });

    if (String(errorCode) === '190') {
      console.error('[CRITICAL][META_CAPI][Core] Invalid access token or expired token.', {
        eventName,
        eventId,
        orderId: jobData.orderId,
        statusCode: res.status,
        errorCode,
      });
    }

    if (retry) {
      throw new Error(`Retryable Meta CAPI error: ${res.status}`);
    }

    return { ok: false, retry: false, reason: 'META_CAPI_PERMANENT_FAILURE' };
  } catch (error) {
    await logMetaCoreFailure({
      orderId: jobData.orderId,
      eventName,
      eventId,
      errorCode: 'NETWORK_OR_RETRYABLE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown network/retryable error',
      retryCount,
      finalFailed: finalAttempt,
      safePayload,
      hasFbp: safePayload.has_fbp,
      hasFbc: safePayload.has_fbc,
      hasExternalId: safePayload.has_external_id,
      hasEmailHash: safePayload.has_email_hash,
      hasPhoneHash: safePayload.has_phone_hash,
      hasIp: safePayload.has_ip,
      hasUa: safePayload.has_ua,
    });

    throw error;
  }
}
