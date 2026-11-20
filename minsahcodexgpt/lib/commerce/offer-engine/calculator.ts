import { DELIVERY_CONFIG } from './config';
import type {
  CartOfferCalculationParams,
  CartOfferCalculationResult,
  PromoRule,
} from './types';

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
    antiConflict,
  } = params;

  const strictAntiStacking = antiConflict?.strictAntiStacking !== false;
  const maxCartDiscountCap = Math.max(0, Number(antiConflict?.maxCartDiscountCap ?? 0) || 0);

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

  let promoDiscount = 0;
  let appliedPromoRule: PromoRule | null = null;
  let promoError: string | null = null;

  if (promoCode && promoCode.trim()) {
    if (couponsEnabled === false) {
      promoError = 'Promo vouchers are currently disabled';
    } else {
      const normalizedCode = promoCode.trim().toUpperCase();

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
        promoError = `Minimum subtotal of \u09F3${rule.minSubtotal} required for ${rule.code}`;
      } else {
        const isFreeShipCode = rule.type === 'free_shipping' || (rule.code.trim().toUpperCase() === 'FREESHIP' && (Number(rule.value) || 0) <= 0);
        const allowBundleDiscount = !strictAntiStacking && Boolean(rule.allowOnBundles);
        const applicableBase = allowBundleDiscount ? (regularSubtotal + bundleSubtotal) : regularSubtotal;

        if (applicableBase <= 0 && (flashDealSubtotal > 0 || bundleSubtotal > 0) && !isFreeShipCode) {
          if (flashDealSubtotal > 0 && bundleSubtotal === 0) {
            promoError = 'Promo vouchers cannot be applied to Flash Deal items';
          } else {
            promoError = `${rule.code} cannot be applied to promotional bundles`;
          }
          promoDiscount = 0;
        } else {
          appliedPromoRule = rule;

          if (isFreeShipCode) {
            promoDiscount = 0;
          } else if (rule.type === 'percentage') {
            const rawRate = Number(rule.value) || 0;
            const rate = rawRate > 1 ? rawRate / 100 : rawRate;
            promoDiscount = Math.round(applicableBase * rate);
          } else {
            promoDiscount = Math.min(Number(rule.value) || 0, applicableBase);
          }

          if (rule.maxDiscount && promoDiscount > rule.maxDiscount) {
            promoDiscount = rule.maxDiscount;
          }

          if (maxCartDiscountCap > 0 && promoDiscount > maxCartDiscountCap) {
            promoDiscount = maxCartDiscountCap;
          }

          const maxApplicableDiscount = Math.max(0, applicableBase - (applicableBase === subtotal ? 1 : 0));
          promoDiscount = Math.max(0, Math.min(promoDiscount, maxApplicableDiscount));
        }
      }
    }
  }

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
    Boolean(
      appliedPromoRule &&
        (appliedPromoRule.type === 'free_shipping' ||
          (appliedPromoRule.code.trim().toUpperCase() === 'FREESHIP' && (Number(appliedPromoRule.value) || 0) <= 0))
    );

  const remainingForFreeDelivery = isFreeDeliveryUnlocked
    ? 0
    : Math.max(0, targetThreshold - subtotal);

  const deliveryProgressPercent = isFreeDeliveryUnlocked
    ? 100
    : targetThreshold > 0
      ? Math.min(100, Math.round((subtotal / targetThreshold) * 100))
      : 100;

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
