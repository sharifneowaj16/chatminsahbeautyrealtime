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

  // 1. Differentiate flash deals, bundles, and regular items (Master Spec Section 9.1)
  let flashDealSubtotal = 0;
  let bundleSubtotal = 0;
  let regularSubtotal = 0;
  let hasProductFreeDelivery = false;

  for (const item of items) {
    const isFlashDeal = item.pricingSource === 'FLASH_DEAL';
    const isBundle = !isFlashDeal && Boolean(
      item.isBundle ||
      item.pricingSource === 'BUNDLE' ||
      (typeof item.bundleId === 'string' && item.bundleId.length > 0) ||
      (typeof item.id === 'string' && item.id.startsWith('bundle-'))
    );
    const lineTotal = (item.price || 0) * (item.quantity || 1);

    if (isFlashDeal) {
      flashDealSubtotal += lineTotal;
    } else if (isBundle) {
      bundleSubtotal += lineTotal;
    } else {
      regularSubtotal += lineTotal;
    }

    if (item.hasFreeDelivery) {
      hasProductFreeDelivery = true;
    }
  }

  const nonBundleSubtotal = regularSubtotal;

  // 2. Resolve Promo Coupon (Strictly from live Admin Offer Engine coupons)
  // Anti-Stacking: Coupons apply strictly against regular items (and bundles only if allowOnBundles is true)
  // Flash Deal items are strictly ineligible for coupon discounts (Spec Section 9.1)
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
        const applicableBase = rule.allowOnBundles ? (regularSubtotal + bundleSubtotal) : regularSubtotal;

        if (applicableBase <= 0 && (flashDealSubtotal > 0 || bundleSubtotal > 0) && rule.code !== 'FREESHIP') {
          if (flashDealSubtotal > 0 && bundleSubtotal === 0) {
            promoError = 'Promo vouchers cannot be applied to Flash Deal items';
          } else {
            promoError = `${rule.code} cannot be applied to promotional bundles`;
          }
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

          // Keep at least 1 taka payable subtotal on applicableBase if cart is only regular items
          const maxApplicableDiscount = Math.max(0, applicableBase - (applicableBase === subtotal ? 1 : 0));
          promoDiscount = Math.max(0, Math.min(promoDiscount, maxApplicableDiscount));
        }
      }
    }
  }

  // 3. Free Delivery Evaluation (Master Spec Section 10.1: Flash Deals MUST count toward threshold)
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
    flashDealSubtotal,
    regularSubtotal,
  };
}
