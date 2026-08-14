import { createMetaPlatformError, type MetaPlatformError } from '../core/errors';

export const DEFAULT_META_OPERATION_TTL_MS = 24 * 60 * 60 * 1_000;
export const MAX_META_OPERATION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
export const MIN_META_OPERATION_TTL_MS = 1_000;

export function normalizeMetaOperationExpiry(input: Date | string | undefined, now = new Date()): Date {
  const expiresAt = input ? new Date(input) : new Date(now.getTime() + DEFAULT_META_OPERATION_TTL_MS);
  if (Number.isNaN(expiresAt.getTime())) throw new TypeError('META_OPERATION_EXPIRY_INVALID');
  const ttl = expiresAt.getTime() - now.getTime();
  if (ttl < MIN_META_OPERATION_TTL_MS || ttl > MAX_META_OPERATION_TTL_MS) {
    throw new TypeError('META_OPERATION_EXPIRY_OUT_OF_RANGE');
  }
  return expiresAt;
}

export function metaDeadlineExpiredError(correlationId?: string): MetaPlatformError {
  return createMetaPlatformError({
    code: 'META_OPERATION_DEADLINE_EXPIRED',
    category: 'TIMEOUT',
    message: 'The Meta operation deadline expired before safe execution could continue.',
    retryable: false,
    ...(correlationId ? { correlationId } : {}),
  });
}

export class MetaDeadlineBudget {
  readonly expiresAt: Date;
  readonly correlationId?: string;

  constructor(input: { readonly expiresAt: Date | string; readonly correlationId?: string }) {
    const expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) throw new TypeError('META_DEADLINE_INVALID');
    this.expiresAt = expiresAt;
    this.correlationId = input.correlationId;
  }

  remainingMs(now = Date.now()): number {
    return Math.max(0, this.expiresAt.getTime() - now);
  }

  expired(now = Date.now()): boolean {
    return this.remainingMs(now) <= 0;
  }

  assertRemaining(minimumMs = 1, now = Date.now()): void {
    if (this.remainingMs(now) < minimumMs) throw metaDeadlineExpiredError(this.correlationId);
  }

  boundedTimeout(requestedMs: number, reserveMs = 100): number {
    const remaining = this.remainingMs();
    if (remaining <= reserveMs) throw metaDeadlineExpiredError(this.correlationId);
    return Math.max(1, Math.min(Math.max(1, requestedMs), remaining - reserveMs));
  }
}

export async function runWithMetaDeadline<T>(input: {
  readonly budget: MetaDeadlineBudget;
  readonly requestedTimeoutMs: number;
  readonly signal?: AbortSignal;
  readonly operation: (signal: AbortSignal) => Promise<T>;
}): Promise<T> {
  input.budget.assertRemaining();
  const timeoutMs = input.budget.boundedTimeout(input.requestedTimeoutMs);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  if (input.signal) {
    if (input.signal.aborted) controller.abort(input.signal.reason);
    else {
      onAbort = () => controller.abort(input.signal?.reason);
      input.signal.addEventListener('abort', onAbort, { once: true });
    }
  }
  timer = setTimeout(() => controller.abort(new Error('META_OPERATION_DEADLINE_EXPIRED')), timeoutMs);
  try {
    return await input.operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw metaDeadlineExpiredError(input.budget.correlationId);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (input.signal && onAbort) input.signal.removeEventListener('abort', onAbort);
  }
}
