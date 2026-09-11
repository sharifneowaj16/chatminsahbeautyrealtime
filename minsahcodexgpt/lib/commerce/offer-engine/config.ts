import type { DeliveryTierConfig, PromoRule } from './types';

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
 * Global Store Promotion Feature Flag
 * Set to false to disable coupon codes across the storefront (hides input and stops coupon discounts).
 * Set to true to re-enable coupon vouchers for seasonal campaigns (e.g. Eid).
 */
export const ENABLE_PROMO_COUPONS = false;

/**
 * Universal Promo Code Catalog
 * Integrates all active marketing vouchers into a single verified registry.
 */
export const PROMO_CATALOG: Record<string, PromoRule> = {
  WELCOME10: {
    code: 'WELCOME10',
    type: 'percentage',
    value: 0.1, // 10% off
    minSubtotal: 500,
    description: '10% off on your first order over ৳500',
    allowOnBundles: false,
  },
  SAVE10: {
    code: 'SAVE10',
    type: 'percentage',
    value: 0.1,
    minSubtotal: 500,
    description: '10% discount on entire order over ৳500',
    allowOnBundles: false,
  },
  SAVE20: {
    code: 'SAVE20',
    type: 'percentage',
    value: 0.2,
    minSubtotal: 800,
    description: '20% discount on entire order over ৳800',
    allowOnBundles: false,
  },
  FIRST50: {
    code: 'FIRST50',
    type: 'flat',
    value: 50,
    minSubtotal: 500,
    description: 'Flat ৳50 off on first order over ৳500',
    allowOnBundles: false,
  },
  MINSAH10: {
    code: 'MINSAH10',
    type: 'percentage',
    value: 0.1,
    minSubtotal: 500,
    description: '10% exclusive store discount over ৳500',
    allowOnBundles: false,
  },
  WELCOME: {
    code: 'WELCOME',
    type: 'flat',
    value: 100,
    minSubtotal: 1000,
    description: 'Flat ৳100 welcome credit on orders over ৳1000',
    allowOnBundles: false,
  },
};
