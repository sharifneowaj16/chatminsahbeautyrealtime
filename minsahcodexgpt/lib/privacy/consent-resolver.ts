import {
  TRACKING_POLICY_VERSION,
  type TrackingConsentState,
  type TrackingDecision,
  type TrackingDecisionInput,
  type TrackingDecisionReason,
  type TrackingEventCategory,
} from './consent-types';
import { TRACKING_POLICY, trackingRetentionUntil } from './tracking-policy';

const ADVERTISING_EVENTS = new Set([
  'PageView', 'ViewContent', 'Search', 'AddToWishlist', 'AddToCart', 'ViewCart',
  'InitiateCheckout', 'AddShippingInfo', 'AddPaymentInfo', 'Purchase', 'Lead',
  'CompleteRegistration', 'Contact', 'Subscribe', 'StartTrial', 'SubmitApplication',
]);

export function normalizeConsentState(value: unknown): TrackingConsentState {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'GRANTED') return 'GRANTED';
  if (normalized === 'DENIED') return 'DENIED';
  if (normalized === 'WITHDRAWN') return 'WITHDRAWN';
  return 'UNKNOWN';
}

export function classifyTrackingEventCategory(
  eventName?: string | null,
  explicit?: TrackingEventCategory
): TrackingEventCategory {
  if (explicit) return explicit;
  return eventName && ADVERTISING_EVENTS.has(eventName) ? 'ADVERTISING' : 'ANALYTICS';
}

function blockingReason(input: TrackingDecisionInput, state: TrackingConsentState): TrackingDecisionReason | null {
  if (input.deletionRequested) return 'DELETION_REQUESTED';
  if (input.identitySuppressed) return 'IDENTITY_SUPPRESSED';
  if (input.testTraffic) return 'TEST_TRAFFIC';
  if (input.internalTraffic) return 'INTERNAL_TRAFFIC';
  if (input.botTraffic) return 'BOT_TRAFFIC';
  if (input.policyEnabled === false) return 'POLICY_DISABLED';
  if (state === 'WITHDRAWN') return 'CONSENT_WITHDRAWN';
  if (state === 'DENIED') return 'CONSENT_DENIED';
  if (state === 'UNKNOWN') return 'CONSENT_UNKNOWN';
  return null;
}

export function resolveTrackingDecision(input: TrackingDecisionInput): TrackingDecision {
  const now = input.now ?? new Date();
  const consentState = normalizeConsentState(input.consentState);
  const eventCategory = classifyTrackingEventCategory(input.eventName, input.eventCategory);

  if (eventCategory === 'ESSENTIAL') {
    return {
      allowPixel: false,
      allowCapiEvent: true,
      allowAdvancedMatching: false,
      allowedUserDataFields: [],
      reason: 'ESSENTIAL_PROCESSING',
      policyVersion: TRACKING_POLICY_VERSION,
      consentState,
      consentVersion: input.consentVersion?.trim() || null,
      eventCategory,
      retentionUntil: trackingRetentionUntil(eventCategory, now).toISOString(),
    };
  }

  const blocked = blockingReason(input, consentState);
  const granted = consentState === 'GRANTED' && Boolean(input.consentVersion?.trim());
  const allowed = !blocked && granted;
  const reason: TrackingDecisionReason = allowed ? 'CONSENT_GRANTED' : blocked ?? 'CONSENT_UNKNOWN';

  return {
    allowPixel: allowed && TRACKING_POLICY.pixelEnabled,
    allowCapiEvent: allowed && TRACKING_POLICY.capiEnabled,
    allowAdvancedMatching: allowed && TRACKING_POLICY.advancedMatchingEnabled,
    allowedUserDataFields: allowed
      ? [
          ...TRACKING_POLICY.hashedUserDataFields,
          ...TRACKING_POLICY.browserIdentityFields,
          ...TRACKING_POLICY.transportContextFields,
        ]
      : [],
    reason,
    policyVersion: TRACKING_POLICY.version,
    consentState,
    consentVersion: input.consentVersion?.trim() || null,
    eventCategory,
    retentionUntil: trackingRetentionUntil(eventCategory, now).toISOString(),
  };
}

export function policyMetadata(decision: TrackingDecision) {
  return {
    policy_version: decision.policyVersion,
    policy_reason: decision.reason,
    consent_state: decision.consentState,
    consent_version: decision.consentVersion,
    event_category: decision.eventCategory,
    allow_advanced_matching: decision.allowAdvancedMatching,
    retention_until: decision.retentionUntil,
  };
}
