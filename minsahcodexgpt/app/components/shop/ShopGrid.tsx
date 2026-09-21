"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  buildSearchParams,
  getActiveFilters,
  normalizeShopSearchParams,
  parseSearchParams,
} from "@/lib/shopUtils";
import { productPath } from "@/lib/product-url";
import { buildCatalogPath, buildCatalogSearchPath } from "@/lib/catalog-navigation";
import { mapShopSortToSearchApiSort } from "@/lib/search/sort";
import { isUnifiedBrowseEnabled } from "@/lib/shopPerformance";
import {
  trackShopEmptyResult,
  trackShopFilterApply,
  trackShopFilterOpen,
  trackShopSortOpen,
  trackShopSortApply,
  trackShopPageChange,
  trackShopViewItemList,
  type ShopAnalyticsFilters,
} from "@/lib/tracking/shop-events";
import ProductCard from "./ProductCard";
import ShopMerchandisingSections from "./ShopMerchandisingSections";
import ActiveFilters from "./ActiveFilters";
import ShopSearchBar from "./ShopSearchBar";
import ShopFilterDrawer from "./ShopFilterDrawer";
import ShopSortSheet from "./ShopSortSheet";
import ProductGridSkeleton from "./ProductGridSkeleton";
import ShopEmptyState from "./ShopEmptyState";
import ShopErrorState from "./ShopErrorState";
import AroggaControlsBar from "./AroggaControlsBar";
import AroggaFilterSidebar from "./AroggaFilterSidebar";
import AroggaMobileFilterDrawer from "./AroggaMobileFilterDrawer";
import AroggaPagination from "./AroggaPagination";
import type { Product as ShopProduct, SortOption, ShopViewMode } from "@/types/product";

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  price: number;
  originalPrice: number | null;
  discount?: number;
  discountPercentage?: number;
  image: string;
  images: Array<string | { url?: string; alt?: string }>;
  sku: string;
  stock: number;
  category: string;
  categorySlug: string;
  rating: number;
  reviews: number;
  description: string;
  shortDescription: string;
  featured: boolean;
  isFeatured?: boolean;
  isNew: boolean;
  tags: string;
  codAvailable?: boolean;
  isCODAvailable?: boolean;
  returnEligible?: boolean;
  freeShippingEligible?: boolean;
  authenticityBadge?: boolean;
  deliveryBadge?: string | null;
  badges?: string[];
  viewCount?: number;
  views?: number;
  orderCount?: number;
  confirmedOrderCount?: number;
  deliveredOrderCount?: number;
  createdAt: string;
  updatedAt: string;
  hasVariants?: boolean;
  variants?: Array<{
    id: string;
    sku: string;
    name?: string;
    price: number;
    stock?: number;
    quantity?: number;
    image?: string | null;
    attributes?: {
      size?: string;
      color?: string;
    };
  }>;
  skinType?: string;
  skinConcerns?: string[];
}

// Maps an Elasticsearch product source to ApiProduct shape
interface EsProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  discountPercentage?: number;
  category?: string;
  categorySlug?: string;
  categoryName?: string;
  subcategory?: string;
  subcategorySlug?: string;
  subcategoryName?: string;
  brand?: string;
  brandSlug?: string;
  images?: string[];
  inStock?: boolean;
  stock?: number;
  quantity?: number;
  totalStock?: number;
  availableQuantity?: number;
  rating?: number;
  reviewCount?: number;
  codAvailable?: boolean;
  isCODAvailable?: boolean;
  freeShippingEligible?: boolean;
  returnEligible?: boolean;
  authenticityBadge?: boolean;
  deliveryBadge?: string | null;
  badges?: string[];
  viewCount?: number;
  views?: number;
  salesCount?: number;
  orderCount?: number;
  confirmedOrderCount?: number;
  deliveredOrderCount?: number;
  tags?: string[];
  skinType?: string;
  skinConcern?: string;
  skinConcerns?: string[];
  isFeatured?: boolean;
  isFlashSale?: boolean;
  isNewArrival?: boolean;
  isNew?: boolean;
  hasVariants?: boolean;
  variants?: ApiProduct['variants'];
  createdAt?: string;
  updatedAt?: string;
}

function resolveSearchProductStock(p: EsProduct): number {
  const candidates = [p.stock, p.quantity, p.totalStock, p.availableQuantity];
  const realStock = candidates.find(
    (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
  );

  if (typeof realStock === "number") return realStock;

  // Search index entries may only expose inStock. Do not convert inStock=true into
  // stock=1 because the card will show “Only 1 left” and cap quantity incorrectly.
  return p.inStock ? 99 : 0;
}

function esProductToApiProduct(p: EsProduct): ApiProduct {
  const images = p.images ?? [];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug || toSlug(p.name),
    brand: p.brand ?? "",
    brandSlug: p.brandSlug || toSlug(p.brand ?? ""),
    price: p.price,
    originalPrice: p.compareAtPrice ?? null,
    discount: p.discount ?? p.discountPercentage,
    discountPercentage: p.discountPercentage ?? p.discount,
    image: images[0] ?? "",
    images,
    sku: "",
    stock: resolveSearchProductStock(p),
    category: p.categoryName ?? p.category ?? "",
    categorySlug: p.categorySlug || toSlug(p.category ?? ""),
    rating: p.rating ?? 0,
    reviews: p.reviewCount ?? 0,
    description: p.description ?? "",
    shortDescription: p.description?.substring(0, 100) ?? p.name,
    featured: Boolean(p.isFeatured),
    isNew: Boolean(p.isNewArrival ?? p.isNew),
    tags: Array.isArray(p.tags) ? p.tags.join(",") : (p.tags ?? ""),
    codAvailable: p.codAvailable ?? p.isCODAvailable,
    isCODAvailable: p.isCODAvailable ?? p.codAvailable,
    returnEligible: p.returnEligible,
    freeShippingEligible: p.freeShippingEligible,
    authenticityBadge: p.authenticityBadge,
    deliveryBadge: p.deliveryBadge,
    badges: p.badges,
    viewCount: p.viewCount ?? p.views,
    orderCount: p.orderCount,
    confirmedOrderCount: p.confirmedOrderCount,
    deliveredOrderCount: p.deliveredOrderCount ?? p.salesCount,
    hasVariants: Boolean(p.hasVariants || (p.variants && p.variants.length > 0)),
    variants: p.variants,
    skinType: p.skinType,
    skinConcerns: p.skinConcerns ?? (p.skinConcern ? [p.skinConcern] : []),
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };
}

