import {
  getMetaProviderRetryDelayMs,
  META_PROVIDER_MAX_ATTEMPTS,
} from '@/lib/jobs/retry-policy';

export const META_OUTBOX_MAX_ATTEMPTS = META_PROVIDER_MAX_ATTEMPTS;

export function getMetaOutboxRetryDelayMs(attempt: number, error?: unknown) {
  return getMetaProviderRetryDelayMs(attempt, error);
}
