export type PromoDiscountType = 'percentage' | 'flat';

export interface PromoRule {
  code: string;
  type: PromoDiscountType;
  value: number; // 0.1 for 10%, or 50 for ৳50
  description: string;
  minSubtotal?: number;
  maxDiscount?: number;
  /**
   * If false, coupon discount applies only to non-bundle items.
   * Defaults to false to prevent double-discounting bundles.
   */
  allowOnBundles?: boolean;
}

export interface DeliveryTierConfig {
  NATIONWIDE_THRESHOLD: number;
  DHAKA_METRO_THRESHOLD: number;
  OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD: number;
  OUTSIDE_DHAKA_SUBSIDIZED_FEE: number;
}

export interface CartOfferCalculationItem {
  id: string;
  price: number;
  quantity: number;
  isBundle?: boolean | null;
  bundleId?: string | null;
  hasFreeDelivery?: boolean | null;
}

export interface CartOfferCalculationParams {
  items: CartOfferCalculationItem[];
  subtotal: number;
  promoCode?: string | null;
  destinationCity?: string | null;
  isNewCustomer?: boolean;
}

export interface CartOfferCalculationResult {
  promoDiscount: number;
  appliedPromoRule: PromoRule | null;
  promoError: string | null;
  isFreeDeliveryUnlocked: boolean;
  remainingForFreeDelivery: number;
  deliveryProgressPercent: number;
  nonBundleSubtotal: number;
  bundleSubtotal: number;
}
