/**
 * lib/search/productTransformer.ts
 *
 * Transforms a Prisma Product (with relations) into an
 * Elasticsearch document matching our index mapping.
 */
import { resolveProductTrustBadges } from '@/lib/shopTrust';


interface ProductWithRelations {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: any; // Decimal
  compareAtPrice?: any | null;
  quantity?: number;
  sku?: string;
  isActive?: boolean;
  deletedAt?: Date | string | null;
  status?: string | null;
  visibility?: string | null;
  isFeatured?: boolean;
  isNew?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  focusKeyword?: string | null;
  secondaryKeywords?: string[];
  bengaliFocusKeyword?: string | null;
  bengaliSecondaryKeywords?: string[];
  searchTags?: string[];
  synonyms?: string[];
  banglaSearchTerms?: string[];
  buyingIntentKeywords?: string[];
  reviewKeywords?: string[];
  entities?: string[];
  keyBenefits?: string[];
  ingredients?: string | null;
  flashSaleEligible?: boolean;
  codAvailable?: boolean;
  returnEligible?: boolean;
  isFragile?: boolean;
  deliveryOfferEnabled?: boolean | null;
  deliveryOfferType?: 'DEFAULT' | 'FREE' | 'FIXED' | string | null;
  deliveryOfferAmount?: any | null;
  deliveryOfferStartDate?: Date | string | null;
  deliveryOfferEndDate?: Date | string | null;
  deliveryOfferBadgeText?: string | null;
  averageRating?: any | null;
  reviewCount?: number | null;
  viewCount?: number | null;
  orderCount?: number | null;
  confirmedOrderCount?: number | null;
  deliveredOrderCount?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
      parent?: { name: string; slug: string } | null;
    } | null;
  } | null;
  brand?: { name: string; slug: string } | null;
  reviews?: Array<{ rating: number }>;
}

export interface ESProductDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  categoryName: string;
  subcategory: string;
  subcategorySlug: string;
  subcategoryName: string;
  categoryHierarchy: string[];
  categorySlugHierarchy: string[];
  price: number;
  compareAtPrice: number | null;
  discount: number;
  stock: number;
  inStock: boolean;
  isActive: boolean;
  deletedAt: Date | string | null;
  status: 'active' | 'inactive' | 'deleted' | 'draft' | 'published' | string;
  visibility: 'public' | 'hidden' | string;
  rating: number;
  reviewCount: number;
  codAvailable: boolean;
  isCODAvailable: boolean;
  freeShippingEligible: boolean;
  returnEligible: boolean;
  authenticityBadge: boolean;
  deliveryBadge: string | null;
  badges: string[];
  image: string;
  images: string[];
  sku: string;
  tags: string[];
  focusKeyword: string;
  secondaryKeywords: string[];
  searchTags: string[];
  synonyms: string[];
  banglaSearchTerms: string[];
  buyingIntentKeywords: string[];
  reviewKeywords: string[];
  entities: string[];
  ingredients: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isFlashSale: boolean;
  isFavourite: boolean;
  isRecommended: boolean;
  isForYou: boolean;
  createdAt: Date;
  updatedAt: Date;
  suggest: { input: string[]; weight: number };
  popularityScore: number;
  searchClickCount: number;
  viewCount: number;
  salesCount: number;
}

/**
 * Build category hierarchy array from nested category.
 */
function buildCategoryHierarchy(
  category: ProductWithRelations['category'],
  key: 'name' | 'slug' = 'name'
): string[] {
  if (!category) return [];

  const hierarchy: string[] = [category[key]];

  if (category.parent) {
    hierarchy.unshift(category.parent[key]);
    if (category.parent.parent) {
      hierarchy.unshift(category.parent.parent[key]);
    }
  }

  return hierarchy.filter(Boolean);
}

/**
 * Build autocomplete suggestions from product name and brand.
 */
function buildSuggestions(
  product: ProductWithRelations
): { input: string[]; weight: number } {
  const inputs = new Set<string>();

  // Full name
  inputs.add(product.name);

  // Individual words from name (>2 chars)
  const words = product.name.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) inputs.add(word);

  // Brand
  if (product.brand?.name) inputs.add(product.brand.name);

  // Category
  if (product.category?.name) inputs.add(product.category.name);

  [
    product.focusKeyword,
    product.bengaliFocusKeyword,
    ...(product.secondaryKeywords || []),
    ...(product.bengaliSecondaryKeywords || []),
    ...(product.searchTags || []),
    ...(product.synonyms || []),
    ...(product.banglaSearchTerms || []),
    ...(product.buyingIntentKeywords || []),
    ...(product.reviewKeywords || []),
    ...(product.entities || []),
  ].filter(Boolean).forEach((value) => inputs.add(String(value)));

  // Weight: featured products get higher weight
  let weight = 1;
  if (product.isFeatured) weight += 5;
  if (product.isNew) weight += 2;

  // Reviews boost
  const reviewCount = product.reviews?.length ?? 0;
  if (reviewCount > 10) weight += 3;
  else if (reviewCount > 5) weight += 1;

  return { input: [...inputs], weight };
}

