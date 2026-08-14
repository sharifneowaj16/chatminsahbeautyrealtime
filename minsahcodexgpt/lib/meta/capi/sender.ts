import 'server-only';
import type { MetaCapiCoreJobData } from '@/lib/queue/metaCapiQueue';
import { sendCoreCapiEventToMeta } from '@/lib/tracking/meta-capi-core-event';
import {
  sendCodPurchaseToMeta,
  sendOnlinePaidPurchaseToMeta,
} from '@/lib/tracking/meta-capi-cod-purchase';
import {
  getMetaEventOutboxById,
  markMetaOutboxPermanentFailure,
  markMetaOutboxProcessing,
  markMetaOutboxSuppressed,
  markMetaOutboxSent,
  scheduleMetaOutboxRetry,
} from './outbox-repository';
import type { MetaEventOutboxRecord, MetaWebsiteServerEvent } from './types';
import { validateMetaWebsiteEvent } from './validator';
import { getMetaOutboxRetryDelayMs, META_OUTBOX_MAX_ATTEMPTS } from './retry';
import { getMetaJobsRedis } from '@/lib/jobs/connection';
import { acquireMetaRateLimitPermit, getMetaProviderCooldownMs, setMetaProviderCooldown } from '@/lib/jobs/rate-limit';
import { getMetaProviderRetryDecision } from '@/lib/jobs/retry-policy';

function safeCoreJobData(record: MetaEventOutboxRecord): MetaCapiCoreJobData {
  const safe = record.safePayload ?? {};
  return {
    type: 'core_event',
    eventName: record.eventName,
    eventId: record.eventId,
    orderId: record.orderId ?? undefined,
    queuedAt: record.createdAt.toISOString(),
    sdkPayload:
      record.payload.kind === 'core_event'
        ? (record.payload.request as unknown as Record<string, unknown>)
        : undefined,
    safePayload: {
      event_name: record.eventName,
      event_id: record.eventId,
      order_id: record.orderId ?? undefined,
      event_time: Math.floor(record.eventTime.getTime() / 1000),
      value: typeof safe.value === 'number' ? safe.value : undefined,
      currency: typeof safe.currency === 'string' ? safe.currency : undefined,
      schema_version: typeof safe.schema_version === 'string' ? safe.schema_version : undefined,
      graph_api_version: typeof safe.graph_api_version === 'string' ? safe.graph_api_version : undefined,
      custom_data_keys: Array.isArray(safe.custom_data_keys)
        ? safe.custom_data_keys.filter((value): value is string => typeof value === 'string')
        : undefined,
      content_id_count: Number(safe.content_id_count ?? 0),
      contents_count: Number(safe.contents_count ?? 0),
      has_fbp: Boolean(safe.has_fbp),
      has_fbc: Boolean(safe.has_fbc),
      has_external_id: Boolean(safe.has_external_id),
      has_email_hash: Boolean(safe.has_email_hash),
      has_phone_hash: Boolean(safe.has_phone_hash),
      has_ip: Boolean(safe.has_ip),
      has_ua: Boolean(safe.has_ua),
    },
  };
}

function validateOutboxRecord(record: MetaEventOutboxRecord) {
  if (
    record.payload.kind === 'core_event' &&
    (!Array.isArray(record.payload.request.data) || record.payload.request.data.length !== 1)
  ) {
    return {
      valid: false,
      issues: [{
        code: 'OUTBOX_EVENT_ENVELOPE_INVALID',
        field: 'payload.data',
        message: 'Core outbox payload must contain exactly one event.',
      }],
    };
  }

  const event: MetaWebsiteServerEvent =
    record.payload.kind === 'core_event'
      ? record.payload.request.data[0]
      : {
          event_name: record.eventName,
          event_id: record.eventId,
          event_time: Math.floor(record.eventTime.getTime() / 1000),
          action_source: 'website',
          event_source_url: record.eventSourceUrl ?? '',
          user_data: {},
          custom_data: {},
        };
  const validation = validateMetaWebsiteEvent(event);
  const identityMatches =
    event.event_name === record.eventName &&
    event.event_id === record.eventId &&
    event.action_source === record.actionSource;
  if (!identityMatches) {
    validation.issues.push({
      code: 'OUTBOX_PAYLOAD_IDENTITY_MISMATCH',
      field: 'payload',
      message: 'Outbox columns and payload identity must match.',
    });
  }
  return { ...validation, valid: validation.issues.length === 0 };
}


