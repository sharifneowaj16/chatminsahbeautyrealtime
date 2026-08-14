import type { MetaBrowserEventEnvelope } from './types';

function enabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_META_TRACKING_DEBUG === 'true'
  );
}

function safeSummary(event?: MetaBrowserEventEnvelope) {
  if (!event) return undefined;
  return {
    eventName: event.eventName,
    eventId: event.eventId,
    contentIds: event.payload.content_ids,
    contentType: event.payload.content_type,
    value: event.payload.value,
    currency: event.payload.currency,
    valid: event.validation.valid,
    issueCodes: event.validation.issues.map((issue) => issue.code),
  };
}

export function metaBrowserDebug(
  level: 'debug' | 'warn' | 'error',
  message: string,
  event?: MetaBrowserEventEnvelope
) {
  if (!enabled()) return;
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.debug;
  logger(`[MetaBrowser] ${message}`, safeSummary(event));
}