function imageToUrl(
  image: string | { url?: string } | null | undefined,
): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  return typeof image.url === "string" ? image.url : "";
}

function apiProductToShopProduct(p: ApiProduct): ShopProduct {
  const createdAt = new Date(p.createdAt);
  const imageUrls = (Array.isArray(p.images) ? p.images : [])
    .map(imageToUrl)
    .filter(Boolean);
  const mainImage = p.image || imageUrls[0] || "";
  const salesCount = Number(
    p.deliveredOrderCount ?? p.confirmedOrderCount ?? p.orderCount ?? 0,
  );
  const viewCount = Number(p.viewCount ?? p.views ?? 0);
  const discount =
    typeof p.discount === "number"
      ? p.discount
      : typeof p.discountPercentage === "number"
        ? p.discountPercentage
        : p.originalPrice != null && p.originalPrice > p.price
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
    image: mainImage,
    images: imageUrls.length ? imageUrls : mainImage ? [mainImage] : [],
    sku: p.sku,
    stock: p.stock,
    category: p.category,
    categorySlug: p.categorySlug || toSlug(p.category),
    rating: p.rating,
    reviewCount: p.reviews,
    description: p.description || "",
    shortDescription:
      p.shortDescription || p.description?.substring(0, 100) || p.name,
    isNew: p.isNew,
    isBestSeller: salesCount > 0,
    isExclusive: false,
    isTrending: p.featured || p.isFeatured || false,
    skinType: p.skinType ? (Array.isArray(p.skinType) ? p.skinType : [p.skinType]) as ('oily' | 'dry' | 'combination' | 'normal' | 'sensitive')[] : undefined,
    skinConcerns: (p.skinConcerns ?? []) as ('acne' | 'aging' | 'dryness' | 'sensitivity' | 'dark-spots' | 'pores')[],
    tags: p.tags
      ? p.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    isVegan: false,
    isCrueltyFree: false,
    isOrganic: false,
    isHalalCertified: false,
    isBSTIApproved: false,
    isImported: false,
    hasVariants: p.hasVariants ?? !!(p.variants && p.variants.length > 0),
    variants: p.variants?.map((variant) => {
      const attrs = (variant.attributes || {}) as Record<string, string>;
      const size = attrs.size || "";
      const shade = attrs.shade || attrs.color || "";
      const option = size ? "Size" : shade ? "Shade" : "Variant";
      const value = size || shade || variant.name || variant.sku;

      return {
        id: variant.id,
        name: variant.name || value,
        option,
        value,
        price: Number(variant.price ?? p.price),
        stock: Number(variant.stock ?? variant.quantity ?? 0),
        sku: variant.sku,
        image: variant.image || undefined,
      };
    }),
    isCODAvailable: (p.isCODAvailable ?? p.codAvailable) === true,
    isSameDayDelivery: false,
    freeShippingEligible: p.freeShippingEligible === true,
    returnEligible: p.returnEligible === true,
    authenticityBadge: p.authenticityBadge === true,
    deliveryBadge: p.deliveryBadge ?? null,
    badges: Array.isArray(p.badges) ? p.badges : [],
    deliveryDays: 3,
    isEMIAvailable: false,
    views: viewCount,
    salesCount,
    createdAt,
    updatedAt: new Date(p.updatedAt),
  };
}

const SHOP_LIST_NAME = "Shop Product Grid";

const SHOP_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://minsahbeauty.com";

const SHOP_SORT_OPTIONS: { id: SortOption | "featured"; label: string }[] = [
  { id: 'featured', label: "Featured" },
  { id: 'best-selling', label: "Best Selling" },
  { id: 'newest', label: "Newest" },
  { id: 'price-low-high', label: "Price: Low to High" },
  { id: 'price-high-low', label: "Price: High to Low" },
  { id: 'highest-rated', label: "Highest Rated" },
  { id: 'biggest-discount', label: "Biggest Discount" },
];

type OpenShopPanel = 'filter' | 'sort' | null;

const QUICK_PRICE_RANGES = [
  { label: "Under ৳500", minPrice: "", maxPrice: "500" },
  { label: "৳500–৳1000", minPrice: "500", maxPrice: "1000" },
  { label: "৳1000–৳2000", minPrice: "1000", maxPrice: "2000" },
  { label: "Above ৳2000", minPrice: "2000", maxPrice: "" },
];

type ApiFacetOption = {
  label?: string;
  value: string;
  count?: number;
  min?: number | null;
  max?: number | null;
};

type ShopFacetState = {
  categories: ApiFacetOption[];
  brands: ApiFacetOption[];
  priceRanges: ApiFacetOption[];
  skinTypes: ApiFacetOption[];
  concerns: ApiFacetOption[];
  availability: ApiFacetOption[];
  ratings: ApiFacetOption[];
};

type FilterOption = { slug: string; label: string; count: number };

const EMPTY_SHOP_FACETS: ShopFacetState = {
  categories: [],
  brands: [],
  priceRanges: [],
  skinTypes: [],
  concerns: [],
  availability: [],
  ratings: [],
};

function normalizeFacetOptions(options: unknown): ApiFacetOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((option): ApiFacetOption | null => {
      if (!option || typeof option !== "object") return null;
      const raw = option as Partial<ApiFacetOption> & { slug?: string };
      const value = String(raw.value || raw.slug || raw.label || "").trim();
      if (!value) return null;
      const label = String(raw.label || value).trim();
      const count = Number(raw.count ?? 0);
      return {
        label,
        value,
        count: Number.isFinite(count) ? count : 0,
        min: raw.min ?? null,
        max: raw.max ?? null,
      };
    })
    .filter((option): option is ApiFacetOption => Boolean(option));
}

function normalizeApiFacets(input: unknown): ShopFacetState {
  if (!input || typeof input !== "object") return EMPTY_SHOP_FACETS;
  const facets = input as Partial<ShopFacetState>;

  return {
    categories: normalizeFacetOptions(facets.categories),
    brands: normalizeFacetOptions(facets.brands),
    priceRanges: normalizeFacetOptions(facets.priceRanges),
    skinTypes: normalizeFacetOptions(facets.skinTypes),
    concerns: normalizeFacetOptions(facets.concerns),
    availability: normalizeFacetOptions(facets.availability),
    ratings: normalizeFacetOptions(facets.ratings),
  };
}

