import 'server-only';
import prisma from '@/lib/prisma';
import type { MetaCapiCoreJobData } from '@/lib/queue/metaCapiQueue';
import {
  TRACKING_SCHEMA_VERSION,
  withMetaCapiPayloadSchemaVersion,
  withMetaSafePayloadSchema,
} from '@/lib/tracking/meta-schema';
import type { MetaBusinessSdkRequestInput } from '@/lib/tracking/meta-business-sdk';
import { sendMetaCapiWithPhase28Cutover } from '@/lib/meta-platform/migration/phase28-capi-facade';
import { getTrackingFailureLogRetentionMetadata } from '@/lib/tracking/failure-retention';
import { logOperationalError } from '@/lib/observability/logger';
import { computeMetaAdaptiveCooldownMs, parseMetaRateLimitHeaders } from '@/lib/jobs/rate-limit';

class LoggedMetaCapiRetryableError extends Error {
  readonly metaCapiFailureAlreadyLogged = true;
  readonly providerStatus?: number;
  readonly retryAfterMs?: number;

  constructor(message: string, providerStatus?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'LoggedMetaCapiRetryableError';
    this.providerStatus = providerStatus;
    this.retryAfterMs = retryAfterMs;
  }
}

function isLoggedMetaCapiRetryableError(error: unknown): error is LoggedMetaCapiRetryableError {
  return (
    error instanceof LoggedMetaCapiRetryableError ||
    (typeof error === 'object' &&
      error !== null &&
      'metaCapiFailureAlreadyLogged' in error &&
      (error as { metaCapiFailureAlreadyLogged?: unknown }).metaCapiFailureAlreadyLogged === true)
  );
}

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
  const retention = getTrackingFailureLogRetentionMetadata({
    provider: 'META',
    statusCode: params.statusCode,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    finalFailed: params.finalFailed ?? false,
  });

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
      failureCategory: retention.failureCategory,
      cleanupAfter: retention.cleanupAfter,
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
  const safePayload = withMetaSafePayloadSchema(jobData.safePayload);

  try {
    const queuedPayload = jobData.sdkPayload ?? jobData.capiPayload;
    if (!queuedPayload) {
      await logMetaCoreFailure({
        orderId: jobData.orderId,
        eventName,
        eventId,
        errorCode: 'BUSINESS_SDK_PAYLOAD_MISSING',
        errorMessage: 'Queued Meta Business SDK payload is missing.',
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
      return { ok: false, retry: false, reason: 'BUSINESS_SDK_PAYLOAD_MISSING' };
    }

    const sdkPayload = withMetaCapiPayloadSchemaVersion(
      queuedPayload
    ) as unknown as MetaBusinessSdkRequestInput;

    const result = await sendMetaCapiWithPhase28Cutover({
      payload: sdkPayload,
      correlationId: jobData.eventId,
    });
    const responsePayload = result.responsePayload;

    if (result.ok) {
      console.log(
        `[CAPI][Phase28][Core] Event sent successfully: ${eventName} (${eventId})`
      );
      return {
        ok: true,
        retry: false,
        response: responsePayload,
        transport: result.transport,
        cutoverMode: result.cutoverMode,
        graphApiVersion: result.graphApiVersion,
        sdkVersion: result.sdkVersion,
        credentialVersion: result.credentialVersion,
      };
    }

    const metaError = responsePayload?.error;
    const errorCode = metaError?.code ? String(metaError.code) : undefined;
    const retry = shouldRetryMetaCapi(result.status, errorCode);

    await logMetaCoreFailure({
      orderId: jobData.orderId,
      eventName,
      eventId,
      statusCode: result.status,
      errorCode,
      errorSubcode: metaError?.error_subcode ? String(metaError.error_subcode) : undefined,
      errorMessage: metaError?.message ?? `Meta CAPI Business SDK failed with status ${result.status}`,
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
      logOperationalError(
        'tracking.meta_capi_core.invalid_access_token',
        new Error('Meta CAPI access token is invalid or expired.'),
        {
          eventName,
          eventId,
          orderId: jobData.orderId,
          statusCode: result.status,
          errorCode,
        }
      );
    }

    if (retry) {
      const rateHeaders = parseMetaRateLimitHeaders(result.responseHeaders);
      throw new LoggedMetaCapiRetryableError(
        `Retryable Meta CAPI Business SDK error: ${result.status}`,
        result.status,
        computeMetaAdaptiveCooldownMs({ status: result.status, headers: rateHeaders })
      );
    }

    return {
      ok: false,
      retry: false,
      reason: 'META_CAPI_PERMANENT_FAILURE',
      transport: result.transport,
      cutoverMode: result.cutoverMode,
      graphApiVersion: result.graphApiVersion,
      sdkVersion: result.sdkVersion,
    };
  } catch (error) {
    if (isLoggedMetaCapiRetryableError(error)) {
      throw error;
    }

    await logMetaCoreFailure({
      orderId: jobData.orderId,
      eventName,
      eventId,
      errorCode: 'BUSINESS_SDK_NETWORK_OR_RUNTIME_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown Business SDK error',
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
