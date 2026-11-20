import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { getBangladeshPhoneVariations } from '@/lib/phone';
import { getUniversalOfferEngineServerConfig } from '@/lib/commerce/offer-engine/server';

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

export async function validateCouponForOrder(params: {
  prisma: PrismaClient;
  userId: string;
  couponCode?: string;
  subtotal: number;
  eligibleSubtotal?: number;
  bundleSubtotal?: number;
  shippingCost: number;
  phoneNumber?: string | null;
  phoneNumbers?: Array<string | null | undefined>;
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

  // 1. Read authoritative Admin Universal Offer Engine config
  const offerConfig = await getUniversalOfferEngineServerConfig();
  if (!offerConfig.couponsEnabled) {
    throw new CouponValidationError(
      'Promo vouchers are currently disabled',
      'COUPON_DISABLED',
      400
    );
  }

  const matchedOfferRule = offerConfig.coupons.find(
    (c) => c && c.code && String(c.code).trim().toUpperCase() === couponCode
  );
  const strictAntiStacking = offerConfig.antiConflict.strictAntiStacking !== false;
  const maxCartDiscountCap = Math.max(0, Number(offerConfig.antiConflict.maxCartDiscountCap ?? 0) || 0);
  const allowBundleForCoupon = !strictAntiStacking && Boolean(matchedOfferRule?.allowOnBundles);

  let coupon = (await params.prisma.coupon.findUnique({
    where: { code: couponCode },
  })) as CouponRecord | null;

  if (coupon && !coupon.isActive) {
    throw new CouponValidationError('Coupon is invalid or inactive', 'COUPON_NOT_FOUND');
  }

  // Fallback to Universal Offer Engine rule if not synced in relational table
  if (!coupon && matchedOfferRule) {
    if (matchedOfferRule.isActive === false) {
      throw new CouponValidationError('Coupon is invalid or inactive', 'COUPON_NOT_FOUND');
    }
    coupon = {
      id: '',
      code: couponCode,
      type: matchedOfferRule.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
      value: matchedOfferRule.value,
      minPurchase: matchedOfferRule.minSubtotal ?? 0,
      maxDiscount: matchedOfferRule.maxDiscount ?? 0,
      usageLimit: null,
      usageCount: 0,
      perUserLimit: null,
      startDate: matchedOfferRule.startDate ? new Date(matchedOfferRule.startDate) : null,
      endDate: matchedOfferRule.endDate ? new Date(matchedOfferRule.endDate) : null,
      isActive: true,
    };
  }

  if (!coupon || !coupon.isActive) {
    throw new CouponValidationError('Coupon is invalid or inactive', 'COUPON_NOT_FOUND');
  }

  // Enforce date window from both DB coupon and Offer Engine rule
  const now = new Date();
  const effectiveStart = coupon.startDate ?? (matchedOfferRule?.startDate ? new Date(matchedOfferRule.startDate) : null);
  const effectiveEnd = coupon.endDate ?? (matchedOfferRule?.endDate ? new Date(matchedOfferRule.endDate) : null);

  if (effectiveStart && !isNaN(effectiveStart.getTime()) && effectiveStart > now) {
    throw new CouponValidationError('Coupon is not active yet', 'COUPON_NOT_STARTED');
  }
  if (effectiveEnd && !isNaN(effectiveEnd.getTime()) && effectiveEnd < now) {
    throw new CouponValidationError('Coupon has expired', 'COUPON_EXPIRED');
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponValidationError('Coupon usage limit reached', 'COUPON_USAGE_LIMIT_REACHED', 409);
  }

  const minPurchase = toMoney(coupon.minPurchase);
  if (minPurchase > 0 && params.subtotal < minPurchase) {
    throw new CouponValidationError(
      `Minimum order amount for this coupon is \u09F3${minPurchase}`,
      'COUPON_MIN_PURCHASE_NOT_MET'
    );
  }

  if (coupon.perUserLimit !== null && coupon.perUserLimit > 0) {
    const rawPhones = [
      ...(params.phoneNumbers ?? []),
      params.phoneNumber,
    ].filter((p): p is string => Boolean(p && typeof p === 'string' && p.trim()));

    const phoneCandidates = Array.from(
      new Set(rawPhones.flatMap((p) => getBangladeshPhoneVariations(p)))
    );

    const userConditions: Prisma.OrderWhereInput[] = [{ userId: params.userId }];
    if (phoneCandidates.length > 0) {
      userConditions.push({
        shippingAddress: {
          phone: { in: phoneCandidates },
        },
      });
      userConditions.push({
        user: {
          phone: { in: phoneCandidates },
        },
      });
    }

    const userUsageCount = await params.prisma.order.count({
      where: {
        couponCode: coupon.code,
        status: { notIn: ['CANCELLED', 'PAYMENT_EXPIRED'] },
        OR: userConditions,
      },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw new CouponValidationError(
        'Coupon usage limit reached for this account or phone number',
        'COUPON_USER_LIMIT_REACHED',
        409
      );
    }
  }

  const rawCouponType = String(coupon.type).toUpperCase();
  const value = toMoney(coupon.value);
  const couponType =
    coupon.code.trim().toUpperCase() === 'FREESHIP' && value <= 0
      ? 'FREE_SHIPPING'
      : rawCouponType;
  const maxDiscount = toMoney(coupon.maxDiscount);
  const baseRegularSubtotal =
    params.eligibleSubtotal !== undefined
      ? Math.max(0, params.eligibleSubtotal)
      : params.subtotal;
  const bundleBase = Math.max(0, params.bundleSubtotal ?? 0);
  const eligibleSubtotal = allowBundleForCoupon
    ? baseRegularSubtotal + bundleBase
    : baseRegularSubtotal;

  if (eligibleSubtotal <= 0 && params.subtotal > 0 && couponType !== 'FREE_SHIPPING') {
    throw new CouponValidationError(
      bundleBase > 0
        ? `${coupon.code} cannot be applied to promotional bundles`
        : 'Promo vouchers cannot be applied to Flash Deal items',
      'COUPON_INELIGIBLE_ITEMS',
      400,
    );
  }

  let rawDiscount = 0;

  if (couponType === 'PERCENTAGE') {
    const rate = value > 1 ? value / 100 : value;
    rawDiscount = Math.round(eligibleSubtotal * rate);
    if (maxDiscount > 0) rawDiscount = Math.min(rawDiscount, maxDiscount);
  } else if (couponType === 'FIXED') {
    rawDiscount = Math.min(value, eligibleSubtotal);
  } else if (couponType === 'FREE_SHIPPING') {
    rawDiscount = params.shippingCost;
  } else {
    throw new CouponValidationError('Coupon type is not supported', 'COUPON_TYPE_UNSUPPORTED');
  }

  if (maxCartDiscountCap > 0 && couponType !== 'FREE_SHIPPING') {
    rawDiscount = Math.min(rawDiscount, maxCartDiscountCap);
  }

  const maxDiscountableAmount = Math.max(0, eligibleSubtotal - (eligibleSubtotal === params.subtotal ? 1 : 0));
  const discountAmount =
    couponType === 'FREE_SHIPPING'
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
