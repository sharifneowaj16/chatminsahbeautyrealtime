import type { PrismaClient } from '@/generated/prisma/client';

type MoneyLike = number | string | null | undefined | { toString(): string };

type CouponRecord = {
  id: string;
  code: string;
  type: string;
  value: MoneyLike;
  minPurchase: MoneyLike;
  maxDiscount: MoneyLike;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
};

export type ValidatedCouponDiscount = {
  couponId: string | null;
  code: string | null;
  type: string | null;
  discountAmount: number;
  usageLimit: number | null;
  perUserLimit: number | null;
};

export class CouponValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'COUPON_INVALID', status = 400) {
    super(message);
    this.name = 'CouponValidationError';
    this.code = code;
    this.status = status;
  }
}

function toMoney(value: MoneyLike): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const parsed = Number.parseFloat(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function capDiscount(value: number, maxDiscountableAmount: number): number {
  return roundMoney(Math.min(Math.max(0, value), Math.max(0, maxDiscountableAmount)));
}

import { PROMO_CATALOG, ENABLE_PROMO_COUPONS } from '@/lib/commerce/offer-engine';

const UNIVERSAL_OFFER_CONFIG_KEY = 'universalOfferEngineConfig';

export async function validateCouponForOrder(params: {
  prisma: PrismaClient;
  userId: string;
  couponCode?: string;
  subtotal: number;
  shippingCost: number;
}): Promise<ValidatedCouponDiscount> {
  const couponCode = params.couponCode?.trim().toUpperCase();
  if (!couponCode) {
    return {
      couponId: null,
      code: null,
      type: null,
      discountAmount: 0,
      usageLimit: null,
      perUserLimit: null,
    };
  }

  if (!ENABLE_PROMO_COUPONS) {
    throw new CouponValidationError(
      'Promo vouchers are not active at this time',
      'COUPON_DISABLED',
      400
    );
  }

  let coupon = (await params.prisma.coupon.findUnique({
    where: { code: couponCode },
  })) as CouponRecord | null;

  // Fallback to Universal Offer Engine (siteConfig) or PROMO_CATALOG
  if (!coupon) {
    try {
      const siteConfig = await params.prisma.siteConfig.findUnique({
        where: { key: UNIVERSAL_OFFER_CONFIG_KEY },
      });
      if (siteConfig?.value && typeof siteConfig.value === 'object') {
        const configCoupons = (siteConfig.value as { coupons?: Array<{
          code: string;
          type: 'percentage' | 'flat';
          value: number;
          minSubtotal?: number;
          maxDiscount?: number;
          isActive?: boolean;
        }> }).coupons;

        if (Array.isArray(configCoupons)) {
          const matched = configCoupons.find(
            (c) => c && c.code && c.code.trim().toUpperCase() === couponCode
          );
          if (matched && matched.isActive !== false) {
            coupon = {
              id: '',
              code: couponCode,
              type: matched.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
              value: matched.value,
              minPurchase: matched.minSubtotal ?? 0,
              maxDiscount: matched.maxDiscount ?? 0,
              usageLimit: null,
              usageCount: 0,
              perUserLimit: null,
              startDate: null,
              endDate: null,
              isActive: true,
            };
          }
        }
      }
    } catch {
      // Continue to PROMO_CATALOG fallback
    }

    if (!coupon && PROMO_CATALOG[couponCode]) {
      const promo = PROMO_CATALOG[couponCode];
      coupon = {
        id: '',
        code: couponCode,
        type: promo.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
        value: promo.type === 'percentage' ? Math.round(promo.value * 100) : promo.value,
        minPurchase: promo.minSubtotal ?? 0,
        maxDiscount: promo.maxDiscount ?? 0,
        usageLimit: null,
        usageCount: 0,
        perUserLimit: null,
        startDate: null,
        endDate: null,
        isActive: true,
      };
    }
  }

  if (!coupon || !coupon.isActive) {
    throw new CouponValidationError('Coupon is invalid or inactive', 'COUPON_NOT_FOUND');
  }

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) {
    throw new CouponValidationError('Coupon is not active yet', 'COUPON_NOT_STARTED');
  }

  if (coupon.endDate && coupon.endDate < now) {
    throw new CouponValidationError('Coupon has expired', 'COUPON_EXPIRED');
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponValidationError('Coupon usage limit reached', 'COUPON_USAGE_LIMIT_REACHED', 409);
  }

  const minPurchase = toMoney(coupon.minPurchase);
  if (minPurchase > 0 && params.subtotal < minPurchase) {
    throw new CouponValidationError(
      `Minimum order amount for this coupon is ${minPurchase}`,
      'COUPON_MIN_PURCHASE_NOT_MET',
    );
  }

  if (coupon.perUserLimit !== null && coupon.perUserLimit > 0) {
    const userUsageCount = await params.prisma.order.count({
      where: { userId: params.userId, couponCode: coupon.code },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw new CouponValidationError('Coupon usage limit reached for this account', 'COUPON_USER_LIMIT_REACHED', 409);
    }
  }

  const couponType = String(coupon.type).toUpperCase();
  const value = toMoney(coupon.value);
  const maxDiscount = toMoney(coupon.maxDiscount);
  let rawDiscount = 0;

  if (couponType === 'PERCENTAGE') {
    rawDiscount = params.subtotal * (value / 100);
    if (maxDiscount > 0) rawDiscount = Math.min(rawDiscount, maxDiscount);
  } else if (couponType === 'FIXED') {
    rawDiscount = value;
  } else if (couponType === 'FREE_SHIPPING') {
    rawDiscount = params.shippingCost;
  } else {
    throw new CouponValidationError('Coupon type is not supported', 'COUPON_TYPE_UNSUPPORTED');
  }

  // Cap promo discount so an order subtotal can never be reduced to 0 by a coupon alone.
  // Leaving at least 1 taka ensures positive payable balance.
  const maxDiscountableAmount = Math.max(0, params.subtotal - 1);
  const discountAmount = couponType === 'FREE_SHIPPING'
    ? capDiscount(rawDiscount, params.shippingCost)
    : capDiscount(rawDiscount, maxDiscountableAmount);

  return {
    couponId: coupon.id || null,
    code: coupon.code,
    type: couponType,
    discountAmount,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
  };
}
