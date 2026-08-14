import { createMetaPlatformError, isMetaPlatformError, type MetaPlatformError } from '../core/errors';
import type { MetaOperationSafeError } from '../operations/types';
import type { MetaOperationPriority, MetaProviderUsageSignal, MetaRetryDecision } from './types';

const PRIORITY_MAX_ATTEMPTS: Readonly<Record<MetaOperationPriority, number>> = Object.freeze({
  P0: 12,
  P1: 10,
  P2: 8,
  P3: 6,
  P4: 4,
});

const PRIORITY_BASE_DELAY_MS: Readonly<Record<MetaOperationPriority, number>> = Object.freeze({
  P0: 500,
  P1: 1_000,
  P2: 2_000,
  P3: 5_000,
  P4: 15_000,
});

function normalizeError(error: unknown, correlationId?: string): MetaPlatformError {
  if (isMetaPlatformError(error)) return error;
  if (error && typeof error === 'object') {
    const candidate = error as Partial<MetaOperationSafeError> & { readonly category?: MetaPlatformError['category'] };
    if (typeof candidate.code === 'string' && typeof candidate.message === 'string' && typeof candidate.retryable === 'boolean') {
      return createMetaPlatformError({
        code: /^[A-Z][A-Z0-9_]{2,79}$/.test(candidate.code) ? candidate.code : 'META_OPERATION_EXECUTION_FAILED',
        category: candidate.category && ['VALIDATION', 'AUTHENTICATION', 'AUTHORIZATION', 'NOT_FOUND', 'CONFLICT', 'RATE_LIMIT', 'DEPENDENCY_UNAVAILABLE', 'TIMEOUT', 'CONFIGURATION', 'INTERNAL', 'RECONCILIATION_REQUIRED'].includes(candidate.category)
          ? candidate.category
          : candidate.retryable ? 'DEPENDENCY_UNAVAILABLE' : 'INTERNAL',
        message: candidate.message.slice(0, 500),
        retryable: candidate.retryable,
        ...(candidate.safeDetails ? { safeDetails: candidate.safeDetails } : {}),
        ...(correlationId ? { correlationId } : {}),
      });
    }
  }
  return createMetaPlatformError({
    code: 'META_OPERATION_EXECUTION_FAILED',
    category: 'INTERNAL',
    message: error instanceof Error ? error.message.slice(0, 500) : 'Meta operation execution failed.',
    retryable: false,
    ...(correlationId ? { correlationId } : {}),
  });
}

export function metaPlatformErrorToSafeError(error: MetaPlatformError): MetaOperationSafeError {
  return Object.freeze({
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    category: error.category,
    ...(error.safeDetails ? { safeDetails: error.safeDetails } : {}),
  });
}

export class MetaRetryPolicy {
  private readonly maxDelayMs: number;
  private readonly random: () => number;

  constructor(input: { readonly maxDelayMs?: number; readonly random?: () => number } = {}) {
    this.maxDelayMs = Math.max(1_000, input.maxDelayMs ?? 15 * 60 * 1_000);
    this.random = input.random ?? Math.random;
  }

  decide(input: {
    readonly error: unknown;
    readonly attempt: number;
    readonly priority: MetaOperationPriority;
    readonly expiresAt?: Date | string;
    readonly idempotent: boolean;
    readonly requestMayHaveSucceeded?: boolean;
    readonly providerUsage?: MetaProviderUsageSignal;
    readonly maxAttempts?: number;
    readonly now?: Date;
    readonly correlationId?: string;
  }): MetaRetryDecision {
    const now = input.now ?? new Date();
    const error = normalizeError(input.error, input.correlationId);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime())) {
      const deadlineError = createMetaPlatformError({
        code: 'META_OPERATION_DEADLINE_EXPIRED',
        category: 'TIMEOUT',
        message: 'The Meta operation expired before another execution attempt could start.',
        retryable: false,
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      });
      return Object.freeze({ action: 'FAIL', reason: 'DEADLINE_EXPIRED', delayMs: 0, error: deadlineError });
    }

    if (input.requestMayHaveSucceeded && !input.idempotent) {
      const reconciliationError = createMetaPlatformError({
        code: 'META_OPERATION_UNKNOWN_OUTCOME',
        category: 'RECONCILIATION_REQUIRED',
        message: 'The provider may have accepted a non-idempotent write; blind retry is unsafe.',
        retryable: false,
        safeDetails: { originalCode: error.code },
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      });
      return Object.freeze({ action: 'RECONCILE', reason: 'UNSAFE_WRITE_UNKNOWN_OUTCOME', delayMs: 0, error: reconciliationError });
    }

    if (!error.retryable) return Object.freeze({ action: 'FAIL', reason: 'NON_RETRYABLE', delayMs: 0, error });
    const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? PRIORITY_MAX_ATTEMPTS[input.priority], 100));
    if (input.attempt >= maxAttempts) {
      const exhausted = createMetaPlatformError({
        code: 'META_OPERATION_RETRY_EXHAUSTED',
        category: error.category,
        message: 'The Meta operation exhausted its retry budget.',
        retryable: false,
        safeDetails: { originalCode: error.code, attempts: input.attempt, maxAttempts },
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      });
      return Object.freeze({ action: 'FAIL', reason: 'ATTEMPTS_EXHAUSTED', delayMs: 0, error: exhausted });
    }

    const providerDelay = input.providerUsage?.retryAfterMs ?? input.providerUsage?.estimatedTimeToRegainAccessMs;
    const base = PRIORITY_BASE_DELAY_MS[input.priority];
    const exponential = Math.min(this.maxDelayMs, base * (2 ** Math.max(0, input.attempt - 1)));
    const jitter = Math.floor(exponential * (0.5 + Math.max(0, Math.min(1, this.random()))));
    const delayMs = Math.max(250, providerDelay ?? jitter);
    if (expiresAt && now.getTime() + delayMs >= expiresAt.getTime()) {
      const deadlineError = createMetaPlatformError({
        code: 'META_OPERATION_DEADLINE_EXPIRED',
        category: 'TIMEOUT',
        message: 'The next safe retry would occur after the operation expiry.',
        retryable: false,
        safeDetails: { originalCode: error.code, proposedDelayMs: delayMs },
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      });
      return Object.freeze({ action: 'FAIL', reason: 'DEADLINE_EXPIRED', delayMs: 0, error: deadlineError });
    }
    const retryAt = new Date(now.getTime() + delayMs).toISOString();
    const reason = providerDelay !== undefined
      ? 'PROVIDER_RETRY_AFTER'
      : error.category === 'RATE_LIMIT' ? 'RATE_LIMIT' : 'RETRYABLE_DEPENDENCY';
    return Object.freeze({ action: input.attempt <= 1 && providerDelay === undefined ? 'RETRY' : 'DEFER', reason, delayMs, retryAt, error });
  }
}
