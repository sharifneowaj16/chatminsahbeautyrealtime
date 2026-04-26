'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { filterProducts, sortProducts, parseSearchParams } from '@/lib/shopUtils';
import ProductCard from './ProductCard';
import ActiveFilters from './ActiveFilters';
import type { Product as ShopProduct, SortOption } from '@/types/product';

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  price: number;
  originalPrice: number | null;
  image: string;
  images: string[];
  sku: string;
  stock: number;
  category: string;
  categorySlug: string;
  rating: number;
  reviews: number;
  description: string;
  shortDescription: string;
  featured: boolean;
  isNew: boolean;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

// Maps an Elasticsearch product source to ApiProduct shape
interface EsProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  images?: string[];
  inStock?: boolean;
  rating?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

function esProductToApiProduct(p: EsProduct): ApiProduct {
  const images = p.images ?? [];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug || toSlug(p.name),
    brand: p.brand ?? '',
    brandSlug: toSlug(p.brand ?? ''),
    price: p.price,
    originalPrice: p.compareAtPrice ?? null,
    image: images[0] ?? '',
    images,
    sku: '',
    stock: p.inStock ? 1 : 0,
    category: p.category ?? '',
    categorySlug: toSlug(p.category ?? ''),
    rating: p.rating ?? 0,
    reviews: 0,
    description: p.description ?? '',
    shortDescription: p.description?.substring(0, 100) ?? p.name,
    featured: false,
    isNew: false,
    tags: Array.isArray(p.tags) ? p.tags.join(',') : (p.tags ?? ''),
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };
}

function apiProductToShopProduct(p: ApiProduct): ShopProduct {
  const createdAt = new Date(p.createdAt);
  const discount =
    p.originalPrice != null && p.originalPrice > p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
      : undefined;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug || toSlug(p.name),
    brand: p.brand,
    brandSlug: p.brandSlug || toSlug(p.brand),
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    discount,
    image: p.image,
    images: p.images?.length ? p.images : [p.image],
    sku: p.sku,
    stock: p.stock,
    category: p.category,
    categorySlug: p.categorySlug || toSlug(p.category),
    rating: p.rating,
    reviewCount: p.reviews,
    description: p.description || '',
    shortDescription: p.shortDescription || p.description?.substring(0, 100) || p.name,
    isNew: p.isNew,
    isBestSeller: false,
    isExclusive: false,
    isTrending: p.featured,
    skinType: undefined,
    skinConcerns: [],
    tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    isVegan: false,
    isCrueltyFree: false,
    isOrganic: false,
    isHalalCertified: false,
    isBSTIApproved: false,
    isImported: false,
    hasVariants: false,
    isCODAvailable: true,
    isSameDayDelivery: false,
    freeShippingEligible: false,
    deliveryDays: 3,
    isEMIAvailable: false,
    views: 0,
    salesCount: 0,
    createdAt,
    updatedAt: new Date(p.updatedAt),
  };
}

