import type { TrackingEventCategory } from './consent-types';
import { TRACKING_POLICY_VERSION } from './consent-types';

export const TRACKING_POLICY = Object.freeze({
  version: TRACKING_POLICY_VERSION,
  defaultConsentState: 'UNKNOWN' as const,
  unknownIsGranted: false,
  pixelEnabled: true,
  capiEnabled: true,
  advancedMatchingEnabled: true,
  retentionDays: Object.freeze({
    ESSENTIAL: 365,
    ANALYTICS: 180,
    ADVERTISING: 90,
    FAILURE_LOG: 30,
    DELETION_AUDIT: 2555,
  }),
  hashedUserDataFields: Object.freeze([
    'em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'external_id',
  ]),
  browserIdentityFields: Object.freeze(['fbc', 'fbp']),
  transportContextFields: Object.freeze(['client_ip_address', 'client_user_agent']),
});

export function retentionDaysForCategory(category: TrackingEventCategory) {
  return TRACKING_POLICY.retentionDays[category];
}

export function trackingRetentionUntil(category: TrackingEventCategory, now = new Date()) {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + retentionDaysForCategory(category));
  return value;
}
