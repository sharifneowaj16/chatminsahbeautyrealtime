import { normalizeShopSearchParams } from '@/lib/shopUtils';

export type CatalogSearchParamRecord = Record<string, string | string[] | undefined>;
export type CatalogSearchParamLike = {
  get: (key: string) => string | null;
  entries: () => Iterable<[string, string]>;
};
export type CatalogSearchParamInput = CatalogSearchParamRecord | CatalogSearchParamLike;

const CATALOG_QUERY_KEYS = [
  'q',
  'category',
  'subcategory',
  'brand',
  'minPrice',
  'maxPrice',
  'skinType',
  'skinConcern',
  'rating',
  'tags',
  'inStock',
  'saleOnly',
  'sort',
  'page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ttclid',
] as const;

const SEARCH_SORT_TO_SHOP_SORT: Record<string, string> = {
  relevance: 'featured',
  price_asc: 'price-low-high',
  price_desc: 'price-high-low',
  rating: 'highest-rated',
  rating_desc: 'highest-rated',
  popularity: 'best-selling',
  name_asc: 'a-z',
  name_desc: 'z-a',
  discount_desc: 'biggest-discount',
};

function setTrimmed(params: URLSearchParams, key: string, value: string | null | undefined): void {
  const normalized = value?.trim();
  if (normalized) params.set(key, normalized);
}

export function normalizeCatalogNavigationParams(input: CatalogSearchParamInput): URLSearchParams {
  const source = normalizeShopSearchParams(input);
  const values = new Map<string, string>();

  const query = source.get('q') || source.get('query') || source.get('keyword') || source.get('term') || source.get('searchTerm');
  if (query?.trim()) values.set('q', query.trim());

  const minPrice = source.get('minPrice') || source.get('min');
  const maxPrice = source.get('maxPrice') || source.get('max');
  if (minPrice?.trim()) values.set('minPrice', minPrice.trim());
  if (maxPrice?.trim()) values.set('maxPrice', maxPrice.trim());

  const inStock = source.get('inStock') || source.get('stock');
  if (inStock === 'true') values.set('inStock', 'true');
  if (source.get('saleOnly') === 'true') values.set('saleOnly', 'true');

  const rawSort = source.get('sort');
  if (rawSort) {
    const canonicalSort = SEARCH_SORT_TO_SHOP_SORT[rawSort] || rawSort;
    if (canonicalSort !== 'featured') values.set('sort', canonicalSort);
  }

  const page = Number.parseInt(source.get('page') || '1', 10);
  if (Number.isFinite(page) && page > 1) values.set('page', String(page));

  const managedKeys = new Set(['q', 'minPrice', 'maxPrice', 'inStock', 'saleOnly', 'sort', 'page']);
  CATALOG_QUERY_KEYS.forEach((key) => {
    if (managedKeys.has(key) || values.has(key)) return;
    const value = source.get(key);
    if (value?.trim()) values.set(key, value.trim());
  });

  const params = new URLSearchParams();
  CATALOG_QUERY_KEYS.forEach((key) => setTrimmed(params, key, values.get(key)));
  return params;
}

export function buildCatalogPath(
  input: CatalogSearchParamInput = {},
  pathname = '/shop'
): string {
  const params = normalizeCatalogNavigationParams(input);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

export function buildCatalogSearchPath(
  query: string,
  currentParams?: CatalogSearchParamInput
): string {
  const params = currentParams
    ? normalizeCatalogNavigationParams(currentParams)
    : new URLSearchParams();
  const normalizedQuery = query.trim();

  if (normalizedQuery) params.set('q', normalizedQuery);
  else params.delete('q');
  params.delete('page');

  return buildCatalogPath(params);
}

export function mapAdvancedSearchSort(sort: {
  value: 'name' | 'price' | 'rating' | 'newest';
  direction: 'asc' | 'desc';
}): string | undefined {
  if (sort.value === 'newest') return 'newest';
  if (sort.value === 'rating') return 'highest-rated';
  if (sort.value === 'name') return sort.direction === 'desc' ? 'z-a' : 'a-z';
  if (sort.value === 'price') return sort.direction === 'desc' ? 'price-high-low' : 'price-low-high';
  return undefined;
}
