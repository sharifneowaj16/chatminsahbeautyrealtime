import { validateMetaValueCurrency } from './custom-data';
import {
  META_EVENT_MAX_AGE_SECONDS,
  META_EVENT_MAX_FUTURE_SKEW_SECONDS,
  type MetaWebsiteServerEvent,
} from './types';

export type MetaCapiValidationIssue = {
  code: string;
  field: string;
  message: string;
};

export type MetaCapiValidationResult = {
  valid: boolean;
  issues: MetaCapiValidationIssue[];
  normalizedEventSourceUrl?: string;
};

export function normalizeMetaEventSourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    url.search = '';
    url.hash = '';
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

export function validateMetaWebsiteEvent(
  event: MetaWebsiteServerEvent,
  nowSeconds = Math.floor(Date.now() / 1000)
): MetaCapiValidationResult {
  const issues: MetaCapiValidationIssue[] = [];
  if (!event.event_name?.trim()) {
    issues.push({ code: 'EVENT_NAME_REQUIRED', field: 'event_name', message: 'event_name is required.' });
  }
  if (!event.event_id?.trim()) {
    issues.push({ code: 'EVENT_ID_REQUIRED', field: 'event_id', message: 'event_id is required.' });
  }
  if (!Number.isInteger(event.event_time) || event.event_time <= 0) {
    issues.push({ code: 'EVENT_TIME_INVALID', field: 'event_time', message: 'event_time must be a positive Unix timestamp.' });
  } else {
    if (nowSeconds - event.event_time > META_EVENT_MAX_AGE_SECONDS) {
      issues.push({ code: 'EVENT_TIME_TOO_OLD', field: 'event_time', message: 'Meta website events cannot be older than seven days.' });
    }
    if (event.event_time - nowSeconds > META_EVENT_MAX_FUTURE_SKEW_SECONDS) {
      issues.push({ code: 'EVENT_TIME_IN_FUTURE', field: 'event_time', message: 'event_time exceeds the allowed future clock skew.' });
    }
  }
  if (event.action_source !== 'website') {
    issues.push({ code: 'ACTION_SOURCE_INVALID', field: 'action_source', message: 'Website events require action_source=website.' });
  }
  const normalizedEventSourceUrl = normalizeMetaEventSourceUrl(event.event_source_url);
  if (!normalizedEventSourceUrl) {
    issues.push({ code: 'EVENT_SOURCE_URL_INVALID', field: 'event_source_url', message: 'Website events require an absolute http(s) event_source_url.' });
  }
  if (!event.user_data || typeof event.user_data !== 'object') {
    issues.push({ code: 'USER_DATA_REQUIRED', field: 'user_data', message: 'user_data is required.' });
  }
  if (!event.custom_data || typeof event.custom_data !== 'object') {
    issues.push({ code: 'CUSTOM_DATA_REQUIRED', field: 'custom_data', message: 'custom_data is required.' });
  } else {
    for (const code of validateMetaValueCurrency(event.custom_data)) {
      issues.push({ code, field: 'custom_data', message: code });
    }
  }
  return { valid: issues.length === 0, issues, normalizedEventSourceUrl };
}

export function assertMetaWebsiteEvent(event: MetaWebsiteServerEvent, nowSeconds?: number) {
  const result = validateMetaWebsiteEvent(event, nowSeconds);
  if (!result.valid) {
    const error = new Error(result.issues.map((issue) => issue.code).join(','));
    error.name = 'MetaCapiValidationError';
    throw error;
  }
  return {
    ...event,
    event_source_url: result.normalizedEventSourceUrl ?? event.event_source_url,
  };
}
