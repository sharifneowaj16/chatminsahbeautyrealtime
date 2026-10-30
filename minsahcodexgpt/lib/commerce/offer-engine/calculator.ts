import { DELIVERY_CONFIG } from './config';
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
  const {
    items = [],
    subtotal = 0,
    promoCode,
    destinationCity,
    availableCoupons,
    couponsEnabled = true,
  } = params;

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

  // 2. Resolve Promo Coupon (Strictly from live Admin Offer Engine coupons)
  let promoDiscount = 0;
  let appliedPromoRule: PromoRule | null = null;
  let promoError: string | null = null;

  if (promoCode && promoCode.trim()) {
    if (couponsEnabled === false) {
      promoError = 'Promo vouchers are currently disabled';
    } else {
      const normalizedCode = promoCode.trim().toUpperCase();

      // Look up strictly in live availableCoupons from Admin Offer Engine
      let rule: PromoRule | null = null;
      if (Array.isArray(availableCoupons) && availableCoupons.length > 0) {
        rule = availableCoupons.find((c) => c && c.code && c.code.trim().toUpperCase() === normalizedCode) ?? null;
      }

      const now = Date.now();
      let isDateValid = true;
      if (rule?.startDate) {
        const start = new Date(rule.startDate).getTime();
        if (!isNaN(start) && now < start) {
          isDateValid = false;
        }
      }
      if (isDateValid && rule?.endDate) {
        const end = new Date(rule.endDate).getTime();
        if (!isNaN(end) && now > end) {
          isDateValid = false;
        }
      }

      if (!rule || rule.isActive === false || !isDateValid) {
        promoError = 'Invalid or expired promo code';
      } else if (rule.minSubtotal && subtotal < rule.minSubtotal) {
        promoError = `Minimum subtotal of ৳${rule.minSubtotal} required for ${rule.code}`;
      } else {
        const applicableBase = rule.allowOnBundles ? subtotal : nonBundleSubtotal;

        if (applicableBase <= 0 && bundleSubtotal > 0 && !rule.allowOnBundles && rule.code !== 'FREESHIP') {
          // Items are all promotional bundles with already applied discounts
          promoError = `${rule.code} cannot be applied to promotional bundles`;
          promoDiscount = 0;
        } else {
          appliedPromoRule = rule;

          if (rule.type === 'percentage') {
            const rawRate = Number(rule.value) || 0;
            const rate = rawRate > 1 ? rawRate / 100 : rawRate;
            promoDiscount = Math.round(applicableBase * rate);
          } else {
            promoDiscount = Math.min(Number(rule.value) || 0, applicableBase);
          }

          if (rule.maxDiscount && promoDiscount > rule.maxDiscount) {
            promoDiscount = rule.maxDiscount;
          }

          // Keep at least 1 taka payable subtotal so promo discounts can never make total 0
          const maxApplicableDiscount = Math.max(0, subtotal - 1);
          promoDiscount = Math.max(0, Math.min(promoDiscount, maxApplicableDiscount));
        }
      }
    }
  }

  // 3. Free Delivery Evaluation
  const targetThreshold =
    params.freeDeliveryConfig?.nationwideThreshold ??
    DELIVERY_CONFIG.NATIONWIDE_THRESHOLD;
  const dhakaThreshold =
    params.freeDeliveryConfig?.dhakaThreshold ??
    DELIVERY_CONFIG.DHAKA_METRO_THRESHOLD;

  const isCityDhaka =
    typeof destinationCity === 'string' &&
    destinationCity.toLowerCase().includes('dhaka');

  const isFreeDeliveryUnlocked =
    hasProductFreeDelivery ||
    subtotal >= targetThreshold ||
    (isCityDhaka && subtotal >= dhakaThreshold) ||
    Boolean(appliedPromoRule?.code === 'FREESHIP');

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
