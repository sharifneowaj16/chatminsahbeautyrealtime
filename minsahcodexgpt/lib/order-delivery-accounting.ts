import prisma from '@/lib/prisma';
import {
  extractVariantWeightKg,
  parseWeightToKg,
  resolvePackagingWeightKg,
} from '@/lib/buy-now';
import { extractPathaoObject, pathaoRequest, resolvePathaoStore } from '@/lib/pathao';
import {
  calculateDeliveryPricing,
  type DeliveryOfferProductInput,
  type DeliveryOfferType,
  type DeliveryPricingSource,
} from '@/lib/delivery-pricing';
import { getUniversalOfferEngineServerConfig } from '@/lib/commerce/offer-engine/server';

const PATHAO_MIN_WEIGHT_KG = 0.5;
const PATHAO_MAX_WEIGHT_KG = 10;
const configuredDefaultItemWeightKg = Number(process.env.PATHAO_DEFAULT_ITEM_WEIGHT_KG ?? 0.1);
const DEFAULT_ITEM_WEIGHT_KG =
  Number.isFinite(configuredDefaultItemWeightKg) && configuredDefaultItemWeightKg > 0
    ? configuredDefaultItemWeightKg
    : 0.1;

type MoneyLike = number | string | null | undefined | { toString(): string };

export type OrderDeliveryAccountingItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type OrderDeliveryAccountingProductInput = DeliveryOfferProductInput & {
  weight?: MoneyLike;
  shippingWeight?: string | null;
};

export type OrderDeliveryAccountingVariantInput = {
  id: string;
  productId?: string | null;
  attributes?: unknown;
};

export type OrderDeliveryAccountingAddressInput = {
  pathao_city_id?: number | null;
  pathao_zone_id?: number | null;
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  city?: string | null;
};

export type ClientDeliveryAccountingInput = {
  customerDeliveryCharge?: MoneyLike;
  shippingCost?: MoneyLike;
  courierDeliveryCharge?: MoneyLike;
  deliveryDiscountAmount?: MoneyLike;
  deliveryPricingSource?: DeliveryPricingSource | string | null;
  deliveryOfferType?: DeliveryOfferType | string | null;
  deliveryOfferProductId?: string | null;
  deliveryOfferBadgeText?: string | null;
};

export type OrderDeliveryAccountingResult = {
  /** Customer-facing charge. This must be saved to Order.shippingCost. */
  shippingCost: number;
  /** Internal actual courier quote/cost. This must never be used as customer payable total. */
  courierDeliveryCharge: number | null;
  deliveryDiscountAmount: number;
  deliveryPricingSource: DeliveryPricingSource;
  deliveryOfferType: DeliveryOfferType;
  deliveryOfferProductId: string | null;
  deliveryOfferBadgeText: string | null;
  quoteVerified: boolean;
  pricingNote: string | null;
};

type PathaoPricePlanResponse = {
  data?: {
    price?: number;
    discount?: number;
    promo_discount?: number;
    plan_id?: number;
    cod_enabled?: number;
    cod_percentage?: number;
    additional_charge?: number;
    final_price?: number;
  };
};

