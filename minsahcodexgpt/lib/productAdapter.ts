import type { Product as AdminProduct } from '@/contexts/ProductsContext';
import type { Product as ShopProduct } from '@/types/product';
import { resolveProductTrustBadges } from '@/lib/shopTrust';

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function adminProductToShopProduct(p: AdminProduct): ShopProduct {
  const slug = p.urlSlug || toSlug(p.name);
  const createdAt = p.createdAt ? new Date(p.createdAt) : new Date();
  const isNew = p.isNew ?? Date.now() - createdAt.getTime() < 30 * 24 * 60 * 60 * 1000;
  const metrics = p as AdminProduct & {
    viewCount?: number;
    views?: number;
    orderCount?: number;
    confirmedOrderCount?: number;
    deliveredOrderCount?: number;
  };

  const discount =
    p.originalPrice != null && p.originalPrice > p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : undefined;
  const trustBadges = resolveProductTrustBadges({
    ...(p as AdminProduct & {
      deliveryOfferEnabled?: boolean;
      deliveryOfferType?: string;
      deliveryOfferAmount?: number | string | null;
      deliveryOfferStartDate?: string | Date | null;
      deliveryOfferEndDate?: string | Date | null;
      deliveryOfferBadgeText?: string | null;
    }),
    stock: p.stock,
    price: p.price,
  });

  return {
    id: p.id,
    name: p.name,
    slug,
    brand: p.brand,
    brandSlug: toSlug(p.brand),
    price: p.price,
    originalPrice: p.originalPrice,
    discount,
    image: p.image,
    images: p.images?.length ? p.images : [p.image],
    sku: p.barcode || p.id,
    stock: p.stock,
    category: p.category,
    categorySlug: toSlug(p.category),
    subcategory: p.subcategory,
    subcategorySlug: p.subcategory ? toSlug(p.subcategory) : undefined,
    rating: p.rating,
    reviewCount: p.reviews,
    description: p.description || '',
    shortDescription: p.description ? p.description.substring(0, 100) : p.name,
    isNew,
    isBestSeller: false,
    isExclusive: false,
    isTrending: p.featured,
    skinType: p.skinType as ShopProduct['skinType'],
    skinConcerns: [],
    tags: p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    isVegan: false,
    isCrueltyFree: false,
    isOrganic: false,
    isHalalCertified: false,
    isBSTIApproved: false,
    isImported: p.originCountry !== 'Bangladesh (Local)',
    hasVariants: !!(p.variants && p.variants.length > 1),
    variants: p.variants?.map((variant) => ({
      id: variant.id,
      name: variant.size || variant.color || variant.sku,
      option: variant.size ? 'Size' : variant.color ? 'Color' : 'Variant',
      value: variant.size || variant.color || variant.sku,
      price: Number(variant.price || p.price),
      stock: Number(variant.stock || 0),
      sku: variant.sku,
      image: variant.image,
    })),
    isCODAvailable: trustBadges.isCODAvailable,
    isSameDayDelivery: false,
    freeShippingEligible: trustBadges.freeShippingEligible,
    returnEligible: trustBadges.returnEligible,
    authenticityBadge: trustBadges.authenticityBadge,
    deliveryBadge: trustBadges.deliveryBadge,
    badges: trustBadges.badges,
    deliveryDays: 3,
    isEMIAvailable: false,
    views: metrics.viewCount ?? metrics.views ?? 0,
    salesCount: metrics.deliveredOrderCount ?? metrics.confirmedOrderCount ?? metrics.orderCount ?? p.soldCount ?? 0,
    createdAt,
    updatedAt: createdAt,
  };
}
