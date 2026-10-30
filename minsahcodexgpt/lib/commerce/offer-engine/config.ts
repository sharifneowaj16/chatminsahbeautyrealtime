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
 * Enabled so promo coupons can be evaluated dynamically.
 */
export const ENABLE_PROMO_COUPONS = true;

/**
 * Universal Promo Code Catalog
 * Integrates active marketing vouchers with placements and normalized discounts.
 */
export const PROMO_CATALOG: Record<string, PromoRule> = {
  WELCOME10: {
    code: 'WELCOME10',
    type: 'percentage',
    value: 10, // 10% off
    minSubtotal: 500,
    description: '10% off on your first order over ৳500',
    allowOnBundles: false,
    isActive: true,
    placements: ['cart_drawer', 'checkout_page', 'offers_page'],
    badgeText: '10% OFF',
    bannerText: 'Get 10% OFF on your first order over ৳500',
  },
  SAVE10: {
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    minSubtotal: 500,
    description: '10% discount on entire order over ৳500',
    allowOnBundles: false,
    isActive: true,
    placements: ['cart_drawer', 'checkout_page'],
    badgeText: '10% OFF',
  },
  SAVE20: {
    code: 'SAVE20',
    type: 'percentage',
    value: 20,
    minSubtotal: 800,
    description: '20% discount on entire order over ৳800',
    allowOnBundles: false,
    isActive: true,
    placements: ['cart_drawer', 'checkout_page'],
    badgeText: '20% OFF',
  },
  FIRST50: {
    code: 'FIRST50',
    type: 'flat',
    value: 50,
    minSubtotal: 500,
    description: 'Flat ৳50 off on first order over ৳500',
    allowOnBundles: false,
    isActive: true,
    placements: ['cart_drawer', 'checkout_page'],
    badgeText: '৳50 OFF',
  },
  MINSAH10: {
    code: 'MINSAH10',
    type: 'percentage',
    value: 10,
    minSubtotal: 500,
    description: '10% exclusive store discount over ৳500',
    allowOnBundles: false,
    isActive: true,
    placements: ['top_bar', 'home_banner', 'shop_banner'],
    badgeText: '10% OFF',
    bannerText: '10% OFF with code MINSAH10 on orders over ৳500',
  },
  WELCOME: {
    code: 'WELCOME',
    type: 'flat',
    value: 100,
    minSubtotal: 1000,
    description: 'Flat ৳100 welcome credit on orders over ৳1000',
    allowOnBundles: false,
    isActive: true,
    placements: ['offers_page'],
    badgeText: '৳100 OFF',
  },
  FREESHIP: {
    code: 'FREESHIP',
    type: 'flat',
    value: 0,
    minSubtotal: 1000,
    description: 'Free shipping on orders over ৳1000',
    allowOnBundles: true,
    isActive: true,
    placements: ['cart_drawer', 'checkout_page'],
    badgeText: 'FREE DELIVERY',
  },
};
