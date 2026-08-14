import { createHash } from 'node:crypto';
import type { MetaVersionedPayload } from './types';

const PAYLOAD_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+){0,15}$/;
const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024;
const FORBIDDEN_KEY_PATTERN = /^(?:access[_-]?token|app[_-]?secret|client[_-]?secret|authorization|password|refresh[_-]?token|appsecret[_-]?proof|secret)$/i;

export type MetaPayloadPoisonCode =
  | 'META_PAYLOAD_TYPE_INVALID'
  | 'META_PAYLOAD_VERSION_INVALID'
  | 'META_PAYLOAD_NOT_JSON_SAFE'
  | 'META_PAYLOAD_TOO_LARGE'
  | 'META_PAYLOAD_SECRET_FIELD_FORBIDDEN'
  | 'META_PAYLOAD_CODEC_NOT_FOUND'
  | 'META_PAYLOAD_DECODE_FAILED';

export class MetaPayloadPoisonError extends Error {
  readonly code: MetaPayloadPoisonCode;
  readonly safeDetails?: Readonly<Record<string, unknown>>;

  constructor(code: MetaPayloadPoisonCode, message: string, safeDetails?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'MetaPayloadPoisonError';
    this.code = code;
    this.safeDetails = safeDetails ? Object.freeze({ ...safeDetails }) : undefined;
  }
}

function assertJsonSafe(value: unknown, path = '$', seen = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new MetaPayloadPoisonError('META_PAYLOAD_NOT_JSON_SAFE', 'Payload contains a non-finite number.', { path });
    }
    return;
  }
  if (typeof value !== 'object') {
    throw new MetaPayloadPoisonError('META_PAYLOAD_NOT_JSON_SAFE', 'Payload contains a non-JSON value.', { path, type: typeof value });
  }
  if (seen.has(value)) {
    throw new MetaPayloadPoisonError('META_PAYLOAD_NOT_JSON_SAFE', 'Payload contains a circular reference.', { path });
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonSafe(item, `${path}[${index}]`, seen));
    seen.delete(value);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new MetaPayloadPoisonError('META_PAYLOAD_NOT_JSON_SAFE', 'Payload must contain plain objects only.', { path });
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new MetaPayloadPoisonError('META_PAYLOAD_SECRET_FIELD_FORBIDDEN', 'Payload contains a forbidden secret-like field.', { path: `${path}.${key}` });
    }
    assertJsonSafe(item, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableNormalize(item)]),
    );
  }
  return value;
}

export function stableSerializeMetaPayload(payload: MetaVersionedPayload): string {
  assertMetaVersionedPayload(payload);
  return JSON.stringify(stableNormalize(payload));
}

export function digestMetaVersionedPayload(payload: MetaVersionedPayload): string {
  return createHash('sha256').update(stableSerializeMetaPayload(payload)).digest('hex');
}

export function assertMetaVersionedPayload(
  payload: MetaVersionedPayload,
  options: { readonly maxBytes?: number } = {},
): void {
  if (!PAYLOAD_TYPE_PATTERN.test(payload.type)) {
    throw new MetaPayloadPoisonError('META_PAYLOAD_TYPE_INVALID', 'Payload type is invalid.');
  }
  if (!Number.isInteger(payload.schemaVersion) || payload.schemaVersion < 1 || payload.schemaVersion > 10_000) {
    throw new MetaPayloadPoisonError('META_PAYLOAD_VERSION_INVALID', 'Payload schema version is invalid.');
  }
  assertJsonSafe(payload.data, '$.data');
  const serialized = JSON.stringify(stableNormalize(payload));
  const bytes = Buffer.byteLength(serialized, 'utf8');
  const maxBytes = Math.max(1024, options.maxBytes ?? DEFAULT_MAX_PAYLOAD_BYTES);
  if (bytes > maxBytes) {
    throw new MetaPayloadPoisonError('META_PAYLOAD_TOO_LARGE', 'Payload exceeds the configured size limit.', { bytes, maxBytes });
  }
}

export function createMetaVersionedPayload<T>(input: {
  readonly type: string;
  readonly schemaVersion: number;
  readonly data: T;
  readonly maxBytes?: number;
}): MetaVersionedPayload<T> {
  const payload = {
    type: input.type.trim(),
    schemaVersion: input.schemaVersion,
    data: input.data,
  } as const;
  assertMetaVersionedPayload(payload, { maxBytes: input.maxBytes });
  return Object.freeze(payload);
}

export interface MetaPayloadCodec<T = unknown> {
  readonly type: string;
  readonly schemaVersion: number;
  readonly decode: (data: unknown) => T;
}

export class MetaPayloadCodecRegistry {
  private readonly codecs = new Map<string, MetaPayloadCodec>();

  register<T>(codec: MetaPayloadCodec<T>): this {
    const type = codec.type.trim();
    if (!PAYLOAD_TYPE_PATTERN.test(type) || !Number.isInteger(codec.schemaVersion) || codec.schemaVersion < 1) {
      throw new TypeError('META_PAYLOAD_CODEC_ID_INVALID');
    }
    const key = `${type}@${codec.schemaVersion}`;
    if (this.codecs.has(key)) throw new TypeError('META_PAYLOAD_CODEC_DUPLICATE');
    this.codecs.set(key, Object.freeze({ ...codec, type }));
    return this;
  }

  decode<T = unknown>(payload: MetaVersionedPayload): T {
    assertMetaVersionedPayload(payload);
    const key = `${payload.type}@${payload.schemaVersion}`;
    const codec = this.codecs.get(key);
    if (!codec) {
      throw new MetaPayloadPoisonError(
        'META_PAYLOAD_CODEC_NOT_FOUND',
        'No decoder is registered for this payload version.',
        { type: payload.type, schemaVersion: payload.schemaVersion },
      );
    }
    try {
      return codec.decode(payload.data) as T;
    } catch (error) {
      if (error instanceof MetaPayloadPoisonError) throw error;
      throw new MetaPayloadPoisonError('META_PAYLOAD_DECODE_FAILED', 'Payload decoder rejected the message.', {
        type: payload.type,
        schemaVersion: payload.schemaVersion,
        reason: error instanceof Error ? error.message : 'UNKNOWN',
      });
    }
  }
}