export default function ShopGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [esTotal, setEsTotal] = useState<number | null>(null);
  const [esTotalPages, setEsTotalPages] = useState<number | null>(null);
  const [spellSuggestion, setSpellSuggestion] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [facets, setFacets] = useState<{ brands: { value: string; count: number }[] }>({ brands: [] });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSortFlags, setSelectedSortFlags] = useState<string[]>([]);
  const [priceMinInput, setPriceMinInput] = useState('');
  const [priceMaxInput, setPriceMaxInput] = useState('');

  const q = searchParams.get('q') || '';
  const filters = parseSearchParams(searchParams as unknown as URLSearchParams);
  const page = filters.page || 1;
  const pageSize = 20;

  useEffect(() => {
    const categories = (searchParams.get('mfCategory') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const brands = (searchParams.get('mfBrand') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const sortFlags = (searchParams.get('mfSort') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    setSelectedCategories(categories);
    setSelectedBrands(brands);
    setSelectedSortFlags(sortFlags);
    setPriceMinInput(searchParams.get('mfMinPrice') || '');
    setPriceMaxInput(searchParams.get('mfMaxPrice') || '');
  }, [searchParams]);

  const updateUrlFilters = useCallback((patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete('page');
    router.push(`/shop${params.toString() ? `?${params.toString()}` : ''}`);
  }, [router, searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (q.trim()) {
          // ── Elasticsearch path ──────────────────────────────────────
          const params = new URLSearchParams();
          params.set('q', q);
          params.set('page', String(page));
          params.set('limit', String(pageSize));

          const category = searchParams.get('category');
          const brand = searchParams.get('brand');
          const minPrice = searchParams.get('minPrice');
          const maxPrice = searchParams.get('maxPrice');
          const sort = searchParams.get('sort');
          const inStock = searchParams.get('inStockOnly');
          const rating = searchParams.get('rating');

          if (category) params.set('category', category);
          if (brand) params.set('brand', brand);
          if (minPrice) params.set('minPrice', minPrice);
          if (maxPrice) params.set('maxPrice', maxPrice);
          if (sort) params.set('sort', sort);
          if (inStock === 'true') params.set('inStock', 'true');
          if (rating) params.set('rating', rating);

          const res = await fetch(`/api/search?${params.toString()}`);
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();

          // API returns products at root level: data.products, data.total, data.totalPages
          const esProducts: EsProduct[] = data.products ?? [];
          setAllProducts(esProducts.map((p) => apiProductToShopProduct(esProductToApiProduct(p))));
          setEsTotal(data.total ?? 0);
          setEsTotalPages(data.totalPages ?? 1);
          setSpellSuggestion(data.spellSuggestion ?? null);
          setFallbackMessage(data.fallback?.message ?? null);
          setFacets({ brands: data.facets?.brands ?? [] });
        } else {
          // ── Regular products API path ────────────────────────────────
          setEsTotal(null);
          setEsTotalPages(null);

          const params = new URLSearchParams({ limit: '100', activeOnly: 'true' });

          const category = searchParams.get('category');
          const brand = searchParams.get('brand');
          const search = searchParams.get('search');
          const minPrice = searchParams.get('minPrice');
          const maxPrice = searchParams.get('maxPrice');

          if (category) params.set('category', category);
          if (brand) params.set('brand', brand);
          if (search) params.set('search', search);
          if (minPrice) params.set('minPrice', minPrice);
          if (maxPrice) params.set('maxPrice', maxPrice);

          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch products');
          const data = await res.json();
          const apiProds: ApiProduct[] = data.products || [];
          setAllProducts(apiProds.map(apiProductToShopProduct));
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, q, page]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>();
    allProducts.forEach((product) => {
      if (!product.categorySlug) return;
      const existing = map.get(product.categorySlug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(product.categorySlug, {
          slug: product.categorySlug,
          label: product.category || product.categorySlug,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [allProducts]);

  const brandOptions = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>();
    allProducts.forEach((product) => {
      if (!product.brandSlug) return;
      const existing = map.get(product.brandSlug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(product.brandSlug, {
          slug: product.brandSlug,
          label: product.brand || product.brandSlug,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [allProducts]);

  const applyMultiSort = useCallback((products: ShopProduct[]) => {
    if (selectedSortFlags.length === 0) {
      return products;
    }
    return [...products].sort((a, b) => {
      const score = (product: ShopProduct) => {
        let total = 0;
        if (selectedSortFlags.includes('top-sale')) {
          total += (product.salesCount || 0) * 2 + (product.discount || 0);
        }
        if (selectedSortFlags.includes('top-rating')) {
          total += (product.rating || 0) * 40;
        }
        if (selectedSortFlags.includes('top-views')) {
          total += product.views || 0;
        }
        return total;
      };
      return score(b) - score(a);
    });
  }, [selectedSortFlags]);

  // For ES results, server already paginated; for regular, do client-side
  const filteredProducts = useMemo(() => {
    if (q.trim()) {
      // ES already returned the right page
      let next = allProducts;
      if (selectedCategories.length > 0) {
        next = next.filter((product) => selectedCategories.includes(product.categorySlug));
      }
      if (selectedBrands.length > 0) {
        next = next.filter((product) => selectedBrands.includes(product.brandSlug));
      }
      if (priceMinInput) {
        next = next.filter((product) => product.price >= Number(priceMinInput));
      }
      if (priceMaxInput) {
        next = next.filter((product) => product.price <= Number(priceMaxInput));
      }
      return applyMultiSort(next);
    }
    let next = filterProducts(allProducts, filters);
    if (selectedCategories.length > 0) {
      next = next.filter((product) => selectedCategories.includes(product.categorySlug));
    }
    if (selectedBrands.length > 0) {
      next = next.filter((product) => selectedBrands.includes(product.brandSlug));
    }
    if (priceMinInput) {
      next = next.filter((product) => product.price >= Number(priceMinInput));
    }
    if (priceMaxInput) {
      next = next.filter((product) => product.price <= Number(priceMaxInput));
    }
    const sorted = sortProducts(next, (filters.sort || 'featured') as SortOption);
    return applyMultiSort(sorted);
  }, [
    q,
    allProducts,
    filters,
    selectedCategories,
    selectedBrands,
    priceMinInput,
    priceMaxInput,
    applyMultiSort,
  ]);

  const displayProducts = useMemo(() => {
    if (q.trim()) {
      return filteredProducts;
    }
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [q, filteredProducts, page]);

  const totalCount = q.trim() ? (esTotal ?? filteredProducts.length) : filteredProducts.length;

  const totalPages = q.trim()
    ? (esTotalPages ?? 1)
    : Math.ceil(totalCount / pageSize);

  const start = (page - 1) * pageSize;
  const hasMore = page < totalPages;

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="w-full aspect-square bg-minsah-accent/30 rounded-lg mb-3" />
            <div className="h-4 bg-minsah-accent/30 rounded w-3/4 mb-2" />
            <div className="h-4 bg-minsah-accent/30 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Handler for spell correction click
  const applySpellSuggestion = () => {
    if (!spellSuggestion) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', spellSuggestion);
    router.push(`/shop?${params.toString()}`);
  };

  const toggleSelection = (
    currentItems: string[],
    value: string,
    queryKey: string
  ) => {
    const nextItems = currentItems.includes(value)
      ? currentItems.filter((item) => item !== value)
      : [...currentItems, value];
    updateUrlFilters({ [queryKey]: nextItems.length > 0 ? nextItems.join(',') : null });
  };

  return (
    <>
      {/* Did you mean? */}
      {spellSuggestion && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
          <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800">
            Did you mean:{' '}
            <button
              onClick={applySpellSuggestion}
              className="font-semibold text-minsah-primary underline underline-offset-2 hover:text-minsah-dark"
            >
              {spellSuggestion}
            </button>
            ?
          </span>
        </div>
      )}

      {/* Fallback notice */}
      {fallbackMessage && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-blue-600 flex-shrink-0" />
          {fallbackMessage}
        </div>
      )}

      {/* Multi Sort + Filter chips */}
      <div className="mb-4 space-y-4 rounded-2xl border border-minsah-accent bg-white p-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sort By (Multi-select)</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'top-sale', label: 'Top Sale' },
              { id: 'top-rating', label: 'Top Rating' },
              { id: 'top-views', label: 'Top Views' },
            ].map((item) => (
              <button
                key={item.id}
                      onClick={() => toggleSelection(selectedSortFlags, item.id, 'mfSort')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedSortFlags.includes(item.id)
                    ? 'bg-minsah-primary text-white border-minsah-primary'
                    : 'border-gray-200 text-gray-600 hover:border-minsah-primary hover:text-minsah-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {categoryOptions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => toggleSelection(selectedCategories, category.slug, 'mfCategory')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedCategories.includes(category.slug)
                      ? 'bg-minsah-primary text-white border-minsah-primary'
                      : 'border-gray-200 text-gray-600 hover:border-minsah-primary hover:text-minsah-primary'
                  }`}
                >
                  {category.label} <span className="opacity-70">({category.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {brandOptions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Brand</p>
            <div className="flex flex-wrap gap-2">
              {brandOptions.map((brand) => (
                <button
                  key={brand.slug}
                  onClick={() => toggleSelection(selectedBrands, brand.slug, 'mfBrand')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedBrands.includes(brand.slug)
                      ? 'bg-minsah-primary text-white border-minsah-primary'
                      : 'border-gray-200 text-gray-600 hover:border-minsah-primary hover:text-minsah-primary'
                  }`}
                >
                  {brand.label} <span className="opacity-70">({brand.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Price Range</p>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateUrlFilters({
                mfMinPrice: priceMinInput.trim() || null,
                mfMaxPrice: priceMaxInput.trim() || null,
              });
            }}
          >
            <input
              type="number"
              min="0"
              value={priceMinInput}
              onChange={(event) => setPriceMinInput(event.target.value)}
              placeholder="Min"
              className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minsah-primary/30"
            />
            <input
              type="number"
              min="0"
              value={priceMaxInput}
              onChange={(event) => setPriceMaxInput(event.target.value)}
              placeholder="Max"
              className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minsah-primary/30"
            />
            <button
              type="submit"
              className="rounded-lg bg-minsah-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-minsah-dark transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setPriceMinInput('');
                setPriceMaxInput('');
                updateUrlFilters({ mfMinPrice: null, mfMaxPrice: null });
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-minsah-primary hover:text-minsah-primary transition-colors"
            >
              Clear
            </button>
          </form>
        </div>
      </div>

      {/* Brand facet chips from search API */}
      {facets.brands.length > 0 && q.trim() && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Brand Facets</p>
          <div className="flex flex-wrap gap-2">
            {facets.brands.slice(0, 10).map(b => (
              <button
                key={b.value}
                onClick={() => toggleSelection(selectedBrands, toSlug(b.value), 'mfBrand')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedBrands.includes(toSlug(b.value))
                    ? 'bg-minsah-primary text-white border-minsah-primary'
                    : 'border-gray-200 text-gray-600 hover:border-minsah-primary hover:text-minsah-primary'
                }`}
              >
                {b.value} <span className="opacity-60">({b.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex-1">
          <ActiveFilters totalProducts={totalCount} />
        </div>
      </div>

      {displayProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Link
                href={`/shop?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  page: String(page + 1),
                }).toString()}`}
                className="px-6 py-3 bg-minsah-primary text-white rounded-lg hover:bg-minsah-dark transition-colors font-semibold flex items-center gap-2"
              >
                Load More Products
                <ChevronRight size={20} />
              </Link>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-minsah-secondary">
            Showing {start + 1}&ndash;{Math.min(start + pageSize, totalCount)} of {totalCount}{' '}
            products
            {totalPages > 1 && ` \u2022 Page ${page} of ${totalPages}`}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 text-minsah-secondary">&#128269;</div>
          <h3 className="text-2xl font-bold text-minsah-dark mb-2">No products found</h3>
          <p className="text-minsah-secondary mb-6">
            Try adjusting your filters or search for something else
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 bg-minsah-primary text-white rounded-lg hover:bg-minsah-dark transition-colors font-semibold"
          >
            Clear All Filters
          </Link>
        </div>
      )}
    </>
  );
}
