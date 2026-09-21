/**
 * Canonical Type Definitions for Minsah Beauty Search & Catalog.
 * 
 * Single source of truth for:
 * - Product search representations (ES / DB / API)
 * - Search & shop sorting contracts
 * - Filter & facet models
 * - Autocomplete and trending suggestions
 */

export type ShopPublicSort =
  | 'featured'
  | 'best-selling'
  | 'newest'
  | 'price-low-high'
  | 'price-high-low'
  | 'highest-rated'
  | 'biggest-discount'
  | 'a-z'
  | 'z-a';

export type SearchApiSort =
  | 'relevance'
  | 'popularity'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'discount_desc'
  | 'name_asc'
  | 'name_desc';

/**
 * Canonical product representation returned by search APIs (Elasticsearch and DB fallback).
 */
export interface CanonicalSearchProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  brandSlug?: string;
  category?: string;
  categorySlug?: string;
  categoryName?: string;
  subcategory?: string;
  subcategorySlug?: string;
  subcategoryName?: string;
  price: number;
  compareAtPrice?: number | null;
  discount?: number;
  discountPercentage?: number;
  inStock: boolean;
  stock?: number;
  quantity?: number;
  totalStock?: number;
  availableQuantity?: number;
  isActive?: boolean;
  deletedAt?: string | Date | null;
  status?: string;
  visibility?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[] | string;
  codAvailable?: boolean;
  isCODAvailable?: boolean;
  freeShippingEligible?: boolean;
  returnEligible?: boolean;
  authenticityBadge?: boolean;
  deliveryBadge?: string | null;
  badges?: string[];
  image?: string;
  images?: string[];
  viewCount?: number;
  salesCount?: number;
  orderCount?: number;
  confirmedOrderCount?: number;
  deliveredOrderCount?: number;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  isNewArrival?: boolean;
  isNew?: boolean;
  hasVariants?: boolean;
  variantCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  score?: number | null;
}

/**
 * Autocomplete / live suggestion types used across header, home search, and shop search bar.
 */
export interface ProductSuggestion {
  type: 'product';
  text: string;
  productId: string;
  productName: string;
  slug: string;
  price: number;
  image?: string;
  badges?: string[];
  source?: string;
  hasVariants?: boolean;
  inStock?: boolean;
  stock?: number;
}

export interface TrendingSuggestion {
  type: 'trending';
  text: string;
  count?: number;
  icon?: string;
  source?: string;
}

export interface CompletionSuggestion {
  type: 'completion';
  text: string;
  icon?: string;
  source?: string;
}

export type CanonicalSuggestion =
  | ProductSuggestion
  | TrendingSuggestion
  | CompletionSuggestion;

export interface SuggestionApiResponse {
  success: boolean;
  query: string;
  suggestions: CanonicalSuggestion[];
  count?: number;
  fallback?: {
    applied?: boolean;
    message?: string;
  };
}

/**
 * Filter & Facet contract
 */
export interface SearchFacetOption {
  label: string;
  value: string;
  count: number;
  min?: number | null;
  max?: number | null;
}

export interface CanonicalSearchFacets {
  categories: SearchFacetOption[];
  brands: SearchFacetOption[];
  priceRanges: SearchFacetOption[];
  skinTypes: SearchFacetOption[];
  concerns: SearchFacetOption[];
  availability: SearchFacetOption[];
  ratings: SearchFacetOption[];
}

export interface SearchQueryFilters {
  q?: string;
  category?: string;
  subcategory?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  tags?: string[];
  skinType?: string[];
  skinConcern?: string[];
  saleOnly?: boolean;
  sort?: SearchApiSort;
  page?: number;
  limit?: number;
}
