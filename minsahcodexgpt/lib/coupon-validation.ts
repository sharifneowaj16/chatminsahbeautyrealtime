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

  const coupon = (await params.prisma.coupon.findUnique({
    where: { code: couponCode },
  })) as CouponRecord | null;

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

  const discountAmount = couponType === 'FREE_SHIPPING'
    ? capDiscount(rawDiscount, params.shippingCost)
    : capDiscount(rawDiscount, params.subtotal);

  return {
    couponId: coupon.id,
    code: coupon.code,
    type: couponType,
    discountAmount,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
  };
}
