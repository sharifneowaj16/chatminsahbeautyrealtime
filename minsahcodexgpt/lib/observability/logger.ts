import 'server-only';

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error';
type LogMetadata = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|token|secret|password|passcode|signature|payload|body|email|phone|address|ip|useragent|user_agent|fbc|fbp|ttclid|ttp)/i;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 4;

function truncate(value: string) {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}…`
    : value;
}

function sanitizeValue(value: unknown, key = '', depth = 0): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return value == null ? value : '[REDACTED]';
  }

  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      stack: process.env.NODE_ENV === 'production' ? undefined : truncate(value.stack ?? ''),
    };
  }

  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, key, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      output[entryKey] = sanitizeValue(entryValue, entryKey, depth + 1);
    }
    return output;
  }

  return truncate(String(value));
}

function writeLog(level: LogLevel, event: string, metadata: LogMetadata = {}) {
  const sanitizedMetadata = sanitizeValue(metadata);
  const record = {
    ...(sanitizedMetadata && typeof sanitizedMetadata === 'object' && !Array.isArray(sanitizedMetadata)
      ? sanitizedMetadata
      : {}),
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'minsah-web',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  };

  const serialized = JSON.stringify(record);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export function logOperationalInfo(event: string, metadata?: LogMetadata) {
  writeLog('info', event, metadata);
}

export function logOperationalWarning(event: string, metadata?: LogMetadata) {
  writeLog('warn', event, metadata);
}

export function logOperationalError(event: string, error: unknown, metadata?: LogMetadata) {
  writeLog('error', event, {
    ...metadata,
    error: error instanceof Error ? error : new Error(String(error)),
  });
}

export function getRequestId(request?: NextRequest | Request) {
  const incoming = request?.headers.get('x-request-id')?.trim();
  if (incoming && /^[a-zA-Z0-9._:-]{8,128}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

export function getRequestLogContext(request: NextRequest | Request, requestId = getRequestId(request)) {
  let pathname = 'unknown';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // Keep safe fallback.
  }

  return {
    requestId,
    method: request.method,
    pathname,
  };
}

export async function withOperationalTiming<T>(
  event: string,
  metadata: LogMetadata,
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await operation();
    logOperationalInfo(`${event}.success`, {
      ...metadata,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logOperationalError(`${event}.failure`, error, {
      ...metadata,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

export type MetaLogInput = {
  operation: string;
  outcome?: string;
  correlationId?: string | null;
  requestId?: string | null;
  jobId?: string | null;
  batchHandle?: string | null;
  catalogId?: string | null;
  retailerId?: string | null;
  eventId?: string | null;
  orderId?: string | null;
  leadgenId?: string | null;
  durationMs?: number;
  details?: unknown;
};

export function writeMetaLog(level: 'debug' | 'info' | 'warn' | 'error', input: MetaLogInput) {
  const event = `meta.${input.operation}`;
  const metadata = { ...input };
  delete (metadata as Partial<MetaLogInput>).operation;
  if (level === 'error') logOperationalError(event, new Error(String(input.outcome ?? 'META_OPERATION_FAILED')), metadata);
  else if (level === 'warn') logOperationalWarning(event, metadata);
  else logOperationalInfo(event, metadata);
  return sanitizeValue({ event, ...metadata });
}
