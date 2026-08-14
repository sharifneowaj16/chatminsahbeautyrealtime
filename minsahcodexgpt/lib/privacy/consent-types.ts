export const TRACKING_POLICY_VERSION = 'meta-v6-2026-07-17.1' as const;

export type TrackingConsentState = 'UNKNOWN' | 'GRANTED' | 'DENIED' | 'WITHDRAWN';
export type TrackingEventCategory = 'ESSENTIAL' | 'ANALYTICS' | 'ADVERTISING';
export type TrackingDecisionReason =
  | 'ESSENTIAL_PROCESSING'
  | 'CONSENT_GRANTED'
  | 'CONSENT_UNKNOWN'
  | 'CONSENT_DENIED'
  | 'CONSENT_WITHDRAWN'
  | 'INTERNAL_TRAFFIC'
  | 'TEST_TRAFFIC'
  | 'BOT_TRAFFIC'
  | 'DELETION_REQUESTED'
  | 'IDENTITY_SUPPRESSED'
  | 'POLICY_DISABLED';

export type TrackingDecision = {
  allowPixel: boolean;
  allowCapiEvent: boolean;
  allowAdvancedMatching: boolean;
  allowedUserDataFields: string[];
  reason: TrackingDecisionReason;
  policyVersion: string;
  consentState: TrackingConsentState;
  consentVersion: string | null;
  eventCategory: TrackingEventCategory;
  retentionUntil: string;
};

export type TrackingDecisionInput = {
  consentState?: TrackingConsentState | string | null;
  consentVersion?: string | null;
  eventCategory?: TrackingEventCategory;
  eventName?: string | null;
  internalTraffic?: boolean;
  testTraffic?: boolean;
  botTraffic?: boolean;
  deletionRequested?: boolean;
  identitySuppressed?: boolean;
  policyEnabled?: boolean;
  now?: Date;
};
