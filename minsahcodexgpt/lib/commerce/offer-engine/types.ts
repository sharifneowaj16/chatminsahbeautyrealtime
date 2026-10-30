export type PromoDiscountType = 'percentage' | 'flat';

export type OfferPlacement =
  | 'top_bar'
  | 'home_banner'
  | 'shop_banner'
  | 'product_page'
  | 'offers_page'
  | 'cart_drawer'
  | 'checkout_page'
  | 'account_dashboard';

export interface PromoRule {
  code: string;
  type: PromoDiscountType;
  value: number; // percentage (e.g. 10 for 10% or 0.1) or flat amount in BDT
  description: string;
  minSubtotal?: number;
  maxDiscount?: number;
  /**
   * If false, coupon discount applies only to non-bundle items.
   * Defaults to false to prevent double-discounting bundles.
   */
  allowOnBundles?: boolean;
  isActive?: boolean;
  placements?: OfferPlacement[];
  badgeText?: string;
  bannerText?: string;
}

export interface DeliveryTierConfig {
  NATIONWIDE_THRESHOLD: number;
  DHAKA_METRO_THRESHOLD: number;
  OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD: number;
  OUTSIDE_DHAKA_SUBSIDIZED_FEE: number;
}

export interface BundleConfig {
  enabled: boolean;
  twoStepDiscountPercent: number;
  threeStepDiscountPercent: number;
  fourStepDiscountPercent: number;
  estimatedCostRatio: number;
  inheritFreeDelivery?: boolean;
}

export interface UniversalOfferConfig {
  freeDelivery: {
    nationwideThreshold: number;
    dhakaThreshold: number;
    outsideDhakaSubsidizedThreshold?: number;
    outsideDhakaSubsidizedFee?: number;
  };
  coupons: PromoRule[];
  bundles: BundleConfig;
  antiConflict: {
    strictAntiStacking: boolean;
    maxCartDiscountCap?: number;
  };
  topBar?: {
    enabled: boolean;
    message1: { text: string; backgroundColor: string; textColor: string; active: boolean };
    message2: { text: string; backgroundColor: string; textColor: string; active: boolean };
    message3: { text: string; backgroundColor: string; textColor: string; active: boolean };
  };
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
  freeDeliveryConfig?: {
    nationwideThreshold?: number;
    dhakaThreshold?: number;
  } | null;
  availableCoupons?: PromoRule[] | null;
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
