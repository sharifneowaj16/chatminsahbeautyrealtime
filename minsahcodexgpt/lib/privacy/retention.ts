import type { TrackingEventCategory } from './consent-types';
import { TRACKING_POLICY, trackingRetentionUntil } from './tracking-policy';

export type RetentionTarget =
  | 'META_EVENT_OUTBOX'
  | 'META_FAILURE_LOG'
  | 'META_LEAD_RAW_PAYLOAD'
  | 'TRACKING_CONSENT_RECORD'
  | 'DELETION_AUDIT';

export function retentionUntilForTarget(target: RetentionTarget, now = new Date()) {
  if (target === 'META_FAILURE_LOG') {
    const result = new Date(now);
    result.setUTCDate(result.getUTCDate() + TRACKING_POLICY.retentionDays.FAILURE_LOG);
    return result;
  }
  if (target === 'DELETION_AUDIT') {
    const result = new Date(now);
    result.setUTCDate(result.getUTCDate() + TRACKING_POLICY.retentionDays.DELETION_AUDIT);
    return result;
  }
  const category: TrackingEventCategory = target === 'TRACKING_CONSENT_RECORD' ? 'ESSENTIAL' : 'ADVERTISING';
  return trackingRetentionUntil(category, now);
}

export function isRetentionExpired(retentionUntil: Date | string | null | undefined, now = new Date()) {
  if (!retentionUntil) return true;
  const value = retentionUntil instanceof Date ? retentionUntil : new Date(retentionUntil);
  return Number.isNaN(value.getTime()) || value.getTime() <= now.getTime();
}
