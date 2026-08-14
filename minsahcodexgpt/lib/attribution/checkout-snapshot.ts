import type { AttributionTouch } from './types';

export type OrderAttributionSnapshotInput = {
  orderId: string;
  customerId?: string | null;
  visitorId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  landingPage?: string | null;
  consentState?: string | null;
  total?: number | string | null;
  currency?: string | null;
  createdAt?: Date;
};

export function buildCheckoutSnapshot(input: OrderAttributionSnapshotInput) {
  const convertedAt = input.createdAt ?? new Date();
  const touch: AttributionTouch = {
    source: input.utmSource?.trim() || 'direct',
    medium: input.utmMedium?.trim() || 'none',
    campaign: input.utmCampaign?.trim() || 'unattributed',
    ...(input.utmTerm?.trim() && { term: input.utmTerm.trim() }),
    ...(input.utmContent?.trim() && { content: input.utmContent.trim() }),
    ...(input.landingPage?.trim() && { landingPage: input.landingPage.trim() }),
    ...(input.fbc?.trim() && { fbc: input.fbc.trim() }),
    ...(input.fbp?.trim() && { fbp: input.fbp.trim() }),
    capturedAt: convertedAt.toISOString(),
    direct: !input.utmSource && !input.utmCampaign && !input.fbc,
  };
  return {
    touch,
    snapshot: {
      orderId: input.orderId,
      visitorId: input.visitorId ?? null,
      customerId: input.customerId ?? null,
      consentState: input.consentState ?? 'UNKNOWN',
      conversionValue: input.total == null ? null : Number(input.total),
      currency: input.currency?.trim().toUpperCase() || 'BDT',
      convertedAt: convertedAt.toISOString(),
    },
  };
}
