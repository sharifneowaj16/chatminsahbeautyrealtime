import type { Product, ShopFilters, SortOption, ActiveFilter } from '@/types/product';

export const SHOP_LEGACY_QUERY_PARAM_MAP = {
  mfCategory: 'category',
  mfBrand: 'brand',
  mfMinPrice: 'minPrice',
  mfMaxPrice: 'maxPrice',
  mfSort: 'sort',
  search: 'q',
  inStockOnly: 'inStock',
} as const;

type ShopQueryParamRecord = Record<string, string | string[] | undefined>;
type ShopQueryParamLike = {
  get: (key: string) => string | null;
  entries: () => Iterable<[string, string]>;
};
type ShopQueryParamInput = ShopQueryParamLike | ShopQueryParamRecord;

function isSearchParamLike(input: ShopQueryParamInput): input is ShopQueryParamLike {
  return typeof (input as ShopQueryParamLike).get === 'function' && typeof (input as ShopQueryParamLike).entries === 'function';
}

const SHOP_MULTI_VALUE_KEYS = new Set(['brand', 'skinType', 'skinConcern', 'tags']);

function splitCsv(value: string | null | undefined): string[] | undefined {
  if (!value) return undefined;
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function firstRecordValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.find((item) => item != null && item !== '');
  return value || undefined;
}

function readParam(input: ShopQueryParamInput, key: string): string | undefined {
  if (isSearchParamLike(input)) {
    return input.get(key) || undefined;
  }
  return firstRecordValue(input[key]);
}

function appendParam(params: URLSearchParams, key: string, value: string | string[] | undefined): void {
  if (value == null) return;
  const normalizedValue = Array.isArray(value) ? value.join(',') : value;
  const trimmed = normalizedValue.trim();
  if (!trimmed) return;

  const existing = params.get(key);
  if (existing && SHOP_MULTI_VALUE_KEYS.has(key)) {
    const merged = Array.from(new Set([...existing.split(','), ...trimmed.split(',')].map((item) => item.trim()).filter(Boolean)));
    params.set(key, merged.join(','));
    return;
  }

  if (!existing) params.set(key, trimmed);
}

export function hasLegacyShopQueryParams(input: ShopQueryParamInput): boolean {
  return Object.keys(SHOP_LEGACY_QUERY_PARAM_MAP).some((key) => Boolean(readParam(input, key)));
}

export function normalizeShopSearchParams(input: ShopQueryParamInput): URLSearchParams {
  const params = new URLSearchParams();

  const entries = isSearchParamLike(input)
    ? Array.from(input.entries())
    : Object.entries(input).flatMap(([key, value]) => {
        if (Array.isArray(value)) return value.map((item) => [key, item] as [string, string]);
        return value == null ? [] : [[key, value] as [string, string]];
      });

  const legacyKeys = new Set(Object.keys(SHOP_LEGACY_QUERY_PARAM_MAP));
  const standardEntries = entries.filter(([rawKey]) => !legacyKeys.has(rawKey));
  const legacyEntries = entries.filter(([rawKey]) => legacyKeys.has(rawKey));

  standardEntries.forEach(([rawKey, value]) => appendParam(params, rawKey, value));

  // Standard keys win if both old and new params are present.
  legacyEntries.forEach(([rawKey, value]) => {
    const canonicalKey = SHOP_LEGACY_QUERY_PARAM_MAP[rawKey as keyof typeof SHOP_LEGACY_QUERY_PARAM_MAP];
    if (!params.has(canonicalKey)) appendParam(params, canonicalKey, value);
  });

  return params;
}