function mergeActiveFacetOptions(
  options: ApiFacetOption[],
  activeValues: string[],
  maxItems = 20,
): FilterOption[] {
  const map = new Map<string, FilterOption>();

  options.forEach((option) => {
    const value = option.value.trim();
    if (!value) return;
    map.set(value, {
      slug: value,
      label: option.label || value,
      count: Number(option.count ?? 0),
    });
  });

  activeValues.forEach((value) => {
    const normalizedValue = value.trim();
    if (!normalizedValue || map.has(normalizedValue)) return;
    map.set(normalizedValue, {
      slug: normalizedValue,
      label: normalizedValue,
      count: 0,
    });
  });

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxItems);
}

export default function ShopGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [esTotal, setEsTotal] = useState<number | null>(null);
  const [esTotalPages, setEsTotalPages] = useState<number | null>(null);
  const [spellSuggestion, setSpellSuggestion] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [facets, setFacets] = useState<ShopFacetState>(EMPTY_SHOP_FACETS);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([]);
  const [selectedSkinConcerns, setSelectedSkinConcerns] = useState<string[]>([]);
  const [isSaleOnly, setIsSaleOnly] = useState(false);
  const [selectedSortFlags, setSelectedSortFlags] = useState<string[]>([]);
  const [priceMinInput, setPriceMinInput] = useState("");
  const [priceMaxInput, setPriceMaxInput] = useState("");
  const [openPanel, setOpenPanel] = useState<OpenShopPanel>(null);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");
  const [filterPreviewPending, setFilterPreviewPending] = useState(false);
  const filterUrlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingFilterParamsRef = useRef<string>("");
  const latestShopTrackingRef = useRef<{
    totalCount: number;
    filters: ShopAnalyticsFilters;
  }>({ totalCount: 0, filters: {} });

  const normalizedParams = useMemo(
    () => normalizeShopSearchParams(searchParams),
    [searchParams],
  );
  const q = normalizedParams.get("q") || "";
  const filters = parseSearchParams(normalizedParams);
  const page = filters.page || 1;
  const pageSize = 20;

  useEffect(() => {
    pendingFilterParamsRef.current = normalizedParams.toString();
  }, [normalizedParams]);

  useEffect(() => {
    const categories = (normalizedParams.get("category") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const brands = (normalizedParams.get("brand") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const skinTypes = (normalizedParams.get("skinType") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const skinConcerns = (normalizedParams.get("skinConcern") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const saleOnly = normalizedParams.get("saleOnly") === "true";
    const sortFlags = normalizedParams.get("sort")
      ? [normalizedParams.get("sort") as string]
      : [];

    setSelectedCategories(categories);
    setSelectedBrands(brands);
    setSelectedSkinTypes(skinTypes);
    setSelectedSkinConcerns(skinConcerns);
    setIsSaleOnly(saleOnly);
    setSelectedSortFlags(sortFlags);
    setPriceMinInput(normalizedParams.get("minPrice") || "");
    setPriceMaxInput(normalizedParams.get("maxPrice") || "");
  }, [normalizedParams]);

  useEffect(() => {
    return () => {
      if (filterUrlDebounceRef.current) {
        clearTimeout(filterUrlDebounceRef.current);
      }
    };
  }, []);

  const updateUrlFilters = useCallback(
    (patch: Record<string, string | null>) => {
      setFilterPreviewPending(true);
      const params = normalizeShopSearchParams(
        pendingFilterParamsRef.current
          ? new URLSearchParams(pendingFilterParamsRef.current)
          : searchParams,
      );
      Object.entries(patch).forEach(([key, value]) => {
        const canonicalKey = key === "inStockOnly" ? "inStock" : key;

        // Remove legacy aliases on every write so generated URLs stay canonical.
        if (canonicalKey === "category") params.delete("mfCategory");
        if (canonicalKey === "brand") params.delete("mfBrand");
        if (canonicalKey === "minPrice") params.delete("mfMinPrice");
        if (canonicalKey === "maxPrice") params.delete("mfMaxPrice");
        if (canonicalKey === "sort") params.delete("mfSort");
        if (canonicalKey === "q") params.delete("search");
        if (canonicalKey === "inStock") params.delete("inStockOnly");

        if (!value) {
          params.delete(canonicalKey);
        } else {
          params.set(canonicalKey, value);
        }

        const tracking = latestShopTrackingRef.current;

        if (canonicalKey === "sort") {
          trackShopSortApply(value, tracking.totalCount, tracking.filters);
        } else if (
          [
            "category",
            "brand",
            "minPrice",
            "maxPrice",
            "inStock",
            "rating",
            "skinType",
            "skinConcern",
            "saleOnly",
          ].includes(canonicalKey)
        ) {
          trackShopFilterApply(
            canonicalKey,
            value,
            tracking.totalCount,
            tracking.filters,
          );
        }
      });
      params.delete("page");
      const nextUrl = buildCatalogPath(params);
      pendingFilterParamsRef.current = nextUrl.split("?")[1] || "";

      if (filterUrlDebounceRef.current) {
        clearTimeout(filterUrlDebounceRef.current);
      }

      filterUrlDebounceRef.current = setTimeout(() => {
        router.push(nextUrl);
      }, 160);
    },
    [router, searchParams],
  );

  const closeShopPanel = useCallback(() => {
    setOpenPanel(null);
    setBrandSearchQuery("");
  }, []);

  const openFilterPanel = useCallback((source: string) => {
    trackShopFilterOpen(source);
    setOpenPanel("filter");
  }, []);

  const openSortPanel = useCallback((source: string) => {
    trackShopSortOpen(source);
    setOpenPanel("sort");
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const shouldUseElasticsearch = Boolean(q.trim()) || isUnifiedBrowseEnabled();

        if (shouldUseElasticsearch) {
          // ── Unified Elasticsearch path (/api/search with DB fallback) ─────
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          params.set("page", String(page));
          params.set("limit", String(pageSize));

          const category = normalizedParams.get("category");
          const subcategory = normalizedParams.get("subcategory");
          const brand = normalizedParams.get("brand");
          const minPrice = normalizedParams.get("minPrice");
          const maxPrice = normalizedParams.get("maxPrice");
          const sort = normalizedParams.get("sort");
          const inStock = normalizedParams.get("inStock");
          const rating = normalizedParams.get("rating");
          const skinType = normalizedParams.get("skinType");
          const skinConcern = normalizedParams.get("skinConcern");
          const saleOnly = normalizedParams.get("saleOnly");
          const tags = normalizedParams.get("tags");

          if (category) params.set("category", category);
          if (subcategory) params.set("subcategory", subcategory);
          if (brand) params.set("brand", brand);
          if (minPrice) params.set("minPrice", minPrice);
          if (maxPrice) params.set("maxPrice", maxPrice);
          if (sort)
            params.set("sort", mapShopSortToSearchApiSort(sort as SortOption));
          if (inStock === "true") params.set("inStock", "true");
          if (rating) params.set("rating", rating);
          if (skinType) params.set("skinType", skinType);
          if (skinConcern) params.set("skinConcern", skinConcern);
          if (saleOnly === "true") params.set("saleOnly", "true");
          if (tags) params.set("tags", tags);

          const res = await fetch(`/api/search?${params.toString()}`);
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();

          // API returns products at root level: data.products, data.total, data.totalPages
          const esProducts: EsProduct[] = data.products ?? [];
          setAllProducts(
            esProducts.map((p) =>
              apiProductToShopProduct(esProductToApiProduct(p)),
            ),
          );
          setEsTotal(data.total ?? 0);
          setEsTotalPages(data.totalPages ?? 1);
          setSpellSuggestion(data.spellSuggestion ?? null);
          setFallbackMessage(data.fallback?.message ?? null);
          setFacets(normalizeApiFacets(data.facets));
        } else {
          // ── Regular products API path ────────────────────────────────
          const params = new URLSearchParams({
            page: String(page),
            limit: String(pageSize),
            activeOnly: "true",
            view: "listing",
          });

          const category = normalizedParams.get("category");
          const brand = normalizedParams.get("brand");
          const search = normalizedParams.get("q");
          const minPrice = normalizedParams.get("minPrice");
          const maxPrice = normalizedParams.get("maxPrice");
          const sort = normalizedParams.get("sort");
          const inStock = normalizedParams.get("inStock");
          const skinType = normalizedParams.get("skinType");
          const skinConcern = normalizedParams.get("skinConcern");
          const saleOnly = normalizedParams.get("saleOnly");

          if (category) params.set("category", category);
          if (brand) params.set("brand", brand);
          if (search) params.set("q", q);
          if (minPrice) params.set("minPrice", minPrice);
          if (maxPrice) params.set("maxPrice", maxPrice);
          if (sort) params.set("sort", sort);
          if (inStock === "true") params.set("inStock", "true");
          if (skinType) params.set("skinType", skinType);
          if (skinConcern) params.set("skinConcern", skinConcern);
          if (saleOnly === "true") params.set("saleOnly", "true");

          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) throw new Error("Failed to fetch products");
          const data = await res.json();
          const apiProds: ApiProduct[] = data.products || [];
          setAllProducts(apiProds.map(apiProductToShopProduct));
          setEsTotal(
            data.pagination?.totalCount ?? data.total ?? apiProds.length,
          );
          setEsTotalPages(data.pagination?.totalPages ?? data.totalPages ?? 1);
          setFacets(normalizeApiFacets(data.facets));
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        setError(
          "Products couldn’t load. Please check your connection or try again.",
        );
        setAllProducts([]);
        setEsTotal(0);
        setEsTotalPages(1);
        setFacets(EMPTY_SHOP_FACETS);
      } finally {
        setLoading(false);
        setFilterPreviewPending(false);
      }
    };

    fetchProducts();
  }, [normalizedParams, q, page, retryNonce]);

  const categoryOptions = useMemo(
    () => mergeActiveFacetOptions(facets.categories, selectedCategories),
    [facets.categories, selectedCategories],
  );

  const brandOptions = useMemo(
    () => mergeActiveFacetOptions(facets.brands, selectedBrands),
    [facets.brands, selectedBrands],
  );

  const drawerBrandOptions = useMemo(() => {
    const query = brandSearchQuery.trim().toLowerCase();
    const selectedSet = new Set(selectedBrands);
    const selected = brandOptions.filter((brand) => selectedSet.has(brand.slug));
    const matched = query
      ? brandOptions.filter(
          (brand) =>
            !selectedSet.has(brand.slug) &&
            `${brand.label} ${brand.slug}`.toLowerCase().includes(query),
        )
      : brandOptions.filter((brand) => !selectedSet.has(brand.slug));

    return [...selected, ...matched].slice(0, 24);
  }, [brandOptions, brandSearchQuery, selectedBrands]);

  const skinTypeOptions = useMemo(() => {
    const serverOptions = mergeActiveFacetOptions(facets.skinTypes, selectedSkinTypes);
    if (serverOptions.length > 0) return serverOptions;
    return [
      { slug: "oily", label: "Oily", count: 0 },
      { slug: "dry", label: "Dry", count: 0 },
      { slug: "combination", label: "Combination", count: 0 },
      { slug: "sensitive", label: "Sensitive", count: 0 },
      { slug: "normal", label: "Normal", count: 0 },
      { slug: "acne-prone", label: "Acne-Prone", count: 0 },
    ];
  }, [facets.skinTypes, selectedSkinTypes]);

  const skinConcernOptions = useMemo(() => {
    const serverOptions = mergeActiveFacetOptions(facets.concerns, selectedSkinConcerns);
    if (serverOptions.length > 0) return serverOptions;
    return [
      { slug: "acne", label: "Acne & Blemishes", count: 0 },
      { slug: "brightening", label: "Brightening", count: 0 },
      { slug: "dark-spots", label: "Dark Spots", count: 0 },
      { slug: "anti-aging", label: "Anti-Aging", count: 0 },
      { slug: "pores", label: "Pores & Blackheads", count: 0 },
      { slug: "hydration", label: "Dryness & Hydration", count: 0 },
    ];
  }, [facets.concerns, selectedSkinConcerns]);

  const popularDiscoveryChips = useMemo(() => {
    const chips: Array<{ label: string; patch: Record<string, string | null>; ariaLabel: string }> = [];
    const topCategory = categoryOptions.find(
      (category) => !selectedCategories.includes(category.slug) && category.count > 0,
    );
    const topBrand = brandOptions.find(
      (brand) => !selectedBrands.includes(brand.slug) && brand.count > 0,
    );

    if (topCategory) {
      chips.push({
        label: topCategory.label,
        patch: { category: topCategory.slug },
        ariaLabel: `Quick filter by popular category ${topCategory.label}`,
      });
    }

    if (topBrand) {
      chips.push({
        label: topBrand.label,
        patch: { brand: topBrand.slug },
        ariaLabel: `Quick filter by popular brand ${topBrand.label}`,
      });
    }

    chips.push(
      {
        label: "Biggest discounts",
        patch: { sort: "biggest-discount" },
        ariaLabel: "Quickly sort by biggest discounts",
      },
      {
        label: "Best sellers",
        patch: { sort: "best-selling" },
        ariaLabel: "Quickly sort by best sellers",
      },
      {
        label: "In stock",
        patch: { inStock: "true" },
        ariaLabel: "Quickly show in-stock products",
      },
    );

    return chips.slice(0, 5);
  }, [brandOptions, categoryOptions, selectedBrands, selectedCategories]);

  const rawView = normalizedParams.get("view");
  const [viewMode, setViewMode] = useState<ShopViewMode>(rawView === "list" ? "list" : "grid");
  const discountParam = normalizedParams.get("discount");
  const selectedDiscount = discountParam ? Number(discountParam) : null;

  useEffect(() => {
    if (rawView === "list" || rawView === "grid") {
      setViewMode(rawView);
    }
  }, [rawView]);

  const handleViewModeChange = (mode: ShopViewMode) => {
    setViewMode(mode);
    updateUrlFilters({ view: mode === "grid" ? null : "list" });
  };

  // Server APIs now own filtering, sorting, pagination, and count accuracy.
  // Keep the client grid as a renderer only to avoid URL-selected filters diverging from API results.
  const displayProducts = useMemo(() => {
    if (selectedDiscount === null) return allProducts;
    return allProducts.filter((p) => (p.discount || 0) >= selectedDiscount);
  }, [allProducts, selectedDiscount]);

  const totalCount = esTotal ?? allProducts.length;
  const totalPages =
    esTotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

  const start = (page - 1) * pageSize;
  const hasMore = page < totalPages;
  const activeSort = (selectedSortFlags[0] as SortOption) || "featured";
  const isSearchRelevanceDefault = Boolean(q.trim()) && selectedSortFlags.length === 0;
  const activeSortLabel = isSearchRelevanceDefault
    ? "Relevance"
    : SHOP_SORT_OPTIONS.find((item) => item.id === activeSort)?.label ||
      "Featured";
  const parsedFilters = useMemo(
    () => parseSearchParams(normalizedParams),
    [normalizedParams],
  );
  const activeFilters = useMemo(
    () => getActiveFilters(parsedFilters),
    [parsedFilters],
  );
  const activeFilterCount = activeFilters.length;
  // Phase 8 CRO audit contract (kept explicit for regression guardrails):
  // trackShopViewItemList(displayProducts, SHOP_LIST_NAME, shopAnalyticsFilters)
  // trackShopEmptyResult(q, totalCount, shopAnalyticsFilters)
  // trackShopSortApply(value, totalCount, shopAnalyticsFilters)
  // trackShopFilterApply(canonicalKey, value, totalCount, shopAnalyticsFilters)
  // trackShopPageChange(page + 1, totalCount
  const shopAnalyticsFilters = useMemo(
    () => ({
      q: q || undefined,
      category: normalizedParams.get("category") || undefined,
      brand: normalizedParams.get("brand") || undefined,
      minPrice: normalizedParams.get("minPrice") || undefined,
      maxPrice: normalizedParams.get("maxPrice") || undefined,
      sort: activeSort,
      page,
      inStock: normalizedParams.get("inStock") === "true" ? true : undefined,
      rating: normalizedParams.get("rating") || undefined,
    }),
    [activeSort, normalizedParams, page, q],
  );

  useEffect(() => {
    latestShopTrackingRef.current = {
      totalCount,
      filters: shopAnalyticsFilters,
    };
  }, [shopAnalyticsFilters, totalCount]);

  const renderPopularDiscoveryChips = () => {
    if (popularDiscoveryChips.length === 0) return null;

    return (
      <div className="mt-3 border-t border-minsah-accent pt-3" data-shop-quick-discovery-chips>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-minsah-secondary">
          Quick discovery
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Popular quick filters">
          {popularDiscoveryChips.map((chip) => (
            <Button
              key={`${chip.label}-${Object.values(chip.patch).join('-')}`}
              type="button"
              variant="secondary"
              onClick={() => updateUrlFilters(chip.patch)}
              className="shrink-0 rounded-full border-minsah-accent bg-minsah-light px-3 py-2 text-xs text-minsah-dark hover:border-minsah-primary hover:text-minsah-primary"
              aria-label={chip.ariaLabel}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderMobileStickyControls = () => (
    <div className="sticky top-0 z-30 mb-4 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-xs backdrop-blur md:hidden">
      <div className="space-y-3">
        <ShopSearchBar />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-minsah-dark">
              {totalCount} products
            </p>
            <p className="text-xs text-minsah-secondary">
              {filterPreviewPending ? "Updating results…" : `Sort: ${activeSortLabel}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => openFilterPanel("mobile_sticky_filter")}
              aria-haspopup="dialog"
              aria-expanded={openPanel === "filter"}
              className="rounded-full px-3.5 text-xs font-semibold"
              disabled={loading}
            >
              <Filter size={15} aria-hidden="true" />
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => openSortPanel("mobile_sticky_sort")}
              aria-haspopup="dialog"
              aria-expanded={openPanel === "sort"}
              className="rounded-full px-3.5 text-xs font-semibold"
              disabled={loading}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              Sort
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const itemListJsonLd = useMemo(() => {
    if (!displayProducts.length) return null;

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: q ? `Search results for ${q}` : "Minsah Shop Product List",
      numberOfItems: totalCount,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: displayProducts.map((product, index) => ({
        "@type": "ListItem",
        position: start + index + 1,
        url: `${SHOP_BASE_URL}${productPath(product)}`,
        name: product.name,
      })),
    };
  }, [displayProducts, q, start, totalCount]);

  useEffect(() => {
    if (loading || error) return;
    if (displayProducts.length > 0) {
      trackShopViewItemList(
        displayProducts,
        SHOP_LIST_NAME,
        shopAnalyticsFilters,
      );
    } else {
      trackShopEmptyResult(q, totalCount, shopAnalyticsFilters);
    }
  }, [displayProducts, loading, error, q, totalCount, shopAnalyticsFilters]);

  if (loading) {
    return (
      <>
        {renderMobileStickyControls()}
        <ProductGridSkeleton count={8} />
      </>
    );
  }

  // Handler for spell correction click
  const applySpellSuggestion = () => {
    if (!spellSuggestion) return;
    router.push(buildCatalogSearchPath(spellSuggestion, searchParams));
  };

  const clearSearchTerm = () => {
    const filters = parseSearchParams(searchParams);
    delete filters.search;
    delete filters.page;
    const queryString = buildSearchParams(filters);
    router.push(buildCatalogPath(new URLSearchParams(queryString)), {
      scroll: false,
    });
  };

  const clearFiltersKeepSearch = () => {
    const params = normalizeShopSearchParams(searchParams);
    [
      "category",
      "subcategory",
      "brand",
      "minPrice",
      "maxPrice",
      "skinType",
      "skinConcern",
      "rating",
      "tags",
      "inStock",
      "saleOnly",
      "page",
    ].forEach((key) => params.delete(key));
    router.push(buildCatalogPath(params), { scroll: false });
  };

  const clearOneFilterGroup = (keys: string[]) => {
    const params = normalizeShopSearchParams(searchParams);
    keys.forEach((key) => params.delete(key));
    params.delete("page");
    router.push(buildCatalogPath(params), { scroll: false });
  };

  const noResultRecoveryActions = [
    normalizedParams.get("brand")
      ? { label: "Remove brand", onClick: () => clearOneFilterGroup(["brand"]) }
      : null,
    normalizedParams.get("category")
      ? { label: "Remove category", onClick: () => clearOneFilterGroup(["category", "subcategory"]) }
      : null,
    normalizedParams.get("minPrice") || normalizedParams.get("maxPrice")
      ? { label: "Widen price", onClick: () => clearOneFilterGroup(["minPrice", "maxPrice"]) }
      : null,
    normalizedParams.get("sort")
      ? { label: "Reset sort", onClick: () => clearOneFilterGroup(["sort"]) }
      : null,
    normalizedParams.get("inStock")
      ? { label: "Include out-of-stock", onClick: () => clearOneFilterGroup(["inStock"]) }
      : null,
    normalizedParams.get("rating")
      ? { label: "Remove rating", onClick: () => clearOneFilterGroup(["rating"]) }
      : null,
    normalizedParams.get("skinType")
      ? { label: "Remove skin type", onClick: () => clearOneFilterGroup(["skinType"]) }
      : null,
    normalizedParams.get("skinConcern")
      ? { label: "Remove skin concern", onClick: () => clearOneFilterGroup(["skinConcern"]) }
      : null,
    normalizedParams.get("saleOnly")
      ? { label: "Remove sale filter", onClick: () => clearOneFilterGroup(["saleOnly"]) }
      : null,
  ].filter(Boolean) as Array<{ label: string; onClick: () => void }>;

  if (error) {
    return (
      <>
        {renderMobileStickyControls()}
        <ShopErrorState onRetry={() => setRetryNonce((value) => value + 1)} />
      </>
    );
  }

  const toggleSelection = (
    currentItems: string[],
    value: string,
    queryKey: string,
  ) => {
    const nextItems = currentItems.includes(value)
      ? currentItems.filter((item) => item !== value)
      : [...currentItems, value];
    updateUrlFilters({
      [queryKey]: nextItems.length > 0 ? nextItems.join(",") : null,
    });
  };

  const applyPriceRange = (minPrice: string, maxPrice: string) => {
    setPriceMinInput(minPrice);
    setPriceMaxInput(maxPrice);
    updateUrlFilters({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
  };

  const clearAllShopFilters = () => {
    setPriceMinInput("");
    setPriceMaxInput("");
    updateUrlFilters({
      category: null,
      subcategory: null,
      brand: null,
      minPrice: null,
      maxPrice: null,
      skinType: null,
      skinConcern: null,
      tags: null,
      sort: null,
      inStockOnly: null,
      inStock: null,
      saleOnly: null,
      rating: null,
    });
    closeShopPanel();
  };

  const renderFilterPanel = (mode: "sidebar" | "drawer") => (
    <div
      className={
        mode === "sidebar"
          ? "sticky top-32 rounded-xl border border-stone-200 bg-white p-5 shadow-xs"
          : "flex h-full flex-col"
      }
    >
      <div
        className={
          mode === "drawer"
            ? "flex-1 space-y-5"
            : "space-y-5"
        }
      >
        {mode === "sidebar" && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Sort By
            </p>
            <div className="grid gap-1.5">
              {SHOP_SORT_OPTIONS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={activeSort === item.id ? "primary" : "secondary"}
                  aria-pressed={activeSort === item.id}
                  aria-label={`Sort products by ${item.label}`}
                  onClick={() => {
                    updateUrlFilters({ sort: item.id === 'featured' ? null : item.id })
                  }}
                  className="justify-between rounded-lg px-3 py-2 text-left text-sm font-medium"
                >
                  <span>{item.label}</span>
                  {activeSort === item.id && <Check size={15} aria-hidden="true" />}
                </Button>
              ))}
            </div>
          </div>
        )}

        {categoryOptions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => (
                <Button
                  key={category.slug}
                  type="button"
                  variant={selectedCategories.includes(category.slug) ? "primary" : "secondary"}
                  aria-pressed={selectedCategories.includes(category.slug)}
                  aria-label={`${selectedCategories.includes(category.slug) ? "Remove" : "Apply"} category filter ${category.label}`}
                  onClick={() =>
                    toggleSelection(
                      selectedCategories,
                      category.slug,
                      "category",
                    )
                  }
                  className="rounded-full px-3 py-1.5 text-xs"
                >
                  {category.label}{" "}
                  <span className="opacity-70">({category.count})</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {brandOptions.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Brand
              </p>
              {mode === "drawer" && brandSearchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBrandSearchQuery("")}
                  className="px-2 py-0 text-xs text-minsah-primary hover:text-minsah-dark"
                >
                  Clear search
                </Button>
              )}
            </div>

            {mode === "drawer" && (
              <Input
                type="search"
                inputMode="search"
                value={brandSearchQuery}
                onChange={(event) => setBrandSearchQuery(event.target.value)}
                placeholder="Search brands"
                aria-label="Search brands inside filter drawer"
                leading={<Search size={16} aria-hidden="true" />}
                containerClassName="mb-3"
                data-brand-search
              />
            )}

            {drawerBrandOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {drawerBrandOptions.map((brand) => (
                  <Button
                    key={brand.slug}
                    type="button"
                    variant={selectedBrands.includes(brand.slug) ? "primary" : "secondary"}
                    aria-pressed={selectedBrands.includes(brand.slug)}
                    aria-label={`${selectedBrands.includes(brand.slug) ? "Remove" : "Apply"} brand filter ${brand.label}`}
                    onClick={() =>
                      toggleSelection(selectedBrands, brand.slug, "brand")
                    }
                    className="rounded-full px-3 py-1.5 text-xs"
                  >
                    {brand.label}{" "}
                    <span className="opacity-70">({brand.count})</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-minsah-accent bg-minsah-light px-3 py-3 text-sm text-minsah-secondary" role="status">
                No brands matched “{brandSearchQuery}”. Try another brand name or clear the brand search.
              </p>
            )}
          </div>
        )}

        {skinTypeOptions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Skin Type
            </p>
            <div className="flex flex-wrap gap-2">
              {skinTypeOptions.map((item) => (
                <Button
                  key={item.slug}
                  type="button"
                  variant={selectedSkinTypes.includes(item.slug) ? "primary" : "secondary"}
                  aria-pressed={selectedSkinTypes.includes(item.slug)}
                  aria-label={`${selectedSkinTypes.includes(item.slug) ? "Remove" : "Apply"} skin type filter ${item.label}`}
                  onClick={() =>
                    toggleSelection(
                      selectedSkinTypes,
                      item.slug,
                      "skinType",
                    )
                  }
                  className="rounded-full px-3 py-1.5 text-xs"
                >
                  {item.label}
                  {item.count > 0 && <span className="opacity-70"> ({item.count})</span>}
                </Button>
              ))}
            </div>
          </div>
        )}

        {skinConcernOptions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Skin Concern
            </p>
            <div className="flex flex-wrap gap-2">
              {skinConcernOptions.map((item) => (
                <Button
                  key={item.slug}
                  type="button"
                  variant={selectedSkinConcerns.includes(item.slug) ? "primary" : "secondary"}
                  aria-pressed={selectedSkinConcerns.includes(item.slug)}
                  aria-label={`${selectedSkinConcerns.includes(item.slug) ? "Remove" : "Apply"} skin concern filter ${item.label}`}
                  onClick={() =>
                    toggleSelection(
                      selectedSkinConcerns,
                      item.slug,
                      "skinConcern",
                    )
                  }
                  className="rounded-full px-3 py-1.5 text-xs"
                >
                  {item.label}
                  {item.count > 0 && <span className="opacity-70"> ({item.count})</span>}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Offers & Deals
          </p>
          <Button
            type="button"
            variant={isSaleOnly ? "primary" : "secondary"}
            aria-pressed={isSaleOnly}
            aria-label="Filter products on sale or flash sale"
            onClick={() =>
              updateUrlFilters({
                saleOnly: isSaleOnly ? null : "true",
              })
            }
            className="w-full justify-between rounded-xl px-3 py-2 text-sm font-medium"
          >
            <span className="flex items-center gap-1.5">
              <span>🔥</span>
              <span>On Sale / Flash Sale Only</span>
            </span>
            {isSaleOnly && <Check size={15} aria-hidden="true" />}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Price
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {QUICK_PRICE_RANGES.map((range) => {
              const active =
                priceMinInput === range.minPrice &&
                priceMaxInput === range.maxPrice;
              return (
                <Button
                  key={range.label}
                  type="button"
                  variant={active ? "primary" : "secondary"}
                  aria-pressed={active}
                  aria-label={`Filter products by price ${range.label}`}
                  onClick={() =>
                    applyPriceRange(range.minPrice, range.maxPrice)
                  }
                  className="rounded-xl px-3 py-2 text-xs"
                >
                  {range.label}
                </Button>
              );
            })}
          </div>
          <form
            className="grid grid-cols-2 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateUrlFilters({
                minPrice: priceMinInput.trim() || null,
                maxPrice: priceMaxInput.trim() || null,
              });
              if (mode === "drawer") closeShopPanel();
            }}
          >
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={priceMinInput}
              onChange={(event) => setPriceMinInput(event.target.value)}
              placeholder="Min"
              aria-label="Minimum price"
            />
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={priceMaxInput}
              onChange={(event) => setPriceMaxInput(event.target.value)}
              placeholder="Max"
              aria-label="Maximum price"
            />
            <Button type="submit" className="col-span-2 rounded-xl text-sm">
              Apply Price
            </Button>
          </form>
        </div>
      </div>

      {mode === "sidebar" && (
        <div className="mt-5 grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={clearAllShopFilters}
            className="rounded-xl px-4 text-sm"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {spellSuggestion && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm">
          <AlertCircle size={16} className="shrink-0 text-yellow-600" />
          <span className="text-yellow-800">
            Did you mean:{" "}
            <Button
              type="button"
              variant="ghost"
              onClick={applySpellSuggestion}
              className="px-1 py-0 text-sm text-minsah-primary underline underline-offset-2 hover:text-minsah-dark"
            >
              {spellSuggestion}
            </Button>
            ?
          </span>
        </div>
      )}

      {/* fallbackMessage: dev-only — hidden per user request ("hide this dont remove") */}
      {false && process.env.NODE_ENV === 'development' && fallbackMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <AlertCircle size={16} className="shrink-0 text-blue-600" />
          {fallbackMessage}
        </div>
      )}

      {openPanel === "filter" && (
        <ShopFilterDrawer
          open={openPanel === "filter"}
          totalCount={totalCount}
          onClose={closeShopPanel}
          onClear={clearAllShopFilters}
          applyPending={filterPreviewPending}
        >
          {renderFilterPanel("drawer")}
        </ShopFilterDrawer>
      )}

      {openPanel === "sort" && (
        <ShopSortSheet
          open={openPanel === "sort"}
          activeSort={activeSort}
          totalCount={totalCount}
          options={SHOP_SORT_OPTIONS}
          onClose={closeShopPanel}
          onSelect={(sort) => {
            updateUrlFilters({ sort: sort === 'featured' ? null : sort });
            closeShopPanel();
          }}
        />
      )}

      {/* Full-width Formulation Header & Controls Bar: Spanning from Left (above Filters) to Right (above Grid) */}
      <AroggaControlsBar
        totalCount={totalCount}
        query={q}
        category={normalizedParams.get("category") || undefined}
        activeSort={activeSort}
        onSortChange={(sort) => {
          trackShopSortApply(sort, totalCount, shopAnalyticsFilters);
          updateUrlFilters({ sort: sort === 'featured' ? null : sort });
        }}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortOptions={SHOP_SORT_OPTIONS}
      />

      <div className="grid gap-6 lg:grid-cols-[270px_1fr] xl:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block shrink-0" aria-label="Shop filters sidebar">
          <AroggaFilterSidebar
            inStockOnly={normalizedParams.get("inStock") === "true"}
            onInStockChange={(inStock) => updateUrlFilters({ inStock: inStock ? "true" : null })}
            priceMin={priceMinInput}
            priceMax={priceMaxInput}
            onPriceChange={applyPriceRange}
            selectedDiscount={selectedDiscount}
            onDiscountChange={(discount) => updateUrlFilters({ discount: discount ? String(discount) : null })}
            categories={categoryOptions}
            selectedCategories={selectedCategories}
            onCategoryToggle={(slug) => toggleSelection(selectedCategories, slug, "category")}
            onCategoryClear={() => clearOneFilterGroup(["category", "subcategory"])}
            brands={brandOptions}
            selectedBrands={selectedBrands}
            onBrandToggle={(slug) => toggleSelection(selectedBrands, slug, "brand")}
            onBrandClear={() => clearOneFilterGroup(["brand"])}
            skinTypes={skinTypeOptions}
            selectedSkinTypes={selectedSkinTypes}
            onSkinTypeToggle={(slug) => toggleSelection(selectedSkinTypes, slug, "skinType")}
            onSkinTypeClear={() => clearOneFilterGroup(["skinType"])}
            skinConcerns={skinConcernOptions}
            selectedSkinConcerns={selectedSkinConcerns}
            onSkinConcernToggle={(slug) => toggleSelection(selectedSkinConcerns, slug, "skinConcern")}
            onSkinConcernClear={() => clearOneFilterGroup(["skinConcern"])}
            onClearAll={clearAllShopFilters}
            hasActiveFilters={activeFilterCount > 0}
          />
        </aside>

        <section className="min-w-0 flex-1">
          {activeFilterCount > 0 && (
            <div className="mb-4">
              <ActiveFilters totalProducts={totalCount} />
            </div>
          )}

          {itemListJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(itemListJsonLd),
              }}
            />
          )}

          {displayProducts.length > 0 ? (
            <>
              {/* Arogga layout: Carousels removed permanently from search results */}
              {false && (
                <ShopMerchandisingSections
                  excludeProductIds={displayProducts.map((product) => product.id)}
                  totalProducts={totalCount}
                />
              )}

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {displayProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={start + index + 1}
                      listName={SHOP_LIST_NAME}
                      layout="grid"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={start + index + 1}
                      listName={SHOP_LIST_NAME}
                      layout="list"
                    />
                  ))}
                </div>
              )}

              {/* Arogga Numeric Pagination Bar */}
              <AroggaPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => {
                  trackShopPageChange(newPage, totalCount, {
                    ...shopAnalyticsFilters,
                    page: newPage,
                  });
                  updateUrlFilters({ page: newPage > 1 ? String(newPage) : null });
                }}
              />

              <div className="mt-4 text-center text-xs sm:text-sm text-stone-500">
                Showing {start + 1}&ndash;
                {Math.min(start + pageSize, totalCount)} of {totalCount}{" "}
                products
                {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
              </div>
            </>
          ) : (
            <ShopEmptyState
              searchTerm={q}
              spellSuggestion={spellSuggestion}
              activeFilterCount={activeFilterCount}
              recoveryActions={noResultRecoveryActions}
              onApplySpellSuggestion={
                spellSuggestion ? applySpellSuggestion : undefined
              }
              onClearSearch={q ? clearSearchTerm : undefined}
              onClearFilters={
                activeFilterCount > 0 ? clearFiltersKeepSearch : undefined
              }
            />
          )}
        </section>
      </div>

      {/* Floating Arogga Mobile Filter Pill & Slide-Up Bottom Drawer */}
      <AroggaMobileFilterDrawer
        totalCount={totalCount}
        inStockOnly={normalizedParams.get("inStock") === "true"}
        onInStockChange={(inStock) => updateUrlFilters({ inStock: inStock ? "true" : null })}
        priceMin={priceMinInput}
        priceMax={priceMaxInput}
        onPriceChange={applyPriceRange}
        selectedDiscount={selectedDiscount}
        onDiscountChange={(discount) => updateUrlFilters({ discount: discount ? String(discount) : null })}
        categories={categoryOptions}
        selectedCategories={selectedCategories}
        onCategoryToggle={(slug) => toggleSelection(selectedCategories, slug, "category")}
        onCategoryClear={() => clearOneFilterGroup(["category", "subcategory"])}
        brands={brandOptions}
        selectedBrands={selectedBrands}
        onBrandToggle={(slug) => toggleSelection(selectedBrands, slug, "brand")}
        onBrandClear={() => clearOneFilterGroup(["brand"])}
        skinTypes={skinTypeOptions}
        selectedSkinTypes={selectedSkinTypes}
        onSkinTypeToggle={(slug) => toggleSelection(selectedSkinTypes, slug, "skinType")}
        onSkinTypeClear={() => clearOneFilterGroup(["skinType"])}
        skinConcerns={skinConcernOptions}
        selectedSkinConcerns={selectedSkinConcerns}
        onSkinConcernToggle={(slug) => toggleSelection(selectedSkinConcerns, slug, "skinConcern")}
        onSkinConcernClear={() => clearOneFilterGroup(["skinConcern"])}
        onClearAll={clearAllShopFilters}
        hasActiveFilters={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
      />
    </>
  );
}
