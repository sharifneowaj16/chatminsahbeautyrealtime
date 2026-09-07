import { DELIVERY_CONFIG, PROMO_CATALOG } from './config';
import type {
  CartOfferCalculationParams,
  CartOfferCalculationResult,
  PromoRule,
} from './types';

/**
 * Universal Offer & Anti-Conflict Calculation Engine
 * 
 * Rules:
 * 1. Bundles have built-in profit-sharing discounts (15%-30% via Real Benefit engine).
 *    Coupons apply strictly to regular (non-bundle) items by default to prevent double-discounting margin loss.
 * 2. Nationwide Free Delivery is unlocked when subtotal >= ৳1,100 or when any item has active product free delivery.
 * 3. Inside Dhaka Metro, orders >= ৳500 qualify for free delivery.
 */
export function calculateCartOffers(
  params: CartOfferCalculationParams
): CartOfferCalculationResult {
  const { items = [], subtotal = 0, promoCode, destinationCity } = params;

  // 1. Differentiate bundle items vs regular items
  let bundleSubtotal = 0;
  let nonBundleSubtotal = 0;
  let hasProductFreeDelivery = false;

  for (const item of items) {
    const isBundle = Boolean(
      item.isBundle ||
      (typeof item.bundleId === 'string' && item.bundleId.length > 0) ||
      (typeof item.id === 'string' && item.id.startsWith('bundle-'))
    );
    const lineTotal = (item.price || 0) * (item.quantity || 1);

    if (isBundle) {
      bundleSubtotal += lineTotal;
    } else {
      nonBundleSubtotal += lineTotal;
    }

    if (item.hasFreeDelivery) {
      hasProductFreeDelivery = true;
    }
  }

  // 2. Resolve Promo Coupon
  let promoDiscount = 0;
  let appliedPromoRule: PromoRule | null = null;
  let promoError: string | null = null;

  if (promoCode && promoCode.trim()) {
    const normalizedCode = promoCode.trim().toUpperCase();
    const rule = PROMO_CATALOG[normalizedCode];

    if (!rule) {
      promoError = 'Invalid or expired promo code';
    } else if (rule.minSubtotal && subtotal < rule.minSubtotal) {
      promoError = `Minimum subtotal of ৳${rule.minSubtotal} required for ${rule.code}`;
    } else {
      appliedPromoRule = rule;
      const applicableBase = rule.allowOnBundles ? subtotal : nonBundleSubtotal;

      if (applicableBase <= 0 && bundleSubtotal > 0 && !rule.allowOnBundles) {
        // Items are all promotional bundles with already applied discounts
        promoDiscount = 0;
      } else if (rule.type === 'percentage') {
        promoDiscount = Math.round(applicableBase * rule.value);
      } else {
        promoDiscount = Math.min(rule.value, applicableBase);
      }

      if (rule.maxDiscount && promoDiscount > rule.maxDiscount) {
        promoDiscount = rule.maxDiscount;
      }

      promoDiscount = Math.max(0, Math.min(promoDiscount, subtotal));
    }
  }

  // 3. Free Delivery Evaluation
  const targetThreshold = DELIVERY_CONFIG.NATIONWIDE_THRESHOLD;
  const isCityDhaka =
    typeof destinationCity === 'string' &&
    destinationCity.toLowerCase().includes('dhaka');

  const isFreeDeliveryUnlocked =
    hasProductFreeDelivery ||
    subtotal >= targetThreshold ||
    (isCityDhaka && subtotal >= DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD);

  const remainingForFreeDelivery = isFreeDeliveryUnlocked
    ? 0
    : Math.max(0, targetThreshold - subtotal);

  const deliveryProgressPercent = isFreeDeliveryUnlocked
    ? 100
    : Math.min(100, Math.round((subtotal / targetThreshold) * 100));

  return {
    promoDiscount,
    appliedPromoRule,
    promoError,
    isFreeDeliveryUnlocked,
    remainingForFreeDelivery,
    deliveryProgressPercent,
    nonBundleSubtotal,
    bundleSubtotal,
  };
}
