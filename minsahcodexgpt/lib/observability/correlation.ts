import { randomUUID } from 'node:crypto';

export type MetaCorrelationContext = {
  correlationId: string;
  requestId?: string | null;
  jobId?: string | null;
  batchHandle?: string | null;
  catalogId?: string | null;
  retailerId?: string | null;
  eventId?: string | null;
  orderId?: string | null;
  leadgenId?: string | null;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function normalizeCorrelationId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return SAFE_ID.test(trimmed) ? trimmed : null;
}

export function createCorrelationId(prefix = 'meta'): string {
  return `${prefix}:${randomUUID()}`;
}

export function ensureCorrelationId(value?: unknown, prefix = 'meta'): string {
  return normalizeCorrelationId(value) ?? createCorrelationId(prefix);
}

export function correlationFromHeaders(headers: Pick<Headers, 'get'>): MetaCorrelationContext {
  const requestId = normalizeCorrelationId(headers.get('x-request-id'));
  const correlationId = normalizeCorrelationId(headers.get('x-correlation-id')) ?? requestId ?? createCorrelationId();
  return { correlationId, requestId };
}
