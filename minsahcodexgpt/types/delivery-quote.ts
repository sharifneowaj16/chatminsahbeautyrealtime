export type DeliveryOfferType = 'DEFAULT' | 'FREE' | 'FIXED';

export type DeliveryPricingSource =
  | 'DEFAULT'
  | 'PATHAO'
  | 'STEADFAST'
  | 'PRODUCT_OFFER'
  | 'MANUAL'
  | 'FALLBACK';

export type AppliedDeliveryOfferQuote = {
  productId: string;
  productName: string | null;
  type: DeliveryOfferType;
  amount: number | null;
  badgeText: string | null;
};

export type DeliveryQuoteResponse = {
  /** Backward-compatible customer-facing delivery charge. */
  shippingCharge?: number;
  /** Customer-facing delivery charge after product delivery offers are applied. */
  customerDeliveryCharge?: number;
  /** Internal courier quote/cost. Do not show this as customer payable charge. */
  courierDeliveryCharge?: number;
  /** Customer savings/subsidy from product-level delivery offer. */
  deliveryDiscountAmount?: number;
  deliveryPricingSource?: DeliveryPricingSource;
  deliveryOfferType?: DeliveryOfferType;
  deliveryOfferProductId?: string | null;
  deliveryOfferBadgeText?: string | null;
  appliedDeliveryOffer?: AppliedDeliveryOfferQuote | null;
  error?: string;
  message?: string;
};