export function buildCanonicalShopPath(input: ShopQueryParamInput, pathname = '/shop'): string {
  const params = normalizeShopSearchParams(input);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

// URL State Management. Read deprecated mf* URLs, but expose only standard filters.
export function parseSearchParams(searchParams: ShopQueryParamInput): ShopFilters {
  const params = normalizeShopSearchParams(searchParams);
  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const rating = params.get('rating');
  const page = params.get('page');

  return {
    category: params.get('category') || undefined,
    subcategory: params.get('subcategory') || undefined,
    brand: splitCsv(params.get('brand')),
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    skinType: splitCsv(params.get('skinType')),
    skinConcern: splitCsv(params.get('skinConcern')),
    rating: rating ? Number(rating) : undefined,
    tags: splitCsv(params.get('tags')),
    inStockOnly: params.get('inStock') === 'true',
    saleOnly: params.get('saleOnly') === 'true',
    search: params.get('q') || undefined,
    sort: (params.get('sort') as SortOption) || 'featured',
    page: page ? Number(page) : 1,
  };
}

export function buildSearchParams(filters: Partial<ShopFilters>): string {
  const params = new URLSearchParams();

  if (filters.category) params.set('category', Array.isArray(filters.category) ? filters.category.join(',') : filters.category.toString());
  if (filters.subcategory) params.set('subcategory', Array.isArray(filters.subcategory) ? filters.subcategory.join(',') : filters.subcategory.toString());
  if (filters.brand) {
    const brands = Array.isArray(filters.brand) ? filters.brand : [filters.brand];
    if (brands.length > 0) params.set('brand', brands.join(','));
  }
  if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
  if (filters.skinType) {
    const skinTypes = Array.isArray(filters.skinType) ? filters.skinType : [filters.skinType];
    if (skinTypes.length > 0) params.set('skinType', skinTypes.join(','));
  }
  if (filters.skinConcern) {
    const skinConcerns = Array.isArray(filters.skinConcern) ? filters.skinConcern : [filters.skinConcern];
    if (skinConcerns.length > 0) params.set('skinConcern', skinConcerns.join(','));
  }
  if (filters.rating) params.set('rating', filters.rating.toString());
  if (filters.tags) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    if (tags.length > 0) params.set('tags', tags.join(','));
  }
  if (filters.inStockOnly) params.set('inStock', 'true');
  if (filters.saleOnly) params.set('saleOnly', 'true');
  if (filters.search) params.set('q', filters.search);
  if (filters.sort && filters.sort !== 'featured') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', filters.page.toString());

  return params.toString();
}

// Filter products based on criteria
export function filterProducts(products: Product[], filters: ShopFilters): Product[] {
  let filtered = [...products];

  // Category filter
  if (filters.category) {
    filtered = filtered.filter(p => p.categorySlug === filters.category);
  }

  // Subcategory filter
  if (filters.subcategory) {
    filtered = filtered.filter(p => p.subcategorySlug === filters.subcategory);
  }

  // Brand filter
  if (filters.brand && filters.brand.length > 0) {
    const brands = Array.isArray(filters.brand) ? filters.brand : [filters.brand];
    filtered = filtered.filter(p => brands.includes(p.brandSlug));
  }

  // Price range filter
  if (filters.minPrice !== undefined) {
    filtered = filtered.filter(p => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice!);
  }

  // Skin type filter
  if (filters.skinType && filters.skinType.length > 0) {
    const skinTypes = Array.isArray(filters.skinType) ? filters.skinType : [filters.skinType];
    filtered = filtered.filter(p =>
      p.skinType && p.skinType.some(st => skinTypes.includes(st))
    );
  }

  // Skin concern filter
  if (filters.skinConcern && filters.skinConcern.length > 0) {
    const concerns = Array.isArray(filters.skinConcern) ? filters.skinConcern : [filters.skinConcern];
    filtered = filtered.filter(p =>
      p.skinConcerns && p.skinConcerns.some(sc => concerns.includes(sc))
    );
  }

  // Rating filter
  if (filters.rating) {
    filtered = filtered.filter(p => p.rating >= filters.rating!);
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    filtered = filtered.filter(p => {
      const productTags = [
        ...(p.isVegan ? ['vegan'] : []),
        ...(p.isCrueltyFree ? ['cruelty-free'] : []),
        ...(p.isOrganic ? ['organic'] : []),
        ...(p.isHalalCertified ? ['halal'] : []),
        ...p.tags.map(t => t.toLowerCase()),
      ];
      return tags.some(tag => productTags.includes(tag.toLowerCase()));
    });
  }

  // In stock filter
  if (filters.inStockOnly) {
    filtered = filtered.filter(p => p.stock > 0);
  }

  // Sale filter
  if (filters.saleOnly) {
    filtered = filtered.filter(p => p.discount && p.discount > 0);
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.brand.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  return filtered;
}

// Sort products
export function sortProducts(products: Product[], sortBy: SortOption): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'best-selling':
      return sorted.sort((a, b) => b.salesCount - a.salesCount);
    case 'price-low-high':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high-low':
      return sorted.sort((a, b) => b.price - a.price);
    case 'highest-rated':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'biggest-discount':
      return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    case 'a-z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'z-a':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'featured':
    default:
      return sorted.sort((a, b) => {
        // Featured logic: Best sellers + high rated + new
        const scoreA = (a.salesCount * 0.4) + (a.rating * 20 * 0.3) + (a.isNew ? 50 : 0) + (a.isBestSeller ? 30 : 0);
        const scoreB = (b.salesCount * 0.4) + (b.rating * 20 * 0.3) + (b.isNew ? 50 : 0) + (b.isBestSeller ? 30 : 0);
        return scoreB - scoreA;
      });
  }
}