function toMoney(value: MoneyLike): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  if (value && typeof value === 'object') {
    const parsed = Number.parseFloat(value.toString());
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toWeightValue(value: MoneyLike): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return value;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizePricingSource(value: ClientDeliveryAccountingInput['deliveryPricingSource']): DeliveryPricingSource {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : value;
  if (
    normalized === 'PATHAO' ||
    normalized === 'STEADFAST' ||
    normalized === 'PRODUCT_OFFER' ||
    normalized === 'MANUAL' ||
    normalized === 'FALLBACK'
  ) {
    return normalized;
  }

  return 'DEFAULT';
}

function normalizeOfferType(value: ClientDeliveryAccountingInput['deliveryOfferType']): DeliveryOfferType {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : value;
  if (normalized === 'FREE' || normalized === 'FIXED') return normalized;
  return 'DEFAULT';
}

function getPathaoPriceData(response: unknown): NonNullable<PathaoPricePlanResponse['data']> {
  const nested = extractPathaoObject(response);
  return {
    price: toPositiveNumber(nested.final_price) ?? undefined,
    ...nested,
  } as NonNullable<PathaoPricePlanResponse['data']>;
}

function getAddressId(value: number | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function getPackagingWeightKg(): Promise<number> {
  const configs = await prisma.siteConfig.findMany({
    where: { key: { in: ['packagingWeight', 'shippingSettings', 'deliverySettings', 'orderPackagingWeight'] } },
    select: { value: true },
  });

  return resolvePackagingWeightKg(configs.map((config) => config.value));
}

function calculateParcelWeightKg(params: {
  items: OrderDeliveryAccountingItemInput[];
  products: OrderDeliveryAccountingProductInput[];
  variants: OrderDeliveryAccountingVariantInput[];
  packagingWeightKg: number;
}): number {
  const productMap = new Map(params.products.map((product) => [product.id, product]));
  const variantMap = new Map(params.variants.map((variant) => [variant.id, variant]));
  const itemsWeightKg = params.items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    if (!product) return sum;

    const variant = item.variantId ? variantMap.get(item.variantId) : null;
    const variantWeightKg = variant ? extractVariantWeightKg(variant.attributes) : null;
    const productWeightKg =
      parseWeightToKg(toWeightValue(product.weight)) ??
      parseWeightToKg(product.shippingWeight);
    const unitWeightKg = variantWeightKg ?? productWeightKg ?? DEFAULT_ITEM_WEIGHT_KG;
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));

    return sum + unitWeightKg * quantity;
  }, 0);

  return Number((itemsWeightKg + params.packagingWeightKg).toFixed(3));
}

async function fetchPathaoCourierCharge(params: {
  recipientCity: number;
  recipientZone: number;
  parcelWeightKg: number;
}): Promise<number> {
  const storeInfo = await resolvePathaoStore();
  const pathaoWeightKg = Number(Math.max(PATHAO_MIN_WEIGHT_KG, params.parcelWeightKg).toFixed(3));

  if (pathaoWeightKg > PATHAO_MAX_WEIGHT_KG) {
    throw new Error(`PATHAO_WEIGHT_OUT_OF_RANGE:${pathaoWeightKg}`);
  }

  const response = await pathaoRequest<PathaoPricePlanResponse>('/aladdin/api/v1/merchant/price-plan', {
    store_id: storeInfo.storeId,
    item_type: 2,
    delivery_type: 48,
    item_weight: pathaoWeightKg,
    recipient_city: params.recipientCity,
    recipient_zone: params.recipientZone,
  });

  const priceData = response.data ?? getPathaoPriceData(response);
  const courierCharge =
    toPositiveNumber(priceData.final_price) ??
    toPositiveNumber(priceData.price) ??
    0;

  if (courierCharge <= 0) {
    throw new Error('PATHAO_PRICE_RESPONSE_INVALID');
  }

  return roundMoney(courierCharge);
}

function resolveFallbackDeliveryAccounting(params: {
  client: ClientDeliveryAccountingInput;
  products: OrderDeliveryAccountingProductInput[];
  address?: OrderDeliveryAccountingAddressInput | null;
}): OrderDeliveryAccountingResult {
  const cityName = typeof params.address?.city === 'string' ? params.address.city.trim().toLowerCase() : '';
  const cityId = Number(params.address?.pathao_city_id ?? params.address?.pathaoCityId);
  const isInsideDhaka = cityName.includes('dhaka') || cityId === 1;

  // Standard fallback courier rates if live courier quote failed
  const standardCourierCharge = isInsideDhaka ? 80 : 130;
  const clientCourierCharge = toMoney(params.client.courierDeliveryCharge);
  const fallbackCourierCharge = clientCourierCharge > 0
    ? roundMoney(clientCourierCharge)
    : standardCourierCharge;

  // Server-side offer re-evaluation using actual database product records and current timestamp.
  // This ensures expired offers are strictly invalidated even if client claims an offer or Pathao is down.
  const now = new Date();
  const deliveryPricing = calculateDeliveryPricing({
    courierDeliveryCharge: fallbackCourierCharge,
    courierPricingSource: 'FALLBACK',
    products: params.products,
    isInsideDhaka,
    destinationCity: params.address?.city ?? (isInsideDhaka ? 'Dhaka' : null),
    now,
  });

  return {
    shippingCost: deliveryPricing.customerDeliveryCharge,
    courierDeliveryCharge: fallbackCourierCharge,
    deliveryDiscountAmount: deliveryPricing.deliveryDiscountAmount,
    deliveryPricingSource: deliveryPricing.deliveryPricingSource === 'PRODUCT_OFFER'
      ? 'PRODUCT_OFFER'
      : 'FALLBACK',
    deliveryOfferType: deliveryPricing.deliveryOfferType,
    deliveryOfferProductId: deliveryPricing.deliveryOfferProductId,
    deliveryOfferBadgeText: deliveryPricing.deliveryOfferBadgeText,
    quoteVerified: false,
    pricingNote: deliveryPricing.deliveryPricingSource === 'PRODUCT_OFFER'
      ? 'Server courier quote unavailable; active product delivery offer verified against DB.'
      : 'Server courier quote unavailable; calculated standard fallback delivery charge with verified offer expiry.',
  };
}

