export type DeliveryOfferType = 'DEFAULT' | 'FREE' | 'FIXED';

export type DeliveryPricingSource =
  | 'DEFAULT'
  | 'PATHAO'
  | 'STEADFAST'
  | 'PRODUCT_OFFER'
  | 'MANUAL'
  | 'FALLBACK';

type MoneyLike = number | string | bigint | null | undefined | { toString(): string };

export type DeliveryOfferProductInput = {
  id: string;
  name?: string | null;
  deliveryOfferEnabled?: boolean | null;
  deliveryOfferType?: DeliveryOfferType | string | null;
  deliveryOfferAmount?: MoneyLike;
  deliveryOfferStartDate?: Date | string | null;
  deliveryOfferEndDate?: Date | string | null;
  deliveryOfferBadgeText?: string | null;
};

export type DeliveryPricingInput = {
  courierDeliveryCharge: MoneyLike;
  courierPricingSource?: DeliveryPricingSource | string | null;
  products: DeliveryOfferProductInput[];
  now?: Date;
};

export type AppliedDeliveryOffer = {
  productId: string;
  productName: string | null;
  type: DeliveryOfferType;
  amount: number | null;
  badgeText: string | null;
};

export type DeliveryPricingResult = {
  /** Customer-facing delivery charge. This is the value that belongs in Order.shippingCost. */
  customerDeliveryCharge: number;
  /** Actual courier quote/cost. This is internal accounting data. */
  courierDeliveryCharge: number;
  /** Difference between actual courier cost and customer-paid delivery charge. */
  deliveryDiscountAmount: number;
  /** PRODUCT_OFFER when a free/fixed product offer changes the customer charge. */
  deliveryPricingSource: DeliveryPricingSource;
  deliveryOfferType: DeliveryOfferType;
  deliveryOfferProductId: string | null;
  deliveryOfferBadgeText: string | null;
  appliedOffer: AppliedDeliveryOffer | null;
};

function normalizeMoney(value: MoneyLike): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  if (typeof value === 'bigint') {
    return Number(value) >= 0 ? Number(value) : 0;
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

function normalizeOfferType(value: DeliveryOfferProductInput['deliveryOfferType']): DeliveryOfferType {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : value;
  if (normalized === 'FREE' || normalized === 'FIXED') {
    return normalized;
  }

  return 'DEFAULT';
}

function normalizePricingSource(value: DeliveryPricingInput['courierPricingSource']): DeliveryPricingSource {
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

function normalizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateWindowActive(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  now: Date,
): boolean {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function isDeliveryOfferActive(
  product: DeliveryOfferProductInput,
  now: Date = new Date(),
): boolean {
  if (!product.deliveryOfferEnabled) return false;

  const offerType = normalizeOfferType(product.deliveryOfferType);
  if (offerType === 'DEFAULT') return false;

  if (
    offerType === 'FIXED' &&
    (product.deliveryOfferAmount === null || product.deliveryOfferAmount === undefined)
  ) {
    return false;
  }

  return isDateWindowActive(product.deliveryOfferStartDate, product.deliveryOfferEndDate, now);
}

export function getDeliveryOfferBadgeText(product: DeliveryOfferProductInput): string | null {
  const explicitText = product.deliveryOfferBadgeText?.trim();
  if (explicitText) return explicitText;

  const offerType = normalizeOfferType(product.deliveryOfferType);
  if (offerType === 'FREE') return 'এই পণ্যে ফ্রি ডেলিভারি';
  if (offerType === 'FIXED') {
    const amount = normalizeMoney(product.deliveryOfferAmount);
    return `বিশেষ ডেলিভারি অফার: ৳${amount}`;
  }

  return null;
}

export function findBestDeliveryOfferProduct(
  products: DeliveryOfferProductInput[],
  now: Date = new Date(),
): DeliveryOfferProductInput | null {
  const activeOffers = products.filter((product) => isDeliveryOfferActive(product, now));

  const freeOffer = activeOffers.find((product) => normalizeOfferType(product.deliveryOfferType) === 'FREE');
  if (freeOffer) return freeOffer;

  const fixedOffers = activeOffers
    .filter((product) => normalizeOfferType(product.deliveryOfferType) === 'FIXED')
    .sort(
      (first, second) =>
        normalizeMoney(first.deliveryOfferAmount) - normalizeMoney(second.deliveryOfferAmount),
    );

  return fixedOffers[0] ?? null;
}

export function calculateDeliveryPricing(input: DeliveryPricingInput): DeliveryPricingResult {
  const now = input.now ?? new Date();
  const courierDeliveryCharge = roundMoney(normalizeMoney(input.courierDeliveryCharge));
  const courierPricingSource = normalizePricingSource(input.courierPricingSource);
  const appliedProduct = findBestDeliveryOfferProduct(input.products, now);

  if (!appliedProduct) {
    return {
      customerDeliveryCharge: courierDeliveryCharge,
      courierDeliveryCharge,
      deliveryDiscountAmount: 0,
      deliveryPricingSource: courierPricingSource,
      deliveryOfferType: 'DEFAULT',
      deliveryOfferProductId: null,
      deliveryOfferBadgeText: null,
      appliedOffer: null,
    };
  }

  const offerType = normalizeOfferType(appliedProduct.deliveryOfferType);
  const offerAmount = offerType === 'FIXED' ? normalizeMoney(appliedProduct.deliveryOfferAmount) : null;
  const customerDeliveryCharge =
    offerType === 'FREE' ? 0 : Math.min(courierDeliveryCharge, offerAmount ?? courierDeliveryCharge);
  const deliveryDiscountAmount = roundMoney(
    Math.max(0, courierDeliveryCharge - customerDeliveryCharge),
  );
  const badgeText = getDeliveryOfferBadgeText(appliedProduct);

  return {
    customerDeliveryCharge: roundMoney(customerDeliveryCharge),
    courierDeliveryCharge,
    deliveryDiscountAmount,
    deliveryPricingSource: 'PRODUCT_OFFER',
    deliveryOfferType: offerType,
    deliveryOfferProductId: appliedProduct.id,
    deliveryOfferBadgeText: badgeText,
    appliedOffer: {
      productId: appliedProduct.id,
      productName: appliedProduct.name ?? null,
      type: offerType,
      amount: offerAmount,
      badgeText,
    },
  };
}