// Get active filters for display
export function getActiveFilters(filters: ShopFilters): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  if (filters.category) {
    active.push({
      type: 'category',
      label: `Category: ${filters.category}`,
      value: filters.category.toString(),
      param: 'category',
    });
  }

  if (filters.subcategory) {
    active.push({
      type: 'subcategory',
      label: `Subcategory: ${filters.subcategory}`,
      value: filters.subcategory.toString(),
      param: 'subcategory',
    });
  }

  if (filters.brand && Array.isArray(filters.brand)) {
    filters.brand.forEach(brand => {
      active.push({
        type: 'brand',
        label: brand,
        value: brand,
        param: 'brand',
      });
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice || 0;
    const max = filters.maxPrice || Infinity;
    active.push({
      type: 'price',
      label: `৳${formatPrice(min)} - ৳${formatPrice(max)}`,
      value: `${min}-${max}`,
      param: 'price',
    });
  }

  if (filters.skinType && Array.isArray(filters.skinType)) {
    filters.skinType.forEach(type => {
      active.push({
        type: 'skinType',
        label: `Skin: ${type}`,
        value: type,
        param: 'skinType',
      });
    });
  }

  if (filters.skinConcern && Array.isArray(filters.skinConcern)) {
    filters.skinConcern.forEach(concern => {
      active.push({
        type: 'skinConcern',
        label: concern,
        value: concern,
        param: 'skinConcern',
      });
    });
  }

  if (filters.rating) {
    active.push({
      type: 'rating',
      label: `${filters.rating}★ & above`,
      value: filters.rating.toString(),
      param: 'rating',
    });
  }

  if (filters.tags && Array.isArray(filters.tags)) {
    filters.tags.forEach(tag => {
      active.push({
        type: 'tag',
        label: tag,
        value: tag,
        param: 'tags',
      });
    });
  }

  if (filters.inStockOnly) {
    active.push({
      type: 'availability',
      label: 'In Stock Only',
      value: 'true',
      param: 'inStockOnly',
    });
  }

  if (filters.saleOnly) {
    active.push({
      type: 'availability',
      label: 'Sale Items',
      value: 'true',
      param: 'saleOnly',
    });
  }

  return active;
}

// Format price with BDT
export function formatPrice(price: number): string {
  return price.toLocaleString('en-BD');
}

// Calculate savings
export function calculateSavings(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return originalPrice - price;
}

// Generate SEO-friendly title
export function generatePageTitle(filters: ShopFilters): string {
  const parts: string[] = [];

  if (filters.category) {
    const cat = Array.isArray(filters.category) ? filters.category[0] : filters.category;
    if (cat) parts.push(cat.charAt(0).toUpperCase() + cat.slice(1));
  }
  if (filters.subcategory) {
    const sub = Array.isArray(filters.subcategory) ? filters.subcategory[0] : filters.subcategory;
    if (sub) parts.push(sub.charAt(0).toUpperCase() + sub.slice(1));
  }
  if (filters.brand && Array.isArray(filters.brand) && filters.brand.length === 1) {
    parts.push(filters.brand[0]);
  }

  if (parts.length === 0) {
    return 'Shop Beauty Products | Buy Cosmetics Online';
  }

  return `${parts.join(' ')} Products | Buy ${parts.join(' ')} Online`;
}

// Generate meta description
export function generateMetaDescription(filters: ShopFilters, totalProducts?: number): string {
  const parts: string[] = [];

  if (totalProducts && totalProducts > 0) {
    parts.push(`Shop ${totalProducts}`);
  } else {
    parts.push('Shop authentic');
  }

  if (filters.brand && Array.isArray(filters.brand) && filters.brand.length > 0) {
    parts.push(filters.brand.join(', '));
  }
  if (filters.category) {
    const cat = Array.isArray(filters.category) ? filters.category.join(', ') : filters.category;
    parts.push(cat);
  }
  if (filters.subcategory) {
    const sub = Array.isArray(filters.subcategory) ? filters.subcategory.join(', ') : filters.subcategory;
    parts.push(sub);
  }

  parts.push('beauty, skincare, makeup and personal care products');

  if (filters.minPrice && filters.maxPrice) {
    parts.push(`under ৳${formatPrice(filters.maxPrice)}`);
  }

  parts.push('in Bangladesh. Cash on Delivery, bKash/Nagad payment and fast delivery available.');

  return parts.join(' ');
}
