import { getDeliveryOfferBadgeText, isDeliveryOfferActive } from '@/lib/delivery-pricing';

export type ShopTrustBadge = 'authentic' | 'cod' | 'return' | 'free-delivery' | 'delivery-offer';

type MoneyLike = number | string | bigint | null | undefined | { toString(): string };

type ProductTrustInput = {
  id?: string | null;
  name?: string | null;
  price?: MoneyLike;
  stock?: number | null;
  quantity?: number | null;
  inStock?: boolean | null;
  isActive?: boolean | null;
  deletedAt?: Date | string | null;
  codAvailable?: boolean | null;
  returnEligible?: boolean | null;
  isFragile?: boolean | null;
  deliveryOfferEnabled?: boolean | null;
  deliveryOfferType?: 'DEFAULT' | 'FREE' | 'FIXED' | string | null;
  deliveryOfferAmount?: MoneyLike;
  deliveryOfferStartDate?: Date | string | null;
  deliveryOfferEndDate?: Date | string | null;
  deliveryOfferBadgeText?: string | null;
  authenticityBadge?: boolean | null;
};

export type ShopTrustPolicy = {
  /** Business-policy level authenticity claim. Keep false if authenticity is unknown. */
  authenticityGuaranteed?: boolean;
  /** Global emergency switch for COD claims. */
  codEnabledGlobally?: boolean;
  /** Global emergency switch for return-policy claims. */
  returnsEnabledGlobally?: boolean;
  /** Optional future global free-delivery campaign threshold. Product offers still require explicit active FREE config. */
  freeDeliveryMinOrderAmount?: MoneyLike;
  now?: Date;
};

export type ProductTrustBadges = {
  isCODAvailable: boolean;
  freeShippingEligible: boolean;
  returnEligible: boolean;
  authenticityBadge: boolean;
  deliveryBadge: string | null;
  badges: ShopTrustBadge[];
};

export const DEFAULT_SHOP_TRUST_POLICY: Required<Pick<
  ShopTrustPolicy,
  'authenticityGuaranteed' | 'codEnabledGlobally' | 'returnsEnabledGlobally'
>> = {
  authenticityGuaranteed: true,
  codEnabledGlobally: true,
  returnsEnabledGlobally: true,
};

function toNumber(value: MoneyLike): number {
  if (value == null) return 0;
  const raw = typeof value === 'object' ? value.toString() : String(value);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOfferType(value: ProductTrustInput['deliveryOfferType']): 'DEFAULT' | 'FREE' | 'FIXED' {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : value;
  return normalized === 'FREE' || normalized === 'FIXED' ? normalized : 'DEFAULT';
}

function isProductSellable(product: ProductTrustInput): boolean {
  if (product.deletedAt) return false;
  if (product.isActive === false) return false;
  if (typeof product.inStock === 'boolean') return product.inStock;
  const stock = product.stock ?? product.quantity ?? 0;
  return stock > 0;
}

function hasActiveProductDeliveryOffer(product: ProductTrustInput, now: Date): boolean {
  return isDeliveryOfferActive(
    {
      id: product.id || 'product',
      name: product.name || null,
      deliveryOfferEnabled: product.deliveryOfferEnabled,
      deliveryOfferType: product.deliveryOfferType,
      deliveryOfferAmount: product.deliveryOfferAmount,
      deliveryOfferStartDate: product.deliveryOfferStartDate,
      deliveryOfferEndDate: product.deliveryOfferEndDate,
      deliveryOfferBadgeText: product.deliveryOfferBadgeText,
    },
    now,
  );
}

export function resolveProductTrustBadges(
  product: ProductTrustInput,
  policy: ShopTrustPolicy = {},
): ProductTrustBadges {
  const now = policy.now ?? new Date();
  const sellable = isProductSellable(product);
  const offerType = normalizeOfferType(product.deliveryOfferType);
  const hasActiveOffer = sellable && hasActiveProductDeliveryOffer(product, now);
  const productPrice = toNumber(product.price);
  const meetsOptionalGlobalThreshold =
    policy.freeDeliveryMinOrderAmount == null || productPrice >= toNumber(policy.freeDeliveryMinOrderAmount);

  const freeShippingEligible = Boolean(
    sellable &&
      product.isFragile !== true &&
      hasActiveOffer &&
      offerType === 'FREE' &&
      meetsOptionalGlobalThreshold
  );

  const hasFixedDeliveryOffer = Boolean(sellable && hasActiveOffer && offerType === 'FIXED');
  const rawDeliveryBadge = hasActiveOffer ? getDeliveryOfferBadgeText({
    id: product.id || 'product',
    name: product.name || null,
    deliveryOfferEnabled: product.deliveryOfferEnabled,
    deliveryOfferType: product.deliveryOfferType,
    deliveryOfferAmount: product.deliveryOfferAmount,
    deliveryOfferStartDate: product.deliveryOfferStartDate,
    deliveryOfferEndDate: product.deliveryOfferEndDate,
    deliveryOfferBadgeText: product.deliveryOfferBadgeText,
  }) : null;

  const isCODAvailable = Boolean(
    sellable &&
      policy.codEnabledGlobally !== false &&
      product.codAvailable === true
  );

  const returnEligible = Boolean(
    sellable &&
      policy.returnsEnabledGlobally !== false &&
      product.returnEligible === true
  );

  const authenticityBadge = Boolean(
    product.authenticityBadge === true ||
      (product.authenticityBadge !== false &&
        (policy.authenticityGuaranteed ?? DEFAULT_SHOP_TRUST_POLICY.authenticityGuaranteed))
  );

  const badges: ShopTrustBadge[] = [];
  if (authenticityBadge) badges.push('authentic');
  if (isCODAvailable) badges.push('cod');
  if (returnEligible) badges.push('return');
  if (freeShippingEligible) badges.push('free-delivery');
  else if (hasFixedDeliveryOffer) badges.push('delivery-offer');

  return {
    isCODAvailable,
    freeShippingEligible,
    returnEligible,
    authenticityBadge,
    deliveryBadge: freeShippingEligible ? (rawDeliveryBadge || 'Free Delivery') : rawDeliveryBadge,
    badges,
  };
}
