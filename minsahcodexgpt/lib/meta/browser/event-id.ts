import type { MetaBrowserEventName } from './types';

const EVENT_ID_MAX_LENGTH = 100;
const EVENT_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

function cleanEventName(eventName: MetaBrowserEventName | string) {
  return String(eventName).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'MetaEvent';
}

function randomToken() {
  const runtimeCrypto = globalThis.crypto;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID().replace(/-/g, '');
  }
  return `${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

export function createMetaBrowserEventId(
  eventName: MetaBrowserEventName,
  now = Date.now()
): string {
  return `${cleanEventName(eventName)}-${now}-${randomToken()}`.slice(0, EVENT_ID_MAX_LENGTH);
}

export function isValidMetaBrowserEventId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    value.length <= EVENT_ID_MAX_LENGTH &&
    EVENT_ID_PATTERN.test(value)
  );
}

export function resolveMetaBrowserEventId(
  eventName: MetaBrowserEventName,
  provided?: string | null
): string {
  const normalized = provided?.trim();
  return isValidMetaBrowserEventId(normalized)
    ? normalized
    : createMetaBrowserEventId(eventName);
}
