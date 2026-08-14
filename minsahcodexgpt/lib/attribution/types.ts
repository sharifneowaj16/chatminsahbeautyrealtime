export type AttributionUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

export type AttributionTouch = {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  landingPage?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  capturedAt: string;
  direct: boolean;
};

export type AttributionCaptureInput = {
  sessionId?: string;
  visitorId?: string;
  customerId?: string;
  landingPage?: string;
  utm?: AttributionUtm;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  capturedAt?: string;
  consentState?: string;
};

export type NormalizedAttributionCapture = {
  attributionKey: string;
  sessionId?: string;
  visitorId?: string;
  customerId?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
  capturedAt: Date;
  consentState: string;
  touch: AttributionTouch;
};

export type AttributionCoverage = {
  windowDays: number;
  totalOrders: number;
  attributedOrders: number;
  unattributedOrders: number;
  coverage: number | null;
  withFbp: number;
  withFbc: number;
  consentDenied: number;
  leadLinkedOrders: number;
};

export type AttributionCampaignRow = {
  sourceModel: 'FIRST_PARTY' | 'META_REPORTED';
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  sessions: number;
  leads: number;
  orders: number;
  revenue: number;
  attributedOrders: number;
};