/**
 * Transform a Prisma Product into an ES document.
 */
export function isSellableSearchProduct(product: Pick<ProductWithRelations, 'isActive' | 'deletedAt'>): boolean {
  return product.isActive === true && product.deletedAt == null;
}

export function transformProductToES(
  product: ProductWithRelations
): ESProductDocument {
  const price = parseFloat(product.price?.toString() ?? '0');
  const compareAtPrice = product.compareAtPrice
    ? parseFloat(product.compareAtPrice.toString())
    : null;

  const discount =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const reviews = product.reviews ?? [];
  const rating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
        ) / 10
      : parseFloat(product.averageRating?.toString() ?? '0') || 0;
  const reviewCount = product.reviewCount ?? reviews.length;
  const salesCount = product.deliveredOrderCount ?? product.confirmedOrderCount ?? product.orderCount ?? 0;
  const stock = product.quantity ?? 0;
  const trustBadges = resolveProductTrustBadges({
    ...product,
    price,
    stock,
  });

  const hierarchy = buildCategoryHierarchy(product.category, 'name');
  const slugHierarchy = buildCategoryHierarchy(product.category, 'slug');
  const isSellable = isSellableSearchProduct(product);
  const status = product.status || (product.deletedAt ? 'deleted' : isSellable ? 'active' : 'inactive');
  const visibility = product.visibility || (isSellable ? 'public' : 'hidden');
  const tags = [
    ...(product.metaKeywords ? product.metaKeywords.split(',') : []),
    ...(product.searchTags || []),
    ...(product.secondaryKeywords || []),
    ...(product.synonyms || []),
    ...(product.banglaSearchTerms || []),
    ...(product.buyingIntentKeywords || []),
  ].map((tag) => tag.trim()).filter(Boolean);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    brand: product.brand?.name || '',
    brandSlug: product.brand?.slug || '',
    // Phase 2: public shop URLs use slugs, so exact ES filters use slug-safe keyword fields.
    category: slugHierarchy[0] || '',
    categorySlug: slugHierarchy[0] || '',
    categoryName: hierarchy[0] || '',
    subcategory: slugHierarchy[1] || slugHierarchy[0] || '',
    subcategorySlug: slugHierarchy[1] || slugHierarchy[0] || '',
    subcategoryName: hierarchy[1] || hierarchy[0] || '',
    categoryHierarchy: hierarchy,
    categorySlugHierarchy: slugHierarchy,
    price,
    compareAtPrice,
    discount,
    stock,
    inStock: stock > 0,
    isActive: product.isActive === true,
    deletedAt: product.deletedAt ?? null,
    status,
    visibility,
    rating,
    reviewCount,
    codAvailable: trustBadges.isCODAvailable,
    isCODAvailable: trustBadges.isCODAvailable,
    freeShippingEligible: trustBadges.freeShippingEligible,
    returnEligible: trustBadges.returnEligible,
    authenticityBadge: trustBadges.authenticityBadge,
    deliveryBadge: trustBadges.deliveryBadge,
    badges: trustBadges.badges,
    image: product.images?.[0]?.url || '',
    images: product.images?.map((img) => img.url) || [],
    sku: product.sku || '',
    tags: [...new Set(tags)],
    focusKeyword: product.focusKeyword || '',
    secondaryKeywords: product.secondaryKeywords || [],
    searchTags: product.searchTags || [],
    synonyms: product.synonyms || [],
    banglaSearchTerms: product.banglaSearchTerms || [],
    buyingIntentKeywords: product.buyingIntentKeywords || [],
    reviewKeywords: product.reviewKeywords || [],
    entities: product.entities || [],
    ingredients: product.ingredients || '',
    isFeatured: product.isFeatured || false,
    isNewArrival: product.isNew || false,
    isFlashSale: product.flashSaleEligible || false,
    isFavourite: false,
    isRecommended: false,
    isForYou: false,
    createdAt: product.createdAt || new Date(),
    updatedAt: product.updatedAt || new Date(),
    suggest: buildSuggestions(product),
    popularityScore: 0,
    searchClickCount: 0,
    viewCount: product.viewCount ?? 0,
    salesCount,
  };
}