async function applyOrderThresholdDeliveryRules(params: {
  result: OrderDeliveryAccountingResult;
  subtotal?: number | null;
  couponCode?: string | null;
  isInsideDhaka: boolean;
}): Promise<OrderDeliveryAccountingResult> {
  const { result, subtotal, couponCode, isInsideDhaka } = params;
  const normalizedSubtotal = typeof subtotal === 'number' && Number.isFinite(subtotal) ? Math.max(0, subtotal) : null;
  const normalizedCode = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';
  const offerConfig = await getUniversalOfferEngineServerConfig();
  const thresholdConfig = offerConfig.freeDelivery;

  let isFreeShipCoupon = false;
  if (normalizedCode === 'FREESHIP' && offerConfig.couponsEnabled) {
    const now = Date.now();
    const rule = offerConfig.coupons.find(
      (c) => c && c.code && String(c.code).trim().toUpperCase() === 'FREESHIP' && c.isActive !== false
    );
    if (rule) {
      const startOk = !rule.startDate || isNaN(new Date(rule.startDate).getTime()) || now >= new Date(rule.startDate).getTime();
      const endOk = !rule.endDate || isNaN(new Date(rule.endDate).getTime()) || now <= new Date(rule.endDate).getTime();
      const minOk = !rule.minSubtotal || (normalizedSubtotal !== null && normalizedSubtotal >= rule.minSubtotal);
      if (startOk && endOk && minOk) {
        isFreeShipCoupon = true;
      }
    }
  }

  if (normalizedSubtotal === null && !isFreeShipCoupon) {
    return result;
  }
  const baseCourier = result.courierDeliveryCharge ?? result.shippingCost;
  let targetCharge = result.shippingCost;
  let targetOfferType: DeliveryOfferType = result.deliveryOfferType;
  let targetBadge = result.deliveryOfferBadgeText;
  let targetProductId = result.deliveryOfferProductId;

  if (
    isFreeShipCoupon ||
    (normalizedSubtotal !== null && normalizedSubtotal >= thresholdConfig.nationwideThreshold)
  ) {
    if (0 < targetCharge) {
      targetCharge = 0;
      targetOfferType = 'FREE';
      targetBadge = isFreeShipCoupon ? 'Free Shipping Coupon' : 'Free Nationwide Delivery';
      targetProductId = null;
    }
  } else if (
    isInsideDhaka &&
    normalizedSubtotal !== null &&
    normalizedSubtotal >= thresholdConfig.dhakaThreshold
  ) {
    if (0 < targetCharge) {
      targetCharge = 0;
      targetOfferType = 'FREE';
      targetBadge = 'Free Dhaka Delivery';
      targetProductId = null;
    }
  } else if (
    !isInsideDhaka &&
    normalizedSubtotal !== null &&
    thresholdConfig.outsideDhakaSubsidizedThreshold &&
    thresholdConfig.outsideDhakaSubsidizedThreshold > 0 &&
    typeof thresholdConfig.outsideDhakaSubsidizedFee === 'number' &&
    normalizedSubtotal >= thresholdConfig.outsideDhakaSubsidizedThreshold
  ) {
    const capped = roundMoney(Math.max(0, thresholdConfig.outsideDhakaSubsidizedFee));
    if (capped < targetCharge) {
      targetCharge = capped;
      targetOfferType = 'FIXED';
      targetBadge = `Subsidized Delivery (\u09F3${capped})`;
      targetProductId = null;
    }
  }

  if (targetCharge === result.shippingCost) {
    return result;
  }

  return {
    ...result,
    shippingCost: roundMoney(targetCharge),
    deliveryDiscountAmount: roundMoney(Math.max(0, baseCourier - targetCharge)),
    deliveryOfferType: targetOfferType,
    deliveryOfferProductId: targetProductId,
    deliveryOfferBadgeText: targetBadge,
  };
}

