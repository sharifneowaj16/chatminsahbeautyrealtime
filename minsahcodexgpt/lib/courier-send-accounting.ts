import { Prisma } from '@/generated/prisma/client';

export type MoneyLike = number | string | null | undefined | { toNumber?: () => number; toString?: () => string };

export type CourierSendAccountingInput = {
  customerShippingCost: MoneyLike;
  currentCourierDeliveryCharge?: MoneyLike;
  currentDeliveryDiscountAmount?: MoneyLike;
  courierResponseCharge?: MoneyLike;
};

export type CourierSendAccountingResult = {
  /** Customer-facing delivery charge. This is Order.shippingCost and must not be overwritten by courier send. */
  shippingCost: number;
  /** Internal actual courier fee/cost returned by courier send/dispatch. */
  courierDeliveryCharge: number | null;
  /** Business subsidy/discount: courier actual cost minus customer-paid delivery. */
  deliveryDiscountAmount: number;
  hasCourierResponseCharge: boolean;
};

export function toMoneyNumber(value: MoneyLike): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      const parsed = value.toNumber();
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (typeof value.toString === 'function') {
      const parsed = Number.parseFloat(value.toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

export function extractNumericCourierField(data: unknown, keys: string[]): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const source = data as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

export function extractCourierResponseCharge(data: unknown): number | null {
  const directKeys = [
    'delivery_fee',
    'delivery_charge',
    'courier_charge',
    'courier_fee',
    'courier_cost',
    'deliveryCost',
    'delivery_cost',
    'courierDeliveryCharge',
  ];

  const direct = extractNumericCourierField(data, directKeys);
  if (direct !== null) return direct;

  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const source = data as Record<string, unknown>;

  // Common courier API envelopes. Do not inspect arbitrary numeric fields such as cod_amount.
  for (const nestedKey of ['data', 'consignment', 'order', 'result']) {
    const nested = source[nestedKey];
    const nestedValue = extractNumericCourierField(nested, directKeys);
    if (nestedValue !== null) return nestedValue;
  }

  return null;
}

export function calculateCourierSendAccounting(
  input: CourierSendAccountingInput
): CourierSendAccountingResult {
  const shippingCost = roundMoney(Math.max(0, toMoneyNumber(input.customerShippingCost)));
  const responseChargeRaw = toMoneyNumber(input.courierResponseCharge);
  const hasCourierResponseCharge = responseChargeRaw > 0;
  const existingCourierChargeRaw = toMoneyNumber(input.currentCourierDeliveryCharge);
  const courierDeliveryCharge = hasCourierResponseCharge
    ? roundMoney(responseChargeRaw)
    : existingCourierChargeRaw > 0
      ? roundMoney(existingCourierChargeRaw)
      : null;

  const deliveryDiscountAmount = courierDeliveryCharge !== null
    ? roundMoney(Math.max(0, courierDeliveryCharge - shippingCost))
    : roundMoney(Math.max(0, toMoneyNumber(input.currentDeliveryDiscountAmount)));

  return {
    shippingCost,
    courierDeliveryCharge,
    deliveryDiscountAmount,
    hasCourierResponseCharge,
  };
}
