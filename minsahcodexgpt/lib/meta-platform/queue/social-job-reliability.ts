import { createHash } from 'node:crypto';
import type { MetaSocialQueueFailureClass, MetaSocialQueueNack } from './social-queue-adapter.ts';

export const META_SOCIAL_JOB_MAX_ATTEMPTS = 5 as const;
export const META_SOCIAL_RETRY_BASE_DELAY_MS = 60_000 as const;
export const META_SOCIAL_RETRY_MAX_DELAY_MS = 3_600_000 as const;
export const META_SOCIAL_RETRY_JITTER_RATIO = 0.2 as const;

export type MetaSocialJobFailureAction = 'RETRY' | 'DEAD_LETTER' | 'RECONCILE';

export type MetaSocialJobFailureDecision = Readonly<{
  action: MetaSocialJobFailureAction;
  classification: MetaSocialQueueFailureClass;
  safeReasonCode: string;
  attempt: number;
  maxAttempts: number;
  retryDelayMs: number | null;
  retryAt: string | null;
  retryAfterMs: number | null;
  reconciliationRequired: boolean;
}>;

const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{2,95}$/;

function boundedAttempt(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000) throw new TypeError(code);
  return value;
}

function normalizedSeed(value: string): string {
  const seed = value.trim();
  if (!seed || seed.length > 512) throw new TypeError('META_SOCIAL_RETRY_SEED_INVALID');
  return seed;
}

function deterministicUnit(seed: string, attempt: number): number {
  const digest = createHash('sha256').update(`${seed}\0${attempt}`).digest();
  return digest.readUInt32BE(0) / 0xffff_ffff;
}

export function sanitizeMetaSocialJobReasonCode(value: unknown, fallback = 'META_SOCIAL_JOB_FAILED'): string {
  const raw = String(value ?? fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return SAFE_REASON_PATTERN.test(raw) ? raw : fallback;
}

export function getMetaSocialRetryDelayMs(input: {
  attempt: number;
  dedupeKey: string;
  retryAfterMs?: number | null;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
}): number {
  const attempt = boundedAttempt(input.attempt, 'META_SOCIAL_RETRY_ATTEMPT_INVALID');
  const seed = normalizedSeed(input.dedupeKey);
  const baseDelayMs = input.baseDelayMs ?? META_SOCIAL_RETRY_BASE_DELAY_MS;
  const maxDelayMs = input.maxDelayMs ?? META_SOCIAL_RETRY_MAX_DELAY_MS;
  const jitterRatio = input.jitterRatio ?? META_SOCIAL_RETRY_JITTER_RATIO;
  if (!Number.isSafeInteger(baseDelayMs) || baseDelayMs < 1_000) throw new TypeError('META_SOCIAL_RETRY_BASE_DELAY_INVALID');
  if (!Number.isSafeInteger(maxDelayMs) || maxDelayMs < baseDelayMs) throw new TypeError('META_SOCIAL_RETRY_MAX_DELAY_INVALID');
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 0.5) throw new TypeError('META_SOCIAL_RETRY_JITTER_INVALID');
  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** Math.max(0, attempt - 1)));
  const unit = deterministicUnit(seed, attempt);
  const factor = 1 - jitterRatio + (unit * jitterRatio * 2);
  const jittered = Math.max(1_000, Math.min(maxDelayMs, Math.round(exponential * factor)));
  const providerDelay = input.retryAfterMs ?? 0;
  if (!Number.isSafeInteger(providerDelay) || providerDelay < 0 || providerDelay > 7 * 24 * 60 * 60 * 1_000) {
    throw new TypeError('META_SOCIAL_RETRY_AFTER_INVALID');
  }
  return Math.max(jittered, providerDelay);
}

