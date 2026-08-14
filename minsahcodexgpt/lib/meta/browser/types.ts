import type { TrackingDecision } from '@/lib/privacy/consent-types';
import type { TrackingEventData } from '@/types/tracking';

export type MetaBrowserEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'ViewCart'
  | 'InitiateCheckout'
  | 'AddShippingInfo'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'Subscribe'
  | 'StartTrial'
  | 'SubmitApplication';

export type MetaBrowserCommerceEventName =
  | 'ViewContent'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'ViewCart'
  | 'InitiateCheckout'
  | 'AddShippingInfo'
  | 'AddPaymentInfo'
  | 'Purchase';

export type MetaBrowserValidationIssue = {
  code: string;
  field: string;
  message: string;
};

export type MetaBrowserValidationResult = {
  valid: boolean;
  issues: MetaBrowserValidationIssue[];
};

export type MetaBrowserEventEnvelope = {
  eventName: MetaBrowserEventName;
  eventId: string;
  payload: TrackingEventData;
  validation: MetaBrowserValidationResult;
  policyDecision: TrackingDecision;
};

export type MetaBrowserDispatchOptions = {
  sendCapi?: boolean;
  maxReadyAttempts?: number;
  retryDelayMs?: number;
};

export type MetaBrowserDispatchResult = {
  fired: boolean;
  capiRequested: boolean;
  reason?:
    | 'CONSENT_BLOCKED'
    | 'INVALID_EVENT'
    | 'PIXEL_UNAVAILABLE'
    | 'UNSUPPORTED_CAPI_EVENT';
};

export type MetaBrowserCapiRequest = {
  eventName: MetaBrowserEventName;
  eventId: string;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
  externalId?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: 'product' | 'product_group';
  contentName?: string;
  contentCategory?: string;
  contents?: TrackingEventData['contents'];
  numItems?: number;
  orderId?: string;
  searchString?: string;
  status?: string;
  method?: string;
  shippingTier?: string;
  checkoutStep?: string;
  policyVersion: string;
  policyReason: string;
  consentState: string;
  consentVersion?: string | null;
  retentionUntil: string;
};
