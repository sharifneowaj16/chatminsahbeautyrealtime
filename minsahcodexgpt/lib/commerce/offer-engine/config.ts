import type { DeliveryTierConfig, PromoRule, BundleConfig } from './types';

/**
 * Universal Delivery Rules Configuration
 * - Canonical nationwide free delivery threshold: ৳1,100
 * - Tiered Dhaka Metro threshold: ৳500
 * - Tiered Outside Dhaka subsidized threshold: ৳500 (৳60 delivery charge)
 */
export const DELIVERY_CONFIG: DeliveryTierConfig = {
  NATIONWIDE_THRESHOLD: 1100,
  DHAKA_METRO_THRESHOLD: 500,
  OUTSIDE_DHAKA_SUBSIDIZED_THRESHOLD: 500,
  OUTSIDE_DHAKA_SUBSIDIZED_FEE: 60,
};

/**
 * Default Bundle Configuration
 */
export const DEFAULT_BUNDLE_CONFIG: BundleConfig = {
  enabled: true,
  twoStepDiscountPercent: 15,
  threeStepDiscountPercent: 25,
  fourStepDiscountPercent: 30,
  estimatedCostRatio: 60,
  inheritFreeDelivery: true,
};

/**
 * Global Store Promotion Feature Flag
 * Deprecated: Control is now live via Admin Offer Engine (couponsEnabled).
 */
export const ENABLE_PROMO_COUPONS = true;

/**
 * Universal Promo Code Catalog
 * Empty by default - All active coupons are fetched dynamically from Admin's Universal Offer Engine.
 */
export const PROMO_CATALOG: Record<string, PromoRule> = {};