export function decideMetaSocialJobFailure(input: {
  nack: MetaSocialQueueNack;
  dedupeKey: string;
  attempt: number;
  maxAttempts?: number;
  now?: Date;
}): MetaSocialJobFailureDecision {
  const attempt = boundedAttempt(input.attempt, 'META_SOCIAL_FAILURE_ATTEMPT_INVALID');
  const maxAttempts = boundedAttempt(input.maxAttempts ?? META_SOCIAL_JOB_MAX_ATTEMPTS, 'META_SOCIAL_FAILURE_MAX_ATTEMPTS_INVALID');
  if (attempt > maxAttempts) throw new TypeError('META_SOCIAL_FAILURE_ATTEMPT_EXCEEDS_MAX');
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_FAILURE_TIME_INVALID');
  const safeReasonCode = sanitizeMetaSocialJobReasonCode(input.nack.safeReasonCode);

  if (input.nack.classification === 'UNKNOWN_WRITE' || input.nack.reconciliationRequired) {
    return Object.freeze({
      action: 'RECONCILE' as const,
      classification: 'UNKNOWN_WRITE' as const,
      safeReasonCode,
      attempt,
      maxAttempts,
      retryDelayMs: null,
      retryAt: null,
      retryAfterMs: null,
      reconciliationRequired: true,
    });
  }

  const retryable = input.nack.classification === 'RATE_LIMIT' || input.nack.classification === 'TRANSIENT';
  if (!retryable || attempt >= maxAttempts) {
    return Object.freeze({
      action: 'DEAD_LETTER' as const,
      classification: input.nack.classification,
      safeReasonCode: attempt >= maxAttempts && retryable ? 'META_SOCIAL_RETRY_EXHAUSTED' : safeReasonCode,
      attempt,
      maxAttempts,
      retryDelayMs: null,
      retryAt: null,
      retryAfterMs: input.nack.retryAfterMs ?? null,
      reconciliationRequired: false,
    });
  }

  const retryDelayMs = getMetaSocialRetryDelayMs({
    attempt,
    dedupeKey: input.dedupeKey,
    retryAfterMs: input.nack.retryAfterMs,
  });
  return Object.freeze({
    action: 'RETRY' as const,
    classification: input.nack.classification,
    safeReasonCode,
    attempt,
    maxAttempts,
    retryDelayMs,
    retryAt: new Date(now.getTime() + retryDelayMs).toISOString(),
    retryAfterMs: input.nack.retryAfterMs ?? null,
    reconciliationRequired: false,
  });
}

export function createMetaSocialRetryError(input: {
  decision: MetaSocialJobFailureDecision;
  dedupeKey: string;
}): Error {
  if (input.decision.action !== 'RETRY' || input.decision.retryDelayMs === null) {
    throw new TypeError('META_SOCIAL_RETRY_DECISION_REQUIRED');
  }
  const error = new Error(input.decision.safeReasonCode) as Error & Record<string, unknown>;
  Object.assign(error, {
    code: input.decision.safeReasonCode,
    classification: input.decision.classification,
    retryable: true,
    retryDelayMs: input.decision.retryDelayMs,
    retryAfterMs: input.decision.retryAfterMs ?? undefined,
    retrySeed: normalizedSeed(input.dedupeKey),
    status: input.decision.classification === 'RATE_LIMIT' ? 429 : 503,
  });
  return error;
}

export function projectMetaJobFailureForAdmin(error: unknown): Readonly<Record<string, unknown>> | null {
  if (!error || typeof error !== 'object') return null;
  const row = error as Record<string, unknown>;
  const code = sanitizeMetaSocialJobReasonCode(row.safeReasonCode ?? row.code ?? row.name ?? 'META_JOB_FAILED', 'META_JOB_FAILED');
  const classification = typeof row.classification === 'string'
    ? sanitizeMetaSocialJobReasonCode(row.classification, 'UNKNOWN')
    : undefined;
  const retryAt = typeof row.retryAt === 'string' && Number.isFinite(Date.parse(row.retryAt)) ? new Date(row.retryAt).toISOString() : undefined;
  const retryAfterMs = Number.isSafeInteger(row.retryAfterMs) && Number(row.retryAfterMs) >= 0 ? Number(row.retryAfterMs) : undefined;
  return Object.freeze({
    code,
    ...(classification ? { classification } : {}),
    ...(row.reconciliationRequired === true ? { reconciliationRequired: true } : {}),
    ...(retryAt ? { retryAt } : {}),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  });
}
