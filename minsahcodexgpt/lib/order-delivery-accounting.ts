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

function fallbackFromClient(client: ClientDeliveryAccountingInput): OrderDeliveryAccountingResult {
  const shippingCost = roundMoney(toMoney(client.customerDeliveryCharge ?? client.shippingCost));
  const clientCourierCharge = toMoney(client.courierDeliveryCharge);
  const courierDeliveryCharge = clientCourierCharge > 0 ? roundMoney(clientCourierCharge) : null;
  const clientDiscount = toMoney(client.deliveryDiscountAmount);
  const deliveryDiscountAmount = courierDeliveryCharge !== null
    ? roundMoney(Math.max(0, courierDeliveryCharge - shippingCost))
    : roundMoney(clientDiscount);

  return {
    shippingCost,
    courierDeliveryCharge,
    deliveryDiscountAmount,
    deliveryPricingSource: normalizePricingSource(client.deliveryPricingSource) === 'DEFAULT'
      ? 'FALLBACK'
      : normalizePricingSource(client.deliveryPricingSource),
    deliveryOfferType: normalizeOfferType(client.deliveryOfferType),
    deliveryOfferProductId: client.deliveryOfferProductId || null,
    deliveryOfferBadgeText: client.deliveryOfferBadgeText?.trim() || null,
    quoteVerified: false,
    pricingNote: 'Server courier quote unavailable; saved client quote as fallback accounting.',
  };
}

export async function resolveOrderDeliveryAccounting(params: {
  items: OrderDeliveryAccountingItemInput[];
  products: OrderDeliveryAccountingProductInput[];
  variants: OrderDeliveryAccountingVariantInput[];
  address: OrderDeliveryAccountingAddressInput | null | undefined;
  client: ClientDeliveryAccountingInput;
}): Promise<OrderDeliveryAccountingResult> {
  const recipientCity = getAddressId(params.address?.pathao_city_id ?? params.address?.pathaoCityId);
  const recipientZone = getAddressId(params.address?.pathao_zone_id ?? params.address?.pathaoZoneId);

  if (!recipientCity || !recipientZone || !params.items.length) {
    return fallbackFromClient(params.client);
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

    const deliveryPricing = calculateDeliveryPricing({
      courierDeliveryCharge,
      courierPricingSource: 'PATHAO',
      products: params.products,
    });

    return {
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
  } catch (error) {
    console.error('Order delivery accounting quote failed:', error);
    return fallbackFromClient(params.client);
  }
}
