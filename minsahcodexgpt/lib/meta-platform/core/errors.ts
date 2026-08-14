export const META_ERROR_CATEGORIES = [
  'VALIDATION',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMIT',
  'DEPENDENCY_UNAVAILABLE',
  'TIMEOUT',
  'CONFIGURATION',
  'INTERNAL',
  'RECONCILIATION_REQUIRED',
] as const;

export type MetaErrorCategory = (typeof META_ERROR_CATEGORIES)[number];

export interface MetaPlatformError {
  readonly code: string;
  readonly category: MetaErrorCategory;
  readonly message: string;
  readonly retryable: boolean;
  readonly safeDetails?: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
}

export interface CreateMetaPlatformErrorInput {
  readonly code: string;
  readonly category: MetaErrorCategory;
  readonly message: string;
  readonly retryable: boolean;
  readonly safeDetails?: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
}

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;

export function createMetaPlatformError(input: CreateMetaPlatformErrorInput): MetaPlatformError {
  if (!ERROR_CODE_PATTERN.test(input.code)) {
    throw new TypeError('META_ERROR_CODE_INVALID');
  }
  if (!input.message.trim()) {
    throw new TypeError('META_ERROR_MESSAGE_REQUIRED');
  }

  return Object.freeze({
    code: input.code,
    category: input.category,
    message: input.message.trim(),
    retryable: input.retryable,
    ...(input.safeDetails ? { safeDetails: Object.freeze({ ...input.safeDetails }) } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  });
}

export function isMetaPlatformError(value: unknown): value is MetaPlatformError {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MetaPlatformError>;
  return typeof candidate.code === 'string'
    && ERROR_CODE_PATTERN.test(candidate.code)
    && typeof candidate.message === 'string'
    && META_ERROR_CATEGORIES.includes(candidate.category as MetaErrorCategory)
    && typeof candidate.retryable === 'boolean';
}

export function normalizeMetaPlatformError(
  error: unknown,
  fallback: CreateMetaPlatformErrorInput,
): MetaPlatformError {
  if (isMetaPlatformError(error)) {
    if (fallback.correlationId && !error.correlationId) {
      return createMetaPlatformError({ ...error, correlationId: fallback.correlationId });
    }
    return error;
  }

  return createMetaPlatformError(fallback);
}