export async function processMetaOutboxById(input: {
  outboxId: string;
  leaseToken?: string | null;
}) {
  const existing = await getMetaEventOutboxById(input.outboxId);
  if (!existing) return { ok: false, skipped: true, reason: 'OUTBOX_NOT_FOUND' };
  if (existing.status === 'SENT') return { ok: true, skipped: true, reason: 'ALREADY_SENT' };
  if (['FAILED_PERMANENT', 'SUPPRESSED'].includes(existing.status)) {
    return { ok: false, skipped: true, reason: existing.status };
  }

  if (!existing.policyVersion || existing.policyReason !== 'CONSENT_GRANTED') {
    await markMetaOutboxSuppressed({
      outboxId: existing.id,
      reason: existing.policyReason || 'PRIVACY_POLICY_MISSING',
      safeDetails: {
        policy_version: existing.policyVersion,
        consent_state: existing.consentState,
        consent_version_present: Boolean(existing.consentVersion),
      },
    });
    return { ok: false, skipped: true, reason: existing.policyReason || 'PRIVACY_POLICY_MISSING' };
  }

  let providerDelayMs = 0;
  try {
    const redis = getMetaJobsRedis();
    providerDelayMs = await getMetaProviderCooldownMs(redis, 'meta-capi');
    if (providerDelayMs <= 0) {
      const permit = await acquireMetaRateLimitPermit(redis, {
        provider: 'meta-capi',
        max: Number(process.env.META_CAPI_RATE_LIMIT_MAX ?? 20),
        durationMs: Number(process.env.META_CAPI_RATE_LIMIT_WINDOW_MS ?? 1_000),
      });
      if (!permit.allowed) providerDelayMs = Math.max(1_000, permit.retryAfterMs);
    }
  } catch (error) {
    // BullMQ also enforces a local limiter. A Redis limiter read failure must not
    // lose a durable DB outbox event or convert a provider outage into data loss.
    console.warn('[MetaCapiSender] distributed limiter unavailable:', error instanceof Error ? error.message : error);
  }
  if (providerDelayMs > 0) {
    await scheduleMetaOutboxRetry({
      outboxId: existing.id,
      nextAttemptAt: new Date(Date.now() + providerDelayMs),
      error: { code: 'META_PROVIDER_COOLDOWN_ACTIVE', retryAfterMs: providerDelayMs },
    });
    return { ok: false, retry: true, reason: 'META_PROVIDER_COOLDOWN_ACTIVE' };
  }

  const record = await markMetaOutboxProcessing({
    outboxId: input.outboxId,
    leaseToken: input.leaseToken,
  });
  if (!record) return { ok: false, skipped: true, reason: 'OUTBOX_LEASE_MISMATCH' };

  const validation = validateOutboxRecord(record);
  if (!validation.valid) {
    await markMetaOutboxPermanentFailure({
      outboxId: record.id,
      error: {
        code: 'META_EVENT_VALIDATION_FAILED',
        issues: validation.issues,
      },
    });
    return { ok: false, retry: false, reason: 'META_EVENT_VALIDATION_FAILED' };
  }

  const finalAttempt = record.attempts >= META_OUTBOX_MAX_ATTEMPTS;

  try {
    const delivery = record.payload.kind === 'core_event'
      ? await sendCoreCapiEventToMeta({
          jobData: safeCoreJobData(record),
          retryCount: Math.max(0, record.attempts - 1),
          finalAttempt,
        })
      : record.payload.purchaseType === 'cod_purchase'
        ? await sendCodPurchaseToMeta({
            orderId: record.payload.orderId,
            retryCount: Math.max(0, record.attempts - 1),
            finalAttempt,
          })
        : await sendOnlinePaidPurchaseToMeta({
            orderId: record.payload.orderId,
            retryCount: Math.max(0, record.attempts - 1),
            finalAttempt,
          });

    if (delivery.ok || ('skipped' in delivery && delivery.skipped)) {
      await markMetaOutboxSent({
        outboxId: record.id,
        response: {
          outcome: delivery.ok ? 'accepted_or_idempotent' : 'skipped',
          reason: 'reason' in delivery ? delivery.reason : undefined,
          transport: 'transport' in delivery ? delivery.transport : undefined,
          cutover_mode: 'cutoverMode' in delivery ? delivery.cutoverMode : undefined,
          graph_api_version: 'graphApiVersion' in delivery ? delivery.graphApiVersion : undefined,
          sdk_version: 'sdkVersion' in delivery ? delivery.sdkVersion : undefined,
          credential_version: 'credentialVersion' in delivery ? delivery.credentialVersion : undefined,
        },
      });
      return delivery;
    }

    await markMetaOutboxPermanentFailure({
      outboxId: record.id,
      error: {
        code: 'META_DELIVERY_PERMANENT_FAILURE',
        reason: 'reason' in delivery ? delivery.reason : 'UNKNOWN',
      },
    });
    return delivery;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_META_DELIVERY_ERROR';
    const decision = getMetaProviderRetryDecision(record.attempts, error);
    if (decision.classification === 'RATE_LIMIT') {
      try {
        await setMetaProviderCooldown(
          getMetaJobsRedis(),
          'meta-capi',
          Math.max(60_000, decision.delayMs),
          'META_PROVIDER_RATE_LIMIT'
        );
      } catch {
        // The DB retry timestamp remains the durable fallback.
      }
    }
    if (finalAttempt || !decision.retry) {
      await markMetaOutboxPermanentFailure({
        outboxId: record.id,
        error: {
          code: finalAttempt ? 'META_DELIVERY_RETRY_EXHAUSTED' : 'META_DELIVERY_PERMANENT_FAILURE',
          classification: decision.classification,
          message,
          attempts: record.attempts,
        },
      });
      return { ok: false, retry: false, reason: finalAttempt ? 'META_DELIVERY_RETRY_EXHAUSTED' : 'META_DELIVERY_PERMANENT_FAILURE' };
    }

    await scheduleMetaOutboxRetry({
      outboxId: record.id,
      nextAttemptAt: new Date(Date.now() + Math.max(getMetaOutboxRetryDelayMs(record.attempts, error), decision.delayMs)),
      error: {
        code: 'META_DELIVERY_TRANSIENT_FAILURE',
        classification: decision.classification,
        retryAfterMs: decision.delayMs,
        message,
      },
    });
    return { ok: false, retry: true, reason: 'META_DELIVERY_TRANSIENT_FAILURE' };
  }
}