export async function resolveOrderDeliveryAccounting(params: {
  items: OrderDeliveryAccountingItemInput[];
  products: OrderDeliveryAccountingProductInput[];
  variants: OrderDeliveryAccountingVariantInput[];
  address: OrderDeliveryAccountingAddressInput | null | undefined;
  client: ClientDeliveryAccountingInput;
  subtotal?: number | null;
  couponCode?: string | null;
}): Promise<OrderDeliveryAccountingResult> {
  const recipientCity = getAddressId(params.address?.pathao_city_id ?? params.address?.pathaoCityId);
  const recipientZone = getAddressId(params.address?.pathao_zone_id ?? params.address?.pathaoZoneId);

  const addrCityName = typeof params.address?.city === 'string' ? params.address.city.trim().toLowerCase() : '';
  const isAddressInsideDhaka = addrCityName.includes('dhaka') || recipientCity === 1;

  if (!recipientCity || !recipientZone || !params.items.length) {
    const fallback = resolveFallbackDeliveryAccounting({
      client: params.client,
      products: params.products,
      address: params.address,
    });
    return applyOrderThresholdDeliveryRules({
      result: fallback,
      subtotal: params.subtotal,
      couponCode: params.couponCode,
      isInsideDhaka: isAddressInsideDhaka,
    });
  }

  try {
    const packagingWeightKg = await getPackagingWeightKg();
    const parcelWeightKg = calculateParcelWeightKg({
      items: params.items,
      products: params.products,
      variants: params.variants,
      packagingWeightKg,
    });

    const courierDeliveryCharge = await fetchPathaoCourierCharge({
      recipientCity,
      recipientZone,
      parcelWeightKg,
    });

    const cityName = typeof params.address?.city === 'string' ? params.address.city.trim().toLowerCase() : '';
    const isInsideDhaka = cityName.includes('dhaka') || recipientCity === 1;

    const deliveryPricing = calculateDeliveryPricing({
      courierDeliveryCharge,
      courierPricingSource: 'PATHAO',
      products: params.products,
      isInsideDhaka,
      destinationCity: params.address?.city ?? (isInsideDhaka ? 'Dhaka' : null),
    });

    const baseResult: OrderDeliveryAccountingResult = {
      shippingCost: deliveryPricing.customerDeliveryCharge,
      courierDeliveryCharge: deliveryPricing.courierDeliveryCharge,
      deliveryDiscountAmount: deliveryPricing.deliveryDiscountAmount,
      deliveryPricingSource: deliveryPricing.deliveryPricingSource,
      deliveryOfferType: deliveryPricing.deliveryOfferType,
      deliveryOfferProductId: deliveryPricing.deliveryOfferProductId,
      deliveryOfferBadgeText: deliveryPricing.deliveryOfferBadgeText,
      quoteVerified: true,
      pricingNote: null,
    };
    return applyOrderThresholdDeliveryRules({
      result: baseResult,
      subtotal: params.subtotal,
      couponCode: params.couponCode,
      isInsideDhaka,
    });
  } catch (error) {
    console.error('Order delivery accounting quote failed:', error);
    const fallback = resolveFallbackDeliveryAccounting({
      client: params.client,
      products: params.products,
      address: params.address,
    });
    return applyOrderThresholdDeliveryRules({
      result: fallback,
      subtotal: params.subtotal,
      couponCode: params.couponCode,
      isInsideDhaka: isAddressInsideDhaka,
    });
  }
}
