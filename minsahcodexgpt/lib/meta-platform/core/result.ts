import type { MetaPlatformError } from './errors';

export interface MetaSuccess<T> {
  readonly ok: true;
  readonly value: T;
  readonly correlationId?: string;
}

export interface MetaFailure {
  readonly ok: false;
  readonly error: MetaPlatformError;
}

export type MetaResult<T> = MetaSuccess<T> | MetaFailure;

export function metaSuccess<T>(value: T, correlationId?: string): MetaSuccess<T> {
  return Object.freeze({
    ok: true as const,
    value,
    ...(correlationId ? { correlationId } : {}),
  });
}

export function metaFailure(error: MetaPlatformError): MetaFailure {
  return Object.freeze({ ok: false as const, error });
}

export function isMetaResult(value: unknown): value is MetaResult<unknown> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MetaResult<unknown>>;
  return candidate.ok === true ? 'value' in candidate : candidate.ok === false && 'error' in candidate;
}
